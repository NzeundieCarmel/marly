import {
  BadRequestException,
  ConflictException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Piece, StatutPiece } from '@prisma/client';
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

    // 4. Doublon : même empreinte déjà présente dans ce dossier
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

    // 5. Enregistrement du fichier sous un nom aléatoire, puis de la pièce en base
    const nomFichier = `${randomUUID()}.${extension}`;
    await mkdir(join(DOSSIER_UPLOADS, dossierId), { recursive: true });
    await writeFile(join(DOSSIER_UPLOADS, dossierId, nomFichier), fichier.buffer);

    return this.prisma.piece.create({
      data: {
        dossierId,
        date: new Date(dto.date),
        montantTtc: dto.montantTtc,
        fournisseur: dto.fournisseur?.trim() || null,
        categorie: dto.categorie.trim(),
        statut: StatutPiece.RECUE,
        fichier: `${dossierId}/${nomFichier}`,
        empreinte,
      },
    });
  }
}