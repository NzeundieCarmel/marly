import { Injectable } from '@nestjs/common';
import type { Regime } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000;
const montant = new Intl.NumberFormat('fr-FR');

export interface LigneTableau {
  id: string;
  raisonSociale: string;
  regime: Regime;
  recues: number;
  demandees: number;
  attendues: number;
  aValider: number;
  aCompleter: number;
  pretesExport: number;
  derniereLe: Date | null;
  premiereAValiderId: string | null;
}

export interface Activite {
  type: 'piece' | 'demande' | 'acces' | 'export';
  le: Date;
  titre: string;
  dossierId: string | null;
  dossier: string | null;
}

export interface TableauDeBord {
  stats: {
    recues: number;
    recuesSemaine: number;
    aValider: number;
    dossiersAValider: number;
    demandees: number;
    aReprendre: number;
    exportees: number;
    dernierExport: Date | null;
  };
  export: { pieces: number; debit: number; credit: number };
  premiereAValiderId: string | null;
  dossiers: LigneTableau[];
  activite: Activite[];
}

@Injectable()
export class TableauDeBordService {
  constructor(private readonly prisma: PrismaService) {}

  async lire(utilisateur: ChargeJeton): Promise<TableauDeBord> {
    const dossiers = await this.prisma.dossier.findMany({
      where: { cabinetId: utilisateur.cabinetId },
      select: { id: true, raisonSociale: true, regime: true },
      orderBy: { raisonSociale: 'asc' },
    });
    const ids = dossiers.map((d) => d.id);
    // Toujours combiné par AND : aucun filtre ne peut élargir le périmètre du cabinet
    const duCabinet = { dossierId: { in: ids } };
    const ilYaUneSemaine = new Date(Date.now() - SEMAINE_MS);

    const [
      parStatut,
      demandesOuvertes,
      pretes,
      aValiderListe,
      recuesSemaine,
      aReprendre,
      exportees,
      dernierLot,
      sommes,
      piecesRecentes,
      demandesRecentes,
      accesRecents,
      lotsRecents,
    ] = await Promise.all([
      this.prisma.piece.groupBy({
        by: ['dossierId', 'statut'],
        where: duCabinet,
        _count: { _all: true },
        _max: { creeLe: true },
      }),
      this.prisma.demandePiece.groupBy({
        by: ['dossierId'],
        where: { AND: [duCabinet, { statut: 'OUVERTE' }] },
        _count: { _all: true },
      }),
      this.prisma.piece.groupBy({
        by: ['dossierId'],
        where: {
          AND: [
            duCabinet,
            { statut: 'TRAITEE' },
            { lotExportId: null },
            { lignes: { some: {} } },
          ],
        },
        _count: { _all: true },
      }),
      this.prisma.piece.findMany({
        where: { AND: [duCabinet, { statut: 'RECUE' }] },
        select: { id: true, dossierId: true },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.piece.count({
        where: {
          AND: [
            duCabinet,
            { statut: { not: 'REMPLACEE' } },
            { creeLe: { gte: ilYaUneSemaine } },
          ],
        },
      }),
      this.prisma.demandePiece.count({
        where: {
          AND: [duCabinet, { statut: 'OUVERTE' }, { pieceId: { not: null } }],
        },
      }),
      this.prisma.piece.count({
        where: { AND: [duCabinet, { lotExportId: { not: null } }] },
      }),
      this.prisma.lotExport.findFirst({
        where: duCabinet,
        orderBy: { creeLe: 'desc' },
        select: { creeLe: true },
      }),
      this.prisma.ligneEcriture.aggregate({
        where: {
          piece: {
            AND: [duCabinet, { statut: 'TRAITEE' }, { lotExportId: null }],
          },
        },
        _sum: { debit: true, credit: true },
      }),
      this.prisma.piece.findMany({
        where: { AND: [duCabinet, { statut: { not: 'REMPLACEE' } }] },
        orderBy: { creeLe: 'desc' },
        take: 6,
        select: {
          creeLe: true,
          fournisseur: true,
          categorie: true,
          montantTtc: true,
          dossier: { select: { id: true, raisonSociale: true } },
        },
      }),
      this.prisma.demandePiece.findMany({
        where: duCabinet,
        orderBy: { creeLe: 'desc' },
        take: 6,
        select: {
          creeLe: true,
          description: true,
          pieceId: true,
          demandePar: { select: { nom: true } },
          dossier: { select: { id: true, raisonSociale: true } },
        },
      }),
      this.prisma.invitation.findMany({
        where: {
          AND: [{ cabinetId: utilisateur.cabinetId }, { statut: 'ACCEPTEE' }],
        },
        orderBy: { accepteeLe: 'desc' },
        take: 6,
        select: {
          accepteeLe: true,
          creeLe: true,
          nom: true,
          role: true,
          dossier: { select: { id: true, raisonSociale: true } },
        },
      }),
      this.prisma.lotExport.findMany({
        where: duCabinet,
        orderBy: { creeLe: 'desc' },
        take: 6,
        select: {
          creeLe: true,
          nbPieces: true,
          creePar: { select: { nom: true } },
          dossier: { select: { id: true, raisonSociale: true } },
        },
      }),
    ]);

    // Une ligne par dossier
    const lignes: LigneTableau[] = dossiers.map((d) => {
      const groupes = parStatut.filter((g) => g.dossierId === d.id);
      const compte = (statut: string) =>
        groupes
          .filter((g) => g.statut === statut)
          .reduce((s, g) => s + g._count._all, 0);
      const recues = groupes
        .filter((g) => g.statut !== 'REMPLACEE')
        .reduce((s, g) => s + g._count._all, 0);
      const dates = groupes
        .map((g) => g._max.creeLe)
        .filter((x): x is Date => x !== null)
        .map((x) => x.getTime());
      const demandees =
        demandesOuvertes.find((g) => g.dossierId === d.id)?._count._all ?? 0;
      return {
        id: d.id,
        raisonSociale: d.raisonSociale,
        regime: d.regime,
        recues,
        demandees,
        attendues: recues + demandees,
        aValider: compte('RECUE'),
        aCompleter: compte('A_COMPLETER'),
        pretesExport:
          pretes.find((g) => g.dossierId === d.id)?._count._all ?? 0,
        derniereLe: dates.length > 0 ? new Date(Math.max(...dates)) : null,
        premiereAValiderId:
          aValiderListe.find((p) => p.dossierId === d.id)?.id ?? null,
      };
    });

    // Activité récente : les 6 derniers événements, toutes sources confondues
    const activite: Activite[] = [
      ...piecesRecentes.map((p) => ({
        type: 'piece' as const,
        le: p.creeLe,
        titre: `Nouvelle pièce : ${p.fournisseur ?? p.categorie} · ${montant.format(p.montantTtc)} FCFA`,
        dossierId: p.dossier.id,
        dossier: p.dossier.raisonSociale,
      })),
      ...demandesRecentes.map((d) => ({
        type: 'demande' as const,
        le: d.creeLe,
        titre: d.pieceId
          ? `${d.demandePar.nom} a renvoyé une pièce : ${d.description}`
          : `${d.demandePar.nom} a demandé : ${d.description}`,
        dossierId: d.dossier.id,
        dossier: d.dossier.raisonSociale,
      })),
      ...accesRecents.map((a) => ({
        type: 'acces' as const,
        le: a.accepteeLe ?? a.creeLe,
        titre:
          a.role === 'PME'
            ? `${a.nom} a rejoint son dossier`
            : `${a.nom} a rejoint l'équipe`,
        dossierId: a.dossier?.id ?? null,
        dossier: a.dossier?.raisonSociale ?? null,
      })),
      ...lotsRecents.map((l) => ({
        type: 'export' as const,
        le: l.creeLe,
        titre: `${l.creePar.nom} a exporté ${l.nbPieces} pièce${l.nbPieces > 1 ? 's' : ''} vers Sage`,
        dossierId: l.dossier.id,
        dossier: l.dossier.raisonSociale,
      })),
    ]
      .sort((a, b) => b.le.getTime() - a.le.getTime())
      .slice(0, 6);

    const total = (cle: 'aValider' | 'demandees' | 'pretesExport') =>
      lignes.reduce((s, l) => s + l[cle], 0);

    return {
      stats: {
        recues: lignes.reduce((s, l) => s + l.recues, 0),
        recuesSemaine,
        aValider: total('aValider'),
        dossiersAValider: lignes.filter((l) => l.aValider > 0).length,
        demandees: total('demandees'),
        aReprendre,
        exportees,
        dernierExport: dernierLot?.creeLe ?? null,
      },
      export: {
        pieces: total('pretesExport'),
        debit: sommes._sum.debit ?? 0,
        credit: sommes._sum.credit ?? 0,
      },
      premiereAValiderId: aValiderListe[0]?.id ?? null,
      dossiers: lignes,
      activite,
    };
  }
}
