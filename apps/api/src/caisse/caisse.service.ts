import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ModeCaisse,
  OrigineEcriture,
  Prisma,
  TypeMouvementStock,
} from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { GrandLivreService } from '../comptabilite/grand-livre.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { ClotureDto, OuvertureDto, VenteDto } from './dto/caisse.dto';

const MONTANT_MAX = 2_000_000_000;
const UNE_HEURE_MS = 3_600_000;

// La journee comptable est celle de Douala (UTC+1), a minuit UTC
function jourDouala(instant: Date): Date {
  const d = new Date(instant.getTime() + UNE_HEURE_MS);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

type SessionLue = { id: string; ouverteLe: Date; fondInitial: number };

@Injectable()
export class CaisseService {
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
      throw new ForbiddenException('La caisse est tenue par l’entreprise');
    }
  }

  private sessionOuverte(
    client: Prisma.TransactionClient,
    dossierId: string,
  ): Promise<SessionLue | null> {
    return client.sessionCaisse.findFirst({
      where: { dossierId, fermeeLe: null },
      orderBy: { ouverteLe: 'desc' },
      select: { id: true, ouverteLe: true, fondInitial: true },
    });
  }

  private async bilan(client: Prisma.TransactionClient, s: SessionLue) {
    const groupes = await client.venteCaisse.groupBy({
      by: ['mode'],
      where: { sessionId: s.id },
      _sum: { totalTtc: true },
      _count: { _all: true },
    });
    const parMode: Record<ModeCaisse, number> = {
      ESPECES: 0,
      MTN_MOMO: 0,
      ORANGE_MONEY: 0,
    };
    let ventes = 0;
    for (const g of groupes) {
      parMode[g.mode] = g._sum.totalTtc ?? 0;
      ventes += g._count._all;
    }
    return {
      id: s.id,
      ouverteLe: s.ouverteLe,
      fondInitial: s.fondInitial,
      ventes,
      totalTtc: parMode.ESPECES + parMode.MTN_MOMO + parMode.ORANGE_MONEY,
      parMode,
      especesAttendues: s.fondInitial + parMode.ESPECES,
    };
  }

  async session(dossierId: string, utilisateur: ChargeJeton) {
    await this.acces(dossierId, utilisateur, false);
    const s = await this.sessionOuverte(this.prisma, dossierId);
    return { session: s ? await this.bilan(this.prisma, s) : null };
  }

  async ouvrir(dossierId: string, utilisateur: ChargeJeton, dto: OuvertureDto) {
    await this.acces(dossierId, utilisateur, true);
    const s = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Dossier" WHERE "id" = ${dossierId} FOR UPDATE`;
      if (await this.sessionOuverte(tx, dossierId)) {
        throw new ConflictException('La caisse est déjà ouverte');
      }
      return tx.sessionCaisse.create({
        data: {
          dossierId,
          fondInitial: dto.fondInitial,
          ouverteParId: utilisateur.sub,
        },
        select: { id: true, ouverteLe: true, fondInitial: true },
      });
    });
    return { session: await this.bilan(this.prisma, s) };
  }

  async fermer(dossierId: string, utilisateur: ChargeJeton, dto: ClotureDto) {
    await this.acces(dossierId, utilisateur, true);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Dossier" WHERE "id" = ${dossierId} FOR UPDATE`;
      const s = await this.sessionOuverte(tx, dossierId);
      if (!s) {
        throw new ConflictException('La caisse est déjà fermée');
      }
      const b = await this.bilan(tx, s);
      const ecart = dto.especesComptees - b.especesAttendues;
      await tx.sessionCaisse.update({
        where: { id: s.id },
        data: {
          fermeeLe: new Date(),
          fermeeParId: utilisateur.sub,
          especesComptees: dto.especesComptees,
          ecart,
        },
      });
      return { ...b, especesComptees: dto.especesComptees, ecart };
    });
  }

  async vendre(dossierId: string, utilisateur: ChargeJeton, dto: VenteDto) {
    await this.acces(dossierId, utilisateur, true);
    const ids = [...new Set(dto.lignes.map((l) => l.articleId))];
    if (ids.length !== dto.lignes.length) {
      throw new BadRequestException(
        'Un article apparaît deux fois sur le ticket',
      );
    }
    const articles = await this.prisma.article.findMany({
      where: { id: { in: ids }, dossierId, actif: true },
      select: {
        id: true,
        nom: true,
        prixVente: true,
        tauxTva: true,
        suiviStock: true,
      },
    });
    if (articles.length !== ids.length) {
      throw new NotFoundException('Article introuvable');
    }
    const parId = new Map(articles.map((a) => [a.id, a]));

    // Prix TTC affiches ; le hors taxes est calcule ligne par ligne
    const lignes = dto.lignes.map((l, index) => {
      const a = parId.get(l.articleId);
      if (!a) {
        throw new NotFoundException('Article introuvable');
      }
      const totalTtc = a.prixVente * l.quantite;
      const totalHt = Math.round((totalTtc * 10000) / (10000 + a.tauxTva));
      return {
        ordre: index + 1,
        articleId: a.id,
        nom: a.nom,
        suiviStock: a.suiviStock,
        quantite: l.quantite,
        prixUnitaire: a.prixVente,
        tauxTva: a.tauxTva,
        totalHt,
        tva: totalTtc - totalHt,
        totalTtc,
      };
    });
    const totalTtc = lignes.reduce((s, l) => s + l.totalTtc, 0);
    const totalHt = lignes.reduce((s, l) => s + l.totalHt, 0);
    const totalTva = totalTtc - totalHt;
    if (totalTtc <= 0) {
      throw new BadRequestException('Le total de la vente est nul');
    }
    if (totalTtc > MONTANT_MAX) {
      throw new BadRequestException('Montant trop élevé');
    }
    const especes = dto.mode === ModeCaisse.ESPECES;
    let monnaie: number | null = null;
    if (especes && dto.montantRecu !== undefined) {
      if (dto.montantRecu < totalTtc) {
        throw new BadRequestException(
          'Le montant reçu est inférieur au total à payer',
        );
      }
      monnaie = dto.montantRecu - totalTtc;
    }

    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { cabinet: { select: { autonome: true } } },
    });
    const autonome = dossier?.cabinet.autonome ?? false;
    const maintenant = new Date();
    const jour = jourDouala(maintenant);
    const annee = jour.getUTCFullYear();

    const vente = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Dossier" WHERE "id" = ${dossierId} FOR UPDATE`;
      const session = await this.sessionOuverte(tx, dossierId);
      if (!session) {
        throw new ConflictException('Ouvrez la caisse avant de vendre');
      }
      const [{ dernier }] = await tx.$queryRaw<{ dernier: number }[]>`
        INSERT INTO "CompteurTicket" ("dossierId", "annee", "dernier")
        VALUES (${dossierId}, ${annee}, 1)
        ON CONFLICT ("dossierId", "annee")
        DO UPDATE SET "dernier" = "CompteurTicket"."dernier" + 1
        RETURNING "dernier"`;
      const libelle = `Ticket n°${dernier}`;
      const v = await tx.venteCaisse.create({
        data: {
          dossierId,
          sessionId: session.id,
          annee,
          numero: dernier,
          date: maintenant,
          totalHt,
          totalTva,
          totalTtc,
          mode: dto.mode,
          montantRecu: especes ? (dto.montantRecu ?? null) : null,
          monnaie,
          creeParId: utilisateur.sub,
          lignes: {
            create: lignes.map((l) => ({
              ordre: l.ordre,
              articleId: l.articleId,
              nom: l.nom,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              tauxTva: l.tauxTva,
              totalHt: l.totalHt,
              tva: l.tva,
              totalTtc: l.totalTtc,
            })),
          },
        },
        select: { id: true },
      });

      // Le stock sort au cout moyen pondere ; une seule ligne en defaut annule tout le ticket
      for (const l of lignes) {
        if (!l.suiviStock) continue;
        try {
          await this.stock.mouvementer(tx, l.articleId, {
            type: TypeMouvementStock.SORTIE,
            quantite: l.quantite,
            date: jour,
            motif: libelle,
            origine: 'VENTE',
            origineId: v.id,
            creeParId: utilisateur.sub,
          });
        } catch (erreur) {
          if (erreur instanceof ConflictException) {
            throw new ConflictException(`Stock insuffisant pour ${l.nom}`);
          }
          throw erreur;
        }
      }

      // Entreprise autonome : la vente entre au grand livre dans la meme transaction
      if (autonome) {
        await this.grandLivre.passer(tx, {
          dossierId,
          journal: especes ? 'CA' : 'MM',
          date: jour,
          libelle,
          origine: OrigineEcriture.CAISSE,
          origineId: v.id,
          creeParId: utilisateur.sub,
          lignes: [
            { compte: especes ? '571' : '552', debit: totalTtc, credit: 0 },
            { compte: '701', debit: 0, credit: totalHt },
            ...(totalTva > 0
              ? [{ compte: '4431', debit: 0, credit: totalTva }]
              : []),
          ],
        });
      }
      return v;
    });
    return this.ticket(dossierId, vente.id, utilisateur);
  }

  async ventes(dossierId: string, utilisateur: ChargeJeton) {
    await this.acces(dossierId, utilisateur, false);
    const s = await this.sessionOuverte(this.prisma, dossierId);
    if (!s) return [];
    return this.prisma.venteCaisse.findMany({
      where: { sessionId: s.id },
      orderBy: { numero: 'desc' },
      take: 100,
      select: {
        id: true,
        numero: true,
        date: true,
        totalTtc: true,
        mode: true,
      },
    });
  }

  async ticket(dossierId: string, id: string, utilisateur: ChargeJeton) {
    await this.acces(dossierId, utilisateur, false);
    const vente = await this.prisma.venteCaisse.findFirst({
      where: { id, dossierId },
      select: {
        id: true,
        numero: true,
        annee: true,
        date: true,
        totalHt: true,
        totalTva: true,
        totalTtc: true,
        mode: true,
        montantRecu: true,
        monnaie: true,
        lignes: {
          orderBy: { ordre: 'asc' },
          select: {
            articleId: true,
            nom: true,
            quantite: true,
            prixUnitaire: true,
            tauxTva: true,
            totalTtc: true,
          },
        },
      },
    });
    if (!vente) {
      throw new NotFoundException('Ticket introuvable');
    }
    return vente;
  }
}
