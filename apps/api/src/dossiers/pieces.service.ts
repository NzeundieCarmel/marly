import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Piece, StatutDemande, StatutPiece } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { DossiersService } from './dossiers.service';
import { CreerPieceDto } from './dto/creer-piece.dto';

export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;
const DOSSIER_UPLOADS = join(process.cwd(), 'uploads');

export interface FichierRecu {
  buffer: Buffer;
  size: number;
}

// Le type réel d'un fichier se lit dans ses premiers octets, pas dans son nom
function detecterExtension(contenu: Buffer): 'jpg' | 'png' | 'pdf' | null {
  const debut = contenu.subarray(0, 4);
  if (debut[0] === 0xff && debut[1] === 0xd8 && debut[2] === 0xff) {
    return 'jpg';
  }
  if (debut.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return 'png';
  }
  if (debut.toString('latin1') === '%PDF') {
    return 'pdf';
  }
  return null;
}

@Injectable()
export class PiecesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossiersService,
  ) {}

  async creer(
    dossierId: string,
    utilisateur: ChargeJeton,
    dto: CreerPieceDto,
    fichier: FichierRecu | undefined,
  ): Promise<Piece> {
    // 1. Accès (garantit aussi que dossierId est un identifiant réel, sûr pour un chemin)
    await this.dossiers.verifierAcces(dossierId, utilisateur);

    // 2. Présence et taille du fichier
    if (!fichier) {
      throw new BadRequestException('Le fichier de la piece est obligatoire');
    }
    if (fichier.size > TAILLE_MAX_OCTETS) {
      throw new PayloadTooLargeException('Fichier trop lourd (10 Mo maximum)');
    }

    // 3. Type réel du fichier
    const extension = detecterExtension(fichier.buffer);
    if (!extension) {
      throw new BadRequestException('Formats acceptes : JPG, PNG ou PDF');
    }

    // 4. Demande du cabinet à laquelle la pièce répond, si elle est précisée
    const demande = dto.demandeId
      ? await this.prisma.demandePiece.findFirst({
          where: { id: dto.demandeId, dossierId },
        })
      : null;
    if (dto.demandeId && !demande) {
      throw new NotFoundException('Demande introuvable');
    }
    if (demande && demande.statut !== StatutDemande.OUVERTE) {
      throw new ConflictException('Cette demande est deja close');
    }

    // 5. Doublon : même empreinte déjà présente dans ce dossier
    const empreinte = createHash('sha256').update(fichier.buffer).digest('hex');
    const doublon = await this.prisma.piece.findFirst({
      where: { dossierId, empreinte },
      select: { id: true },
    });
    if (doublon) {
      throw new ConflictException(
        'Cette piece a deja ete envoyee pour ce dossier',
      );
    }

    // 6. Enregistrement du fichier sous un nom aléatoire
    const nomFichier = `${randomUUID()}.${extension}`;
    await mkdir(join(DOSSIER_UPLOADS, dossierId), { recursive: true });
    await writeFile(join(DOSSIER_UPLOADS, dossierId, nomFichier), fichier.buffer);

    const donnees = {
      dossierId,
      date: new Date(dto.date),
      montantTtc: dto.montantTtc,
      fournisseur: dto.fournisseur?.trim() || null,
      categorie: dto.categorie.trim(),
      statut: StatutPiece.RECUE,
      fichier: `${dossierId}/${nomFichier}`,
      empreinte,
    };

    if (!demande) {
      return this.prisma.piece.create({ data: donnees });
    }

    // 7. Tout ou rien : la pièce, la demande satisfaite et l'éventuelle pièce remplacée
    return this.prisma.$transaction(async (tx) => {
      const piece = await tx.piece.create({ data: donnees });
      await tx.demandePiece.update({
        where: { id: demande.id },
        data: {
          statut: StatutDemande.SATISFAITE,
          reponseId: piece.id,
          satisfaiteLe: new Date(),
        },
      });
      if (demande.pieceId) {
        await tx.piece.update({
          where: { id: demande.pieceId },
          data: { statut: StatutPiece.REMPLACEE },
        });
      }
      return piece;
    });
  }
}