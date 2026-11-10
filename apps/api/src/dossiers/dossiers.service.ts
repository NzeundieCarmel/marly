import { Injectable, NotFoundException } from '@nestjs/common';
import { Piece, Prisma, StatutPiece } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
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

  // Dossiers autorisés : ceux du cabinet, et pour une PME uniquement le sien
  private filtreAcces(utilisateur: ChargeJeton): Prisma.DossierWhereInput {
    if (utilisateur.role === 'PME') {
      return {
        cabinetId: utilisateur.cabinetId,
        id: utilisateur.dossierId ?? 'aucun-dossier',
      };
    }
    return { cabinetId: utilisateur.cabinetId };
  }

  async lister(utilisateur: ChargeJeton): Promise<ResumeDossier[]> {
    const dossiers = await this.prisma.dossier.findMany({
      where: this.filtreAcces(utilisateur),
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

  async pieces(dossierId: string, utilisateur: ChargeJeton): Promise<Piece[]> {
    // AND : le dossier doit respecter le filtre d'accès ET avoir cet identifiant.
    // Ne jamais fusionner les objets avec "..." : un champ en double s'écraserait.
    const dossier = await this.prisma.dossier.findFirst({
      where: { AND: [this.filtreAcces(utilisateur), { id: dossierId }] },
      select: { id: true },
    });

    // 404 et non 403 : on ne confirme pas l'existence d'un dossier interdit
    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }

    return this.prisma.piece.findMany({
      where: { dossierId },
      orderBy: { date: 'desc' },
    });
  }
}