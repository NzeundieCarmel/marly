import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrigineEcriture,
  PaiementAchat,
  StatutAchat,
  TypeMouvementStock,
} from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { GrandLivreService } from '../comptabilite/grand-livre.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { AchatDto } from './dto/achat.dto';

const MONTANT_MAX = 2_000_000_000;

// Ou va l'argent selon le mode de paiement : journal et compte de contrepartie
const CONTREPARTIE: Record<PaiementAchat, { journal: string; compte: string }> =
  {
    A_CREDIT: { journal: 'AC', compte: '401' },
    ESPECES: { journal: 'CA', compte: '571' },
    MTN_MOMO: { journal: 'MM', compte: '552' },
    ORANGE_MONEY: { journal: 'MM', compte: '552' },
    VIREMENT: { journal: 'BQ', compte: '521' },
  };

// Jour courant a Douala, a minuit UTC
function aujourdhui(): Date {
  const d = new Date(Date.now() + 3_600_000);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function jour(valeur: string): Date {
  const date = new Date(`${valeur}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== valeur
  ) {
    throw new BadRequestException('Date invalide');
  }
  return date;
}

@Injectable()
export class AchatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossiersService,
    private readonly stock: StockService,
    private readonly grandLivre: GrandLivreService,
  ) {}

  // Lecture : tout utilisateur qui a acces au dossier. Ecriture : l'entreprise elle-meme
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
    if (ecriture && utilisateur.role !== 'PME') {
      throw new ForbiddenException('Les achats sont saisis par l’entreprise');
    }
  }

  async lister(dossierId: string, utilisateur: ChargeJeton) {
    await this.acces(dossierId, utilisateur, false);
    return this.prisma.achat.findMany({
      where: { dossierId },
      orderBy: [{ date: 'desc' }, { numero: 'desc' }],
      take: 100,
      select: {
        id: true,
        numero: true,
        date: true,
        fournisseur: true,
        totalTtc: true,
        paiement: true,
        statut: true,
      },
    });
  }

  async detail(dossierId: string, id: string, utilisateur: ChargeJeton) {
    await this.acces(dossierId, utilisateur, false);
    const achat = await this.prisma.achat.findFirst({
      where: { id, dossierId },
      select: {
        id: true,
        numero: true,
        annee: true,
        date: true,
        fournisseur: true,
        referenceFournisseur: true,
        avecTva: true,
        totalHt: true,
        totalTva: true,
        totalTtc: true,
        paiement: true,
        statut: true,
        annuleLe: true,
        lignes: {
          orderBy: { ordre: 'asc' },
          select: {
            articleId: true,
            nom: true,
            quantite: true,
            coutUnitaire: true,
            totalHt: true,
          },
        },
      },
    });
    if (!achat) {
      throw new NotFoundException('Achat introuvable');
    }
    return achat;
  }

  async creer(dossierId: string, utilisateur: ChargeJeton, dto: AchatDto) {
    await this.acces(dossierId, utilisateur, true);
    const ids = [...new Set(dto.lignes.map((l) => l.articleId))];
    if (ids.length !== dto.lignes.length) {
      throw new BadRequestException(
        'Un article apparaît deux fois dans l’achat',
      );
    }
    const articles = await this.prisma.article.findMany({
      where: { id: { in: ids }, dossierId, actif: true },
      select: { id: true, nom: true, suiviStock: true },
    });
    if (articles.length !== ids.length) {
      throw new NotFoundException('Article introuvable');
    }
    const horsStock = articles.find((a) => !a.suiviStock);
    if (horsStock) {
      throw new BadRequestException(
        `${horsStock.nom} n’est pas suivi en stock : enregistrez cette dépense dans Compta ou envoyez la photo de la facture`,
      );
    }
    const date = jour(dto.date);
    if (date > aujourdhui()) {
      throw new BadRequestException(
        'La date de l’achat ne peut pas être dans le futur',
      );
    }
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: {
        regime: true,
        tauxTva: true,
        cabinet: { select: { autonome: true } },
      },
    });
    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }

    // Au reel, la TVA de la facture fournisseur est recuperable : le stock entre au cout hors taxes
    const avecTva = dossier.regime === 'REEL' && dto.avecTva;
    const parId = new Map(articles.map((a) => [a.id, a]));
    const lignes = dto.lignes.map((l, index) => ({
      ordre: index + 1,
      articleId: l.articleId,
      nom: parId.get(l.articleId)?.nom ?? '',
      quantite: l.quantite,
      coutUnitaire: l.coutUnitaire,
      totalHt: l.quantite * l.coutUnitaire,
    }));
    const totalHt = lignes.reduce((s, l) => s + l.totalHt, 0);
    const totalTva = avecTva
      ? Math.round((totalHt * dossier.tauxTva.toNumber()) / 100)
      : 0;
    const totalTtc = totalHt + totalTva;
    if (totalTtc <= 0) {
      throw new BadRequestException('Le total de l’achat est nul');
    }
    if (totalTtc > MONTANT_MAX) {
      throw new BadRequestException('Montant trop élevé');
    }
    const fournisseur = dto.fournisseur.trim();
    const annee = date.getUTCFullYear();
    const autonome = dossier.cabinet.autonome;

    const id = await this.prisma.$transaction(async (tx) => {
      const [{ dernier }] = await tx.$queryRaw<{ dernier: number }[]>`
        INSERT INTO "CompteurAchat" ("dossierId", "annee", "dernier")
        VALUES (${dossierId}, ${annee}, 1)
        ON CONFLICT ("dossierId", "annee")
        DO UPDATE SET "dernier" = "CompteurAchat"."dernier" + 1
        RETURNING "dernier"`;
      const achat = await tx.achat.create({
        data: {
          dossierId,
          annee,
          numero: dernier,
          date,
          fournisseur,
          referenceFournisseur: dto.referenceFournisseur?.trim() || null,
          avecTva,
          totalHt,
          totalTva,
          totalTtc,
          paiement: dto.paiement,
          creeParId: utilisateur.sub,
          lignes: { create: lignes },
        },
        select: { id: true },
      });
      const motif = `Achat n°${dernier} · ${fournisseur}`.slice(0, 120);
      for (const l of lignes) {
        await this.stock.mouvementer(tx, l.articleId, {
          type: TypeMouvementStock.ENTREE,
          quantite: l.quantite,
          coutUnitaire: l.coutUnitaire,
          date,
          motif,
          origine: 'ACHAT',
          origineId: achat.id,
          creeParId: utilisateur.sub,
        });
      }
      if (autonome) {
        const c = CONTREPARTIE[dto.paiement];
        await this.grandLivre.passer(tx, {
          dossierId,
          journal: c.journal,
          date,
          libelle: `Achat ${fournisseur}`,
          origine: OrigineEcriture.ACHAT,
          origineId: achat.id,
          creeParId: utilisateur.sub,
          lignes: [
            { compte: '601', debit: totalHt, credit: 0 },
            ...(totalTva > 0
              ? [{ compte: '4452', debit: totalTva, credit: 0 }]
              : []),
            {
              compte: c.compte,
              tiers: c.compte === '401' ? fournisseur.slice(0, 80) : null,
              debit: 0,
              credit: totalTtc,
            },
          ],
        });
      }
      return achat.id;
    });
    return this.detail(dossierId, id, utilisateur);
  }

  // Annulation : les articles ressortent du stock et l'ecriture est contre-passee
  async annuler(dossierId: string, id: string, utilisateur: ChargeJeton) {
    await this.acces(dossierId, utilisateur, true);
    await this.detail(dossierId, id, utilisateur);
    const ceJour = aujourdhui();
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Achat" WHERE "id" = ${id} FOR UPDATE`;
      const achat = await tx.achat.findUniqueOrThrow({
        where: { id },
        select: {
          numero: true,
          statut: true,
          lignes: { select: { articleId: true, nom: true, quantite: true } },
        },
      });
      if (achat.statut === StatutAchat.ANNULE) {
        throw new ConflictException('Cet achat est déjà annulé');
      }
      await tx.achat.update({
        where: { id },
        data: { statut: StatutAchat.ANNULE, annuleLe: new Date() },
      });
      for (const l of achat.lignes) {
        try {
          await this.stock.mouvementer(tx, l.articleId, {
            type: TypeMouvementStock.SORTIE,
            quantite: l.quantite,
            date: ceJour,
            motif: `Annulation de l’achat n°${achat.numero}`,
            origine: 'ACHAT_ANNULE',
            origineId: id,
            creeParId: utilisateur.sub,
          });
        } catch (erreur) {
          if (erreur instanceof ConflictException) {
            throw new ConflictException(
              `Impossible d’annuler : une partie de ${l.nom} a déjà été vendue`,
            );
          }
          throw erreur;
        }
      }
      const ecriture = await tx.ecritureComptable.findFirst({
        where: { origine: OrigineEcriture.ACHAT, origineId: id },
        select: {
          journal: true,
          libelle: true,
          mouvements: {
            orderBy: { ordre: 'asc' },
            select: { compte: true, tiers: true, debit: true, credit: true },
          },
        },
      });
      if (ecriture) {
        await this.grandLivre.passer(tx, {
          dossierId,
          journal: ecriture.journal,
          date: ceJour,
          libelle: `Annulation : ${ecriture.libelle}`,
          origine: OrigineEcriture.ACHAT,
          origineId: `${id}:annulation`,
          creeParId: utilisateur.sub,
          lignes: ecriture.mouvements.map((m) => ({
            compte: m.compte,
            tiers: m.tiers,
            debit: m.credit,
            credit: m.debit,
          })),
        });
      }
    });
    return this.detail(dossierId, id, utilisateur);
  }
}
