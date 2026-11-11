import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatutPiece } from '@prisma/client';
import { access } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { ChargeJeton } from '../auth/auth.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { PrismaService } from '../prisma/prisma.service';
import { ValiderPieceDto } from './dto/valider-piece.dto';
import { proposerEcriture } from './plan-comptable';
import type { LigneEcritureProposee } from './plan-comptable';

export interface DetailPiece {
  piece: {
    id: string;
    date: Date;
    montantTtc: number;
    fournisseur: string | null;
    categorie: string;
    statut: StatutPiece;
    journal: string | null;
    valideLe: Date | null;
    aUnFichier: boolean;
  };
  dossier: {
    id: string;
    raisonSociale: string;
    regime: 'REEL' | 'IGS';
    tauxTva: number;
  };
  ecriture: {
    journal: string;
    proposee: boolean;
    lignes: LigneEcritureProposee[];
  };
}

const TYPES_FICHIER: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

@Injectable()
export class ComptabiliteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossiersService,
  ) {}

  // Charge une pièce en vérifiant que l'utilisateur a accès à son dossier
  private async chargerPiece(pieceId: string, utilisateur: ChargeJeton) {
    const piece = await this.prisma.piece.findUnique({
      where: { id: pieceId },
      include: { dossier: true, lignes: { orderBy: { ordre: 'asc' } } },
    });
    if (!piece) {
      throw new NotFoundException('Piece introuvable');
    }
    try {
      await this.dossiers.verifierAcces(piece.dossierId, utilisateur);
    } catch {
      // Même réponse qu'une pièce inexistante : on ne révèle rien
      throw new NotFoundException('Piece introuvable');
    }
    return piece;
  }

  async detail(pieceId: string, utilisateur: ChargeJeton): Promise<DetailPiece> {
    const piece = await this.chargerPiece(pieceId, utilisateur);
    const dossier = {
      id: piece.dossier.id,
      raisonSociale: piece.dossier.raisonSociale,
      regime: piece.dossier.regime,
      tauxTva: piece.dossier.tauxTva.toNumber(),
    };

    // Pièce déjà validée : l'écriture enregistrée ; sinon : la proposition de Marly
    const ecriture =
      piece.lignes.length > 0
        ? {
            journal: piece.journal ?? 'AC',
            proposee: false,
            lignes: piece.lignes.map((l) => ({
              compte: l.compte,
              libelle: l.libelle,
              tiers: l.tiers,
              debit: l.debit,
              credit: l.credit,
            })),
          }
        : { ...proposerEcriture(piece, dossier), proposee: true };

    return {
      piece: {
        id: piece.id,
        date: piece.date,
        montantTtc: piece.montantTtc,
        fournisseur: piece.fournisseur,
        categorie: piece.categorie,
        statut: piece.statut,
        journal: piece.journal,
        valideLe: piece.valideLe,
        aUnFichier: piece.fichier !== null,
      },
      dossier,
      ecriture,
    };
  }

  async valider(
    pieceId: string,
    utilisateur: ChargeJeton,
    dto: ValiderPieceDto,
  ): Promise<DetailPiece> {
    const piece = await this.chargerPiece(pieceId, utilisateur);

    if (piece.statut === StatutPiece.TRAITEE) {
      throw new ConflictException('Piece deja validee');
    }
    if (piece.statut !== StatutPiece.RECUE) {
      throw new ConflictException('Seule une piece recue peut etre validee');
    }

    for (const ligne of dto.lignes) {
      if ((ligne.debit > 0) === (ligne.credit > 0)) {
        throw new BadRequestException(
          `Compte ${ligne.compte} : chaque ligne doit avoir soit un debit, soit un credit`,
        );
      }
    }

    const totalDebit = dto.lignes.reduce((somme, l) => somme + l.debit, 0);
    const totalCredit = dto.lignes.reduce((somme, l) => somme + l.credit, 0);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Ecriture desequilibree : debit ${totalDebit}, credit ${totalCredit}`,
      );
    }

    // Tout ou rien : les lignes et le statut sont enregistrés ensemble
    await this.prisma.$transaction([
      this.prisma.ligneEcriture.deleteMany({ where: { pieceId } }),
      this.prisma.ligneEcriture.createMany({
        data: dto.lignes.map((l, index) => ({
          pieceId,
          ordre: index + 1,
          compte: l.compte,
          libelle: l.libelle.trim(),
          tiers: l.tiers?.trim() || null,
          debit: l.debit,
          credit: l.credit,
        })),
      }),
      this.prisma.piece.update({
        where: { id: pieceId },
        data: {
          statut: StatutPiece.TRAITEE,
          journal: dto.journal,
          valideLe: new Date(),
          valideParId: utilisateur.sub,
        },
      }),
    ]);

    return this.detail(pieceId, utilisateur);
  }

  async fichier(
    pieceId: string,
    utilisateur: ChargeJeton,
  ): Promise<{ chemin: string; type: string }> {
    const piece = await this.chargerPiece(pieceId, utilisateur);
    if (!piece.fichier) {
      throw new NotFoundException('Aucun fichier pour cette piece');
    }

    const chemin = join(process.cwd(), 'uploads', ...piece.fichier.split('/'));
    try {
      await access(chemin);
    } catch {
      throw new NotFoundException('Fichier introuvable sur le serveur');
    }

    return {
      chemin,
      type: TYPES_FICHIER[extname(chemin).toLowerCase()] ?? 'application/octet-stream',
    };
  }
}