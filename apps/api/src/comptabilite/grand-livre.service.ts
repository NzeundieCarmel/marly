import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrigineEcriture, Prisma } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompteDto, EcritureManuelleDto } from './dto/grand-livre.dto';
import {
  JOURNAUX,
  PLAN_SYSCOHADA,
  compteValide,
  estCompteDuPlan,
  intituleDe,
} from './plan-syscohada';

export interface LignePassee {
  compte: string;
  libelle?: string | null;
  tiers?: string | null;
  debit: number;
  credit: number;
}

export interface EcriturePassee {
  dossierId: string;
  journal: string;
  date: Date;
  libelle: string;
  origine: OrigineEcriture;
  origineId?: string | null;
  creeParId: string;
  lignes: LignePassee[];
}

export interface CompteDuDossier {
  numero: string;
  intitule: string;
  perso: boolean;
}

const UN_JOUR_MS = 86_400_000;

// Une date AAAA-MM-JJ, a minuit UTC ; refusee si elle n'existe pas (2026-02-30)
function jour(valeur: string, nom: string): Date {
  const date = new Date(`${valeur}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valeur) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== valeur
  ) {
    throw new BadRequestException(`Date invalide : ${nom}`);
  }
  return date;
}

// Du ... au ... inclus ; chaque borne est facultative
function periode(
  du?: string,
  au?: string,
): { gte?: Date; lt?: Date } | undefined {
  if (!du && !au) return undefined;
  const filtre: { gte?: Date; lt?: Date } = {};
  if (du) filtre.gte = jour(du, 'du');
  if (au) filtre.lt = new Date(jour(au, 'au').getTime() + UN_JOUR_MS);
  return filtre;
}

@Injectable()
export class GrandLivreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossiersService,
  ) {}

  // Lecture : tout utilisateur qui a acces au dossier. Ecriture : le cabinet, ou l'entreprise autonome
  private async acces(
    dossierId: string,
    utilisateur: ChargeJeton,
    ecriture: boolean,
  ): Promise<void> {
    try {
      await this.dossiers.verifierAcces(dossierId, utilisateur);
    } catch {
      throw new NotFoundException('Dossier introuvable');
    }
    if (!ecriture || utilisateur.role !== 'PME') return;
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { cabinet: { select: { autonome: true } } },
    });
    if (!dossier?.cabinet.autonome) {
      throw new ForbiddenException(
        'La comptabilite de ce dossier est tenue par votre cabinet',
      );
    }
  }

  private async comptesPerso(dossierId: string): Promise<Map<string, string>> {
    const comptes = await this.prisma.compteDossier.findMany({
      where: { dossierId },
      select: { numero: true, intitule: true },
    });
    return new Map(comptes.map((c) => [c.numero, c.intitule]));
  }

  private controler(e: EcriturePassee): void {
    if (!(e.journal in JOURNAUX)) {
      throw new BadRequestException(`Journal inconnu : ${e.journal}`);
    }
    if (e.lignes.length < 2) {
      throw new BadRequestException('Une ecriture compte au moins deux lignes');
    }
    let debit = 0;
    let credit = 0;
    for (const l of e.lignes) {
      if (!compteValide(l.compte)) {
        throw new BadRequestException(`Compte invalide : ${l.compte}`);
      }
      if (
        !Number.isInteger(l.debit) ||
        !Number.isInteger(l.credit) ||
        l.debit < 0 ||
        l.credit < 0
      ) {
        throw new BadRequestException(`Compte ${l.compte} : montant invalide`);
      }
      if (l.debit > 0 === l.credit > 0) {
        throw new BadRequestException(
          `Compte ${l.compte} : chaque ligne doit avoir soit un debit, soit un credit`,
        );
      }
      debit += l.debit;
      credit += l.credit;
    }
    if (debit !== credit) {
      throw new BadRequestException(
        `Ecriture desequilibree : debit ${debit}, credit ${credit}`,
      );
    }
  }

  // Le point d'entree unique du grand livre : pieces, caisse, stock et saisies y passent tous
  async passer(
    tx: Prisma.TransactionClient,
    e: EcriturePassee,
  ): Promise<{ id: string; numero: number }> {
    this.controler(e);
    const annee = e.date.getUTCFullYear();
    // Numerotation continue par journal et par annee, sure meme en cas d'acces simultanes
    const [{ dernier }] = await tx.$queryRaw<{ dernier: number }[]>`
      INSERT INTO "CompteurEcriture" ("dossierId", "journal", "annee", "dernier")
      VALUES (${e.dossierId}, ${e.journal}, ${annee}, 1)
      ON CONFLICT ("dossierId", "journal", "annee")
      DO UPDATE SET "dernier" = "CompteurEcriture"."dernier" + 1
      RETURNING "dernier"`;
    const libelle = e.libelle.trim().slice(0, 120);
    try {
      return await tx.ecritureComptable.create({
        data: {
          dossierId: e.dossierId,
          journal: e.journal,
          annee,
          numero: dernier,
          date: e.date,
          libelle,
          origine: e.origine,
          origineId: e.origineId ?? null,
          creeParId: e.creeParId,
          mouvements: {
            create: e.lignes.map((l, index) => ({
              dossierId: e.dossierId,
              date: e.date,
              ordre: index + 1,
              compte: l.compte,
              libelle: (l.libelle?.trim() || libelle).slice(0, 120),
              tiers: l.tiers?.trim() || null,
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
        select: { id: true, numero: true },
      });
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ecriture deja passee pour cette operation',
        );
      }
      throw erreur;
    }
  }

  async plan(
    dossierId: string,
    utilisateur: ChargeJeton,
  ): Promise<CompteDuDossier[]> {
    await this.acces(dossierId, utilisateur, false);
    const perso = await this.comptesPerso(dossierId);
    const comptes: CompteDuDossier[] = [
      ...PLAN_SYSCOHADA.map((c) => ({ ...c, perso: false })),
      ...[...perso].map(([numero, intitule]) => ({
        numero,
        intitule,
        perso: true,
      })),
    ];
    return comptes.sort((a, b) => a.numero.localeCompare(b.numero));
  }

  async ajouterCompte(
    dossierId: string,
    utilisateur: ChargeJeton,
    dto: CompteDto,
  ): Promise<CompteDuDossier> {
    await this.acces(dossierId, utilisateur, true);
    if (estCompteDuPlan(dto.numero)) {
      throw new ConflictException('Ce compte existe deja dans le plan');
    }
    try {
      const compte = await this.prisma.compteDossier.create({
        data: { dossierId, numero: dto.numero, intitule: dto.intitule.trim() },
        select: { numero: true, intitule: true },
      });
      return { ...compte, perso: true };
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new ConflictException('Ce compte existe deja');
      }
      throw erreur;
    }
  }

  async saisir(
    dossierId: string,
    utilisateur: ChargeJeton,
    dto: EcritureManuelleDto,
  ): Promise<{ id: string; journal: string; numero: number }> {
    await this.acces(dossierId, utilisateur, true);
    const date = jour(dto.date, 'date');
    const ecriture = await this.prisma.$transaction((tx) =>
      this.passer(tx, {
        dossierId,
        journal: dto.journal,
        date,
        libelle: dto.libelle,
        origine: OrigineEcriture.MANUELLE,
        creeParId: utilisateur.sub,
        lignes: dto.lignes,
      }),
    );
    return { ...ecriture, journal: dto.journal };
  }

  async journal(
    dossierId: string,
    utilisateur: ChargeJeton,
    journal?: string,
    du?: string,
    au?: string,
  ) {
    await this.acces(dossierId, utilisateur, false);
    if (journal && !(journal in JOURNAUX)) {
      throw new BadRequestException(`Journal inconnu : ${journal}`);
    }
    const perso = await this.comptesPerso(dossierId);
    const ecritures = await this.prisma.ecritureComptable.findMany({
      where: {
        dossierId,
        journal: journal || undefined,
        date: periode(du, au),
      },
      orderBy: [{ date: 'asc' }, { journal: 'asc' }, { numero: 'asc' }],
      take: 500,
      include: { mouvements: { orderBy: { ordre: 'asc' } } },
    });
    return ecritures.map((e) => ({
      id: e.id,
      journal: e.journal,
      numero: e.numero,
      date: e.date,
      libelle: e.libelle,
      origine: e.origine,
      mouvements: e.mouvements.map((m) => ({
        compte: m.compte,
        intitule: intituleDe(m.compte, perso),
        libelle: m.libelle,
        tiers: m.tiers,
        debit: m.debit,
        credit: m.credit,
      })),
    }));
  }

  // Les mouvements d'un compte (ou de tous ses sous-comptes), avec le solde au fil de l'eau
  async grandLivre(
    dossierId: string,
    utilisateur: ChargeJeton,
    compte?: string,
    du?: string,
    au?: string,
  ) {
    await this.acces(dossierId, utilisateur, false);
    if (!compte || !/^[1-8]\d{0,9}$/.test(compte)) {
      throw new BadRequestException('Compte invalide');
    }
    const perso = await this.comptesPerso(dossierId);
    let soldeInitial = 0;
    if (du) {
      const avant = await this.prisma.mouvementComptable.aggregate({
        where: {
          dossierId,
          compte: { startsWith: compte },
          date: { lt: jour(du, 'du') },
        },
        _sum: { debit: true, credit: true },
      });
      soldeInitial = (avant._sum.debit ?? 0) - (avant._sum.credit ?? 0);
    }
    const mouvements = await this.prisma.mouvementComptable.findMany({
      where: {
        dossierId,
        compte: { startsWith: compte },
        date: periode(du, au),
      },
      orderBy: [
        { date: 'asc' },
        { ecriture: { journal: 'asc' } },
        { ecriture: { numero: 'asc' } },
        { ordre: 'asc' },
      ],
      take: 2000,
      include: { ecriture: { select: { journal: true, numero: true } } },
    });
    let solde = soldeInitial;
    let totalDebit = 0;
    let totalCredit = 0;
    const lignes = mouvements.map((m) => {
      solde += m.debit - m.credit;
      totalDebit += m.debit;
      totalCredit += m.credit;
      return {
        date: m.date,
        journal: m.ecriture.journal,
        numero: m.ecriture.numero,
        compte: m.compte,
        libelle: m.libelle,
        tiers: m.tiers,
        debit: m.debit,
        credit: m.credit,
        solde,
      };
    });
    return {
      compte,
      intitule: intituleDe(compte, perso),
      soldeInitial,
      lignes,
      totalDebit,
      totalCredit,
      soldeFinal: solde,
    };
  }

  async balance(
    dossierId: string,
    utilisateur: ChargeJeton,
    du?: string,
    au?: string,
  ) {
    await this.acces(dossierId, utilisateur, false);
    const perso = await this.comptesPerso(dossierId);
    const groupes = await this.prisma.mouvementComptable.groupBy({
      by: ['compte'],
      where: { dossierId, date: periode(du, au) },
      _sum: { debit: true, credit: true },
      orderBy: { compte: 'asc' },
    });
    let totalDebit = 0;
    let totalCredit = 0;
    const lignes = groupes.map((g) => {
      const debit = g._sum.debit ?? 0;
      const credit = g._sum.credit ?? 0;
      totalDebit += debit;
      totalCredit += credit;
      return {
        compte: g.compte,
        intitule: intituleDe(g.compte, perso),
        debit,
        credit,
        soldeDebiteur: Math.max(debit - credit, 0),
        soldeCrediteur: Math.max(credit - debit, 0),
      };
    });
    return {
      lignes,
      totalDebit,
      totalCredit,
      equilibree: totalDebit === totalCredit,
    };
  }
}
