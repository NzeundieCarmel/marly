import { Injectable, NotFoundException } from '@nestjs/common';
import { Piece, StatutPiece } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ResumeDossier {
  id: string;
  raisonSociale: string;
  regime: 'REEL' | 'IGS';
  piecesRecues: number;
  aValider: number;
  aCompleter: number;
}

@Injectable()
export class DossiersService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(): Promise<ResumeDossier[]> {
    const dossiers = await this.prisma.dossier.findMany({
      orderBy: { raisonSociale: 'asc' },
      include: { pieces: { select: { statut: true } } },
    });

    return dossiers.map((d) => ({
      id: d.id,
      raisonSociale: d.raisonSociale,
      regime: d.regime,
      piecesRecues: d.pieces.length,
      aValider: d.pieces.filter((p) => p.statut === StatutPiece.RECUE).length,
      aCompleter: d.pieces.filter((p) => p.statut === StatutPiece.A_COMPLETER)
        .length,
    }));
  }

  async pieces(dossierId: string): Promise<Piece[]> {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { id: true },
    });
    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }

    return this.prisma.piece.findMany({
      where: { dossierId },
      orderBy: { date: 'desc' },
    });
  }
}