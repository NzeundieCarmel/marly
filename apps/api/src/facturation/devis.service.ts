import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatutDevis } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { DevisDto, StatutDevisDto } from './dto/devis.dto';
import { FacturesService } from './factures.service';

const MAXIMUM = 2_000_000_000;
const UN_JOUR_MS = 86_400_000;

const INCLURE = {
  client: {
    select: {
      id: true,
      nom: true,
      adresse: true,
      niu: true,
      telephone: true,
      email: true,
    },
  },
  lignes: { orderBy: { ordre: 'asc' as const } },
} satisfies Prisma.DevisInclude;

type DevisComplet = Prisma.DevisGetPayload<{ include: typeof INCLURE }>;

// Jour courant a l'heure du Cameroun, au format AAAA-MM-JJ
function aujourdhui(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Douala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function versDetail(d: DevisComplet) {
  return {
    id: d.id,
    numero: d.numero,
    statut: d.statut,
    clientId: d.clientId,
    client: d.client,
    dateDevis: d.dateDevis,
    validiteJours: d.validiteJours,
    finValidite: new Date(d.dateDevis.getTime() + d.validiteJours * UN_JOUR_MS),
    note: d.note,
    regime: d.regime,
    tauxTva: d.tauxTva.toNumber(),
    totalHt: d.totalHt,
    totalTva: d.totalTva,
    totalTtc: d.totalTtc,
    factureId: d.factureId,
    lignes: d.lignes.map((l) => ({
      articleId: l.articleId,
      designation: l.designation,
      detail: l.detail,
      quantite: l.quantite.toNumber(),
      prixUnitaire: l.prixUnitaire,
      totalHt: l.totalHt,
    })),
  };
}

@Injectable()
export class DevisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly factures: FacturesService,
  ) {}

  private dossierDe(utilisateur: ChargeJeton): string {
    if (!utilisateur.dossierId) {
      throw new ForbiddenException('Aucun dossier rattaché à ce compte');
    }
    return utilisateur.dossierId;
  }

  private async charger(dossierId: string, id: string): Promise<DevisComplet> {
    const devis = await this.prisma.devis.findFirst({
      where: { id, dossierId },
      include: INCLURE,
    });
    if (!devis) throw new NotFoundException('Devis introuvable');
    return devis;
  }

  async lister(utilisateur: ChargeJeton) {
    const liste = await this.prisma.devis.findMany({
      where: { dossierId: this.dossierDe(utilisateur) },
      orderBy: { creeLe: 'desc' },
      take: 100,
      include: { client: { select: { nom: true } } },
    });
    return liste.map((d) => ({
      id: d.id,
      numero: d.numero,
      statut: d.statut,
      client: d.client.nom,
      dateDevis: d.dateDevis,
      totalTtc: d.totalTtc,
      factureId: d.factureId,
    }));
  }

  async lire(utilisateur: ChargeJeton, id: string) {
    return versDetail(await this.charger(this.dossierDe(utilisateur), id));
  }

  // Controle le client et les articles, calcule les montants au regime actuel du dossier
  private async preparer(dossierId: string, dto: DevisDto) {
    const client = await this.prisma.clientFacture.findFirst({
      where: { id: dto.clientId, dossierId, archive: false },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client introuvable');
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { regime: true, tauxTva: true },
    });
    if (!dossier) throw new NotFoundException('Dossier introuvable');

    const ids = [
      ...new Set(
        dto.lignes
          .map((l) => l.articleId)
          .filter((a): a is string => Boolean(a)),
      ),
    ];
    if (ids.length > 0) {
      const trouves = await this.prisma.article.count({
        where: { id: { in: ids }, dossierId, actif: true },
      });
      if (trouves !== ids.length) {
        throw new NotFoundException('Article introuvable');
      }
    }

    const totaux = dto.lignes.map((l) =>
      Math.round(l.quantite * l.prixUnitaire),
    );
    const totalHt = totaux.reduce((s, t) => s + t, 0);
    const totalTva =
      dossier.regime === 'REEL'
        ? Math.round((totalHt * dossier.tauxTva.toNumber()) / 100)
        : 0;
    const totalTtc = totalHt + totalTva;
    if (totalTtc > MAXIMUM) {
      throw new BadRequestException(
        'Montant total trop élevé (2 milliards FCFA au maximum)',
      );
    }
    return {
      donnees: {
        clientId: client.id,
        validiteJours: dto.validiteJours ?? 30,
        note: dto.note || null,
        regime: dossier.regime,
        tauxTva: dossier.tauxTva,
        totalHt,
        totalTva,
        totalTtc,
      },
      lignes: dto.lignes.map((l, i) => ({
        ordre: i + 1,
        articleId: l.articleId || null,
        designation: l.designation,
        detail: l.detail || null,
        quantite: new Prisma.Decimal(l.quantite),
        prixUnitaire: l.prixUnitaire,
        totalHt: totaux[i],
      })),
    };
  }

  async creer(utilisateur: ChargeJeton, dto: DevisDto) {
    const dossierId = this.dossierDe(utilisateur);
    const { donnees, lignes } = await this.preparer(dossierId, dto);
    const jour = aujourdhui();
    const annee = Number(jour.slice(0, 4));
    const id = await this.prisma.$transaction(async (tx) => {
      const [{ dernier }] = await tx.$queryRaw<{ dernier: number }[]>`
        INSERT INTO "CompteurDevis" ("dossierId", "annee", "dernier")
        VALUES (${dossierId}, ${annee}, 1)
        ON CONFLICT ("dossierId", "annee")
        DO UPDATE SET "dernier" = "CompteurDevis"."dernier" + 1
        RETURNING "dernier"`;
      const devis = await tx.devis.create({
        data: {
          dossierId,
          numero: `DEV-${annee}-${String(Number(dernier)).padStart(4, '0')}`,
          annee,
          dateDevis: new Date(`${jour}T00:00:00.000Z`),
          creeParId: utilisateur.sub,
          ...donnees,
          lignes: { create: lignes },
        },
        select: { id: true },
      });
      return devis.id;
    });
    return this.lire(utilisateur, id);
  }

  async modifier(utilisateur: ChargeJeton, id: string, dto: DevisDto) {
    const dossierId = this.dossierDe(utilisateur);
    await this.charger(dossierId, id);
    const { donnees, lignes } = await this.preparer(dossierId, dto);
    await this.prisma.$transaction(async (tx) => {
      const maj = await tx.devis.updateMany({
        where: { id, dossierId, statut: StatutDevis.EN_COURS },
        data: donnees,
      });
      if (maj.count !== 1) {
        throw new ConflictException('Seul un devis en cours peut être modifié');
      }
      await tx.ligneDevis.deleteMany({ where: { devisId: id } });
      await tx.ligneDevis.createMany({
        data: lignes.map((l) => ({ ...l, devisId: id })),
      });
    });
    return this.lire(utilisateur, id);
  }

  async changerStatut(
    utilisateur: ChargeJeton,
    id: string,
    dto: StatutDevisDto,
  ) {
    const dossierId = this.dossierDe(utilisateur);
    await this.charger(dossierId, id);
    const maj = await this.prisma.devis.updateMany({
      where: { id, dossierId, statut: { not: StatutDevis.TRANSFORME } },
      data: { statut: dto.statut },
    });
    if (maj.count !== 1) {
      throw new ConflictException(
        'Un devis transformé en facture ne change plus de statut',
      );
    }
    return this.lire(utilisateur, id);
  }

  async supprimer(utilisateur: ChargeJeton, id: string) {
    const dossierId = this.dossierDe(utilisateur);
    await this.charger(dossierId, id);
    const sup = await this.prisma.devis.deleteMany({
      where: { id, dossierId, statut: { not: StatutDevis.TRANSFORME } },
    });
    if (sup.count !== 1) {
      throw new ConflictException('Un devis transformé en facture se garde');
    }
    return { id };
  }

  // Le devis devient un brouillon de facture, avec les memes lignes et les memes articles
  async transformer(utilisateur: ChargeJeton, id: string) {
    const dossierId = this.dossierDe(utilisateur);
    const devis = await this.charger(dossierId, id);
    const pris = await this.prisma.devis.updateMany({
      where: {
        id,
        dossierId,
        statut: { in: [StatutDevis.EN_COURS, StatutDevis.ACCEPTE] },
      },
      data: { statut: StatutDevis.TRANSFORME },
    });
    if (pris.count !== 1) {
      throw new ConflictException(
        'Ce devis a déjà été transformé, ou il a été refusé',
      );
    }
    try {
      const facture = await this.factures.creer(utilisateur, {
        clientId: devis.clientId,
        tauxRetenue: 0,
        lignes: devis.lignes.map((l) => ({
          articleId: l.articleId ?? undefined,
          designation: l.designation,
          detail: l.detail ?? undefined,
          quantite: l.quantite.toNumber(),
          prixUnitaire: l.prixUnitaire,
        })),
      });
      await this.prisma.devis.update({
        where: { id },
        data: { factureId: facture.id },
      });
      return { factureId: facture.id };
    } catch (erreur) {
      // La facture n'a pas pu etre creee : le devis retrouve son statut
      await this.prisma.devis.update({
        where: { id },
        data: { statut: devis.statut },
      });
      throw erreur;
    }
  }
}
