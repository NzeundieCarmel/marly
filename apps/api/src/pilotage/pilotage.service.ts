import { Injectable, NotFoundException } from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { PrismaService } from '../prisma/prisma.service';

const UNE_HEURE_MS = 3_600_000;

// Debut du jour et du mois a Douala (UTC+1) : en instant reel, et en date comptable (minuit UTC)
function reperes(maintenant: Date) {
  const d = new Date(maintenant.getTime() + UNE_HEURE_MS);
  const jourUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const moisUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  return {
    jour: new Date(jourUtc),
    mois: new Date(moisUtc),
    debutJour: new Date(jourUtc - UNE_HEURE_MS),
    debutMois: new Date(moisUtc - UNE_HEURE_MS),
  };
}

@Injectable()
export class PilotageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossiersService,
  ) {}

  async lire(dossierId: string, utilisateur: ChargeJeton) {
    try {
      await this.dossiers.verifierAcces(dossierId, utilisateur);
    } catch {
      throw new NotFoundException('Dossier introuvable');
    }
    const r = reperes(new Date());
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { cabinet: { select: { autonome: true } } },
    });
    const autonome = dossier?.cabinet.autonome ?? false;

    const [
      caisseJour,
      caisseMois,
      facturesJour,
      facturesMois,
      impayes,
      achatsCredit,
      articles,
      tresorerie,
      piecesAComptabiliser,
      dernieresVentes,
      session,
    ] = await Promise.all([
      this.prisma.venteCaisse.aggregate({
        where: { dossierId, date: { gte: r.debutJour } },
        _sum: { totalTtc: true },
        _count: { _all: true },
      }),
      this.prisma.venteCaisse.aggregate({
        where: { dossierId, date: { gte: r.debutMois } },
        _sum: { totalTtc: true },
      }),
      this.prisma.facture.aggregate({
        where: {
          dossierId,
          type: 'FACTURE',
          statut: 'EMISE',
          dateEmission: { gte: r.jour },
        },
        _sum: { totalTtc: true },
        _count: { _all: true },
      }),
      this.prisma.facture.aggregate({
        where: {
          dossierId,
          type: 'FACTURE',
          statut: 'EMISE',
          dateEmission: { gte: r.mois },
        },
        _sum: { totalTtc: true },
      }),
      this.prisma.facture.findMany({
        where: { dossierId, type: 'FACTURE', statut: 'EMISE' },
        select: { netAPayer: true, montantRegle: true, dateEcheance: true },
      }),
      this.prisma.achat.findMany({
        where: { dossierId, statut: 'VALIDE', paiement: 'A_CREDIT' },
        select: { totalTtc: true, montantRegle: true },
      }),
      this.prisma.article.findMany({
        where: { dossierId, actif: true, suiviStock: true },
        select: {
          id: true,
          nom: true,
          unite: true,
          quantite: true,
          seuilAlerte: true,
          valeurStock: true,
        },
      }),
      autonome
        ? this.prisma.mouvementComptable.groupBy({
            by: ['compte'],
            where: {
              dossierId,
              OR: [
                { compte: { startsWith: '57' } },
                { compte: { startsWith: '52' } },
                { compte: { startsWith: '55' } },
              ],
            },
            _sum: { debit: true, credit: true },
          })
        : Promise.resolve(null),
      autonome
        ? this.prisma.piece.count({ where: { dossierId, statut: 'RECUE' } })
        : Promise.resolve(0),
      this.prisma.venteCaisse.findMany({
        where: { dossierId, date: { gte: r.debutJour } },
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          id: true,
          numero: true,
          date: true,
          totalTtc: true,
          mode: true,
        },
      }),
      this.prisma.sessionCaisse.findFirst({
        where: { dossierId, fermeeLe: null },
        select: { ouverteLe: true },
      }),
    ]);

    const aEncaisser = impayes.reduce(
      (s, f) => s + Math.max(0, f.netAPayer - f.montantRegle),
      0,
    );
    const retards = impayes.filter(
      (f) =>
        f.dateEcheance &&
        f.dateEcheance < r.jour &&
        f.montantRegle < f.netAPayer,
    );
    const ruptures = articles.filter((a) => a.quantite <= 0);
    const stockBas = articles.filter(
      (a) => a.quantite > 0 && a.quantite <= a.seuilAlerte,
    );
    const solde = (prefixe: string) =>
      (tresorerie ?? [])
        .filter((g) => g.compte.startsWith(prefixe))
        .reduce((s, g) => s + (g._sum.debit ?? 0) - (g._sum.credit ?? 0), 0);

    return {
      autonome,
      caisseOuverte: session !== null,
      ventesJour: {
        caisse: caisseJour._sum.totalTtc ?? 0,
        tickets: caisseJour._count._all,
        factures: facturesJour._sum.totalTtc ?? 0,
        nombreFactures: facturesJour._count._all,
      },
      ventesMois:
        (caisseMois._sum.totalTtc ?? 0) + (facturesMois._sum.totalTtc ?? 0),
      aEncaisser,
      enRetard: retards.reduce((s, f) => s + f.netAPayer - f.montantRegle, 0),
      facturesEnRetard: retards.length,
      aPayer: achatsCredit.reduce((s, a) => s + a.totalTtc - a.montantRegle, 0),
      tresorerie: tresorerie
        ? { caisse: solde('57'), banque: solde('52'), mobileMoney: solde('55') }
        : null,
      stock: {
        valeur: articles.reduce((s, a) => s + a.valeurStock, 0),
        ruptures: ruptures.length,
        stockBas: stockBas.length,
        alertes: [...ruptures, ...stockBas].slice(0, 5).map((a) => ({
          id: a.id,
          nom: a.nom,
          unite: a.unite,
          quantite: a.quantite,
          seuilAlerte: a.seuilAlerte,
          etat: a.quantite <= 0 ? 'RUPTURE' : 'STOCK_BAS',
        })),
      },
      piecesAComptabiliser,
      dernieresVentes,
    };
  }
}
