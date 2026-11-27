import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrigineEcriture, StatutPiece } from '@prisma/client';
import { access } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { ChargeJeton } from '../auth/auth.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { FacturesService } from '../facturation/factures.service';
import { GrandLivreService } from './grand-livre.service';
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
    private readonly grandLivre: GrandLivreService,
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
    await this.verifierTenue(piece.dossier.cabinetId, utilisateur);
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
    await this.verifierTenue(piece.dossier.cabinetId, utilisateur);

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
    await this.prisma.$transaction(async (tx) => {
      await tx.ligneEcriture.deleteMany({ where: { pieceId } });
      await tx.ligneEcriture.createMany({
        data: dto.lignes.map((l, index) => ({
          pieceId,
          ordre: index + 1,
          compte: l.compte,
          libelle: l.libelle.trim(),
          tiers: l.tiers?.trim() || null,
          debit: l.debit,
          credit: l.credit,
        })),
      });
      await tx.piece.update({
        where: { id: pieceId },
        data: {
          statut: StatutPiece.TRAITEE,
          journal: dto.journal,
          valideLe: new Date(),
          valideParId: utilisateur.sub,
        },
      });
      // L'ecriture entre aussi au grand livre de l'entreprise, dans la meme transaction
      await this.grandLivre.passer(tx, {
        dossierId: piece.dossierId,
        journal: dto.journal,
        date: piece.date,
        libelle: piece.fournisseur ?? piece.categorie,
        origine: OrigineEcriture.PIECE,
        origineId: pieceId,
        creeParId: utilisateur.sub,
        lignes: dto.lignes,
      });
    });

    await this.memoire.retenir(piece, dto);
    return this.detail(pieceId, utilisateur);
  }

  // Le gerant ne tient lui-meme la comptabilite que si son entreprise est autonome
  private async verifierTenue(
    cabinetId: string,
    utilisateur: ChargeJeton,
  ): Promise<void> {
    if (utilisateur.role !== 'PME') return;
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: { autonome: true },
    });
    if (!cabinet?.autonome) {
      throw new ForbiddenException(
        'La comptabilite de ce dossier est tenue par votre cabinet',
      );
    }
  }

  // Comptabilise d'un coup les pieces recues, chacune avec l'ecriture proposee par Marly
  async comptabiliserEnAttente(
    dossierId: string,
    utilisateur: ChargeJeton,
  ): Promise<{ comptabilisees: number; ignorees: number }> {
    try {
      await this.dossiers.verifierAcces(dossierId, utilisateur);
    } catch {
      throw new NotFoundException('Dossier introuvable');
    }
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { cabinetId: true },
    });
    await this.verifierTenue(dossier?.cabinetId ?? '', utilisateur);

    const pieces = await this.prisma.piece.findMany({
      where: { dossierId, statut: StatutPiece.RECUE },
      orderBy: { date: 'asc' },
      select: { id: true },
    });
    let comptabilisees = 0;
    let ignorees = 0;
    for (const { id } of pieces) {
      try {
        const { ecriture } = await this.detail(id, utilisateur);
        await this.valider(id, utilisateur, {
          journal: ecriture.journal,
          lignes: ecriture.lignes.map((l) => ({
            compte: l.compte,
            libelle: l.libelle,
            tiers: l.tiers,
            debit: l.debit,
            credit: l.credit,
          })),
        });
        comptabilisees++;
      } catch {
        // Piece incomplete (montant nul, compte invalide...) : laissee pour une validation a la main
        ignorees++;
      }
    }
    return { comptabilisees, ignorees };
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
