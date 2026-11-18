import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { FORMAT_SAGE, genererCsv } from './format-sage';
import type { LigneExport } from './format-sage';

export interface ApercuExport {
  nbPieces: number;
  nbLignes: number;
  totalDebit: number;
  totalCredit: number;
  du: Date | null;
  au: Date | null;
}

export interface ResumeLot {
  id: string;
  creeLe: Date;
  creePar: string;
  nbPieces: number;
  nbLignes: number;
  totalDebit: number;
  totalCredit: number;
}

// Pièces prêtes : validées, avec une écriture, jamais exportées
function piecesPretes(dossierId: string) {
  return {
    dossierId,
    statut: 'TRAITEE' as const,
    lotExportId: null,
    lignes: { some: {} },
  };
}

function totaux(pieces: { lignes: { debit: number; credit: number }[] }[]) {
  let nbLignes = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  for (const piece of pieces) {
    for (const ligne of piece.lignes) {
      nbLignes += 1;
      totalDebit += ligne.debit;
      totalCredit += ligne.credit;
    }
  }
  return { nbPieces: pieces.length, nbLignes, totalDebit, totalCredit };
}

function resumer(lot: {
  id: string;
  creeLe: Date;
  nbPieces: number;
  nbLignes: number;
  totalDebit: number;
  totalCredit: number;
  creePar: { nom: string };
}): ResumeLot {
  return {
    id: lot.id,
    creeLe: lot.creeLe,
    creePar: lot.creePar.nom,
    nbPieces: lot.nbPieces,
    nbLignes: lot.nbLignes,
    totalDebit: lot.totalDebit,
    totalCredit: lot.totalCredit,
  };
}

function nomFichier(raisonSociale: string, date: Date): string {
  const base = raisonSociale
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const jour = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `marly-${base}-${jour}.csv`;
}

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  // L'export est réservé au cabinet : le dossier doit lui appartenir
  private async dossierDuCabinet(
    dossierId: string,
    utilisateur: ChargeJeton,
  ): Promise<void> {
    const dossier = await this.prisma.dossier.findFirst({
      where: { AND: [{ id: dossierId }, { cabinetId: utilisateur.cabinetId }] },
      select: { id: true },
    });
    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }
  }

  async apercu(
    dossierId: string,
    utilisateur: ChargeJeton,
  ): Promise<ApercuExport> {
    await this.dossierDuCabinet(dossierId, utilisateur);
    const pieces = await this.prisma.piece.findMany({
      where: piecesPretes(dossierId),
      select: { date: true, lignes: { select: { debit: true, credit: true } } },
      orderBy: { date: 'asc' },
    });
    return {
      ...totaux(pieces),
      du: pieces.length > 0 ? pieces[0].date : null,
      au: pieces.length > 0 ? pieces[pieces.length - 1].date : null,
    };
  }

  async creer(dossierId: string, utilisateur: ChargeJeton): Promise<ResumeLot> {
    await this.dossierDuCabinet(dossierId, utilisateur);

    return this.prisma.$transaction(async (tx) => {
      const pieces = await tx.piece.findMany({
        where: piecesPretes(dossierId),
        select: { id: true, lignes: { select: { debit: true, credit: true } } },
      });
      if (pieces.length === 0) {
        throw new ConflictException('Aucune pièce validée à exporter');
      }

      const t = totaux(pieces);
      if (t.totalDebit !== t.totalCredit) {
        throw new ConflictException('Écritures déséquilibrées : export annulé');
      }

      const lot = await tx.lotExport.create({
        data: { dossierId, creeParId: utilisateur.sub, ...t },
        include: { creePar: { select: { nom: true } } },
      });

      // Deux exports lancés en même temps : le second échoue et rien n'est enregistré
      const maj = await tx.piece.updateMany({
        where: { id: { in: pieces.map((p) => p.id) }, lotExportId: null },
        data: { lotExportId: lot.id },
      });
      if (maj.count !== pieces.length) {
        throw new ConflictException(
          'Un autre export est en cours. Recommence.',
        );
      }

      return resumer(lot);
    });
  }

  async lister(
    dossierId: string,
    utilisateur: ChargeJeton,
  ): Promise<ResumeLot[]> {
    await this.dossierDuCabinet(dossierId, utilisateur);
    const lots = await this.prisma.lotExport.findMany({
      where: { dossierId },
      orderBy: { creeLe: 'desc' },
      take: 20,
      include: { creePar: { select: { nom: true } } },
    });
    return lots.map(resumer);
  }

  async fichier(
    lotId: string,
    utilisateur: ChargeJeton,
  ): Promise<{ nom: string; contenu: string }> {
    const lot = await this.prisma.lotExport.findFirst({
      where: {
        AND: [{ id: lotId }, { dossier: { cabinetId: utilisateur.cabinetId } }],
      },
      include: {
        dossier: { select: { raisonSociale: true } },
        pieces: {
          orderBy: [{ date: 'asc' }, { id: 'asc' }],
          include: { lignes: { orderBy: { ordre: 'asc' } } },
        },
      },
    });
    if (!lot) {
      throw new NotFoundException('Export introuvable');
    }

    const lignes: LigneExport[] = lot.pieces.flatMap((piece) =>
      piece.lignes.map((ligne) => ({
        journal: piece.journal ?? 'AC',
        date: piece.date,
        reference: piece.id.slice(-10).toUpperCase(),
        compte: ligne.compte,
        tiers: ligne.tiers,
        libelle: ligne.libelle,
        debit: ligne.debit,
        credit: ligne.credit,
      })),
    );

    return {
      nom: nomFichier(lot.dossier.raisonSociale, lot.creeLe),
      contenu: genererCsv(lignes, FORMAT_SAGE),
    };
  }
}
