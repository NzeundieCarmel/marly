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
import { FacturesService } from '../facturation/factures.service';
import { MemoireComptesService } from './memoire-comptes.service';
import type { Souvenir } from './memoire-comptes.service';
import type { FactureDocument } from '../facturation/factures.service';
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
    factureId: string | null;
    empreinte: string | null;
    recueLe: Date;
  };
  dossier: {
    id: string;
    raisonSociale: string;
    regime: 'REEL' | 'IGS';
    tauxTva: number;
    niu: string | null;
  };
  ecriture: {
    journal: string;
    proposee: boolean;
    lignes: LigneEcritureProposee[];
    souvenir?: Souvenir | null;
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
    private readonly factures: FacturesService,
    private readonly memoire: MemoireComptesService,
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

  async detail(
    pieceId: string,
    utilisateur: ChargeJeton,
  ): Promise<DetailPiece> {
    const piece = await this.chargerPiece(pieceId, utilisateur);
    const dossier = {
      id: piece.dossier.id,
      raisonSociale: piece.dossier.raisonSociale,
      regime: piece.dossier.regime,
      tauxTva: piece.dossier.tauxTva.toNumber(),
      niu: piece.dossier.niu,
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
        : piece.factureId
          ? { ...(await this.ecritureVente(piece.factureId)), proposee: true }
          : {
              ...(await this.memoire.appliquer(
                piece,
                proposerEcriture(piece, dossier),
              )),
              proposee: true,
            };

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
        factureId: piece.factureId,
        empreinte: piece.empreinte,
        recueLe: piece.creeLe,
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
      if (ligne.debit > 0 === ligne.credit > 0) {
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

    await this.memoire.retenir(piece, dto);
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
      type:
        TYPES_FICHIER[extname(chemin).toLowerCase()] ??
        'application/octet-stream',
    };
  }

  // Vente émise avec Marly : client au débit, vente et TVA collectée au crédit ; sens inverse pour un avoir
  private async ecritureVente(
    factureId: string,
  ): Promise<{ journal: string; lignes: LigneEcritureProposee[] }> {
    const f = await this.prisma.facture.findUnique({
      where: { id: factureId },
      select: {
        type: true,
        numero: true,
        totalHt: true,
        totalTva: true,
        totalTtc: true,
        clientFige: true,
        client: { select: { nom: true } },
      },
    });
    if (!f) throw new NotFoundException('Facture introuvable');

    const client =
      (f.clientFige as { nom?: string } | null)?.nom ?? f.client.nom;
    const avoir = f.type === 'AVOIR';
    const libelle = `${avoir ? 'Avoir' : 'Facture'} ${f.numero ?? ''} ${client}`
      .trim()
      .slice(0, 120);
    const sens = (montant: number, auDebit: boolean) =>
      auDebit !== avoir
        ? { debit: montant, credit: 0 }
        : { debit: 0, credit: montant };

    const lignes: LigneEcritureProposee[] = [
      { compte: '411', libelle, tiers: client, ...sens(f.totalTtc, true) },
      { compte: '701', libelle, tiers: null, ...sens(f.totalHt, false) },
    ];
    if (f.totalTva > 0) {
      lignes.push({
        compte: '4431',
        libelle,
        tiers: null,
        ...sens(f.totalTva, false),
      });
    }
    return { journal: 'VE', lignes };
  }

  // Le document de la facture, pour le cabinet qui valide la pièce de vente
  async facture(
    pieceId: string,
    utilisateur: ChargeJeton,
  ): Promise<FactureDocument> {
    const piece = await this.chargerPiece(pieceId, utilisateur);
    if (!piece.factureId) {
      throw new NotFoundException(
        "Cette pièce ne vient pas d'une facture Marly",
      );
    }
    return this.factures.documentParId(piece.factureId);
  }
}
