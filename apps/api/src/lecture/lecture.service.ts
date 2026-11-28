import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createWorker, OEM, type Worker } from 'tesseract.js';
import type { ChargeJeton } from '../auth/auth.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { TAILLE_MAX_OCTETS } from '../dossiers/pieces.service';
import type { FichierRecu } from '../dossiers/pieces.service';
import { PrismaService } from '../prisma/prisma.service';
import { analyserTexte } from './analyse';
import type { ResultatLecture } from './analyse';

// Les donnees de langue sont telechargees une fois, puis gardees avec les pieces
const CACHE_OCR = join(process.cwd(), 'uploads', '.ocr');
const DELAI_MAX_MS = 120_000;

function estImage(contenu: Buffer): boolean {
  const jpg = contenu[0] === 0xff && contenu[1] === 0xd8 && contenu[2] === 0xff;
  const png = contenu
    .subarray(0, 4)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return jpg || png;
}

@Injectable()
export class LectureService implements OnModuleDestroy {
  private moteur: Promise<Worker> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossiersService,
  ) {}

  // Un seul moteur Tesseract, prepare a la premiere lecture puis reutilise
  private obtenirMoteur(): Promise<Worker> {
    if (!this.moteur) {
      const demarrage = (async () => {
        await mkdir(CACHE_OCR, { recursive: true });
        return createWorker('fra', OEM.LSTM_ONLY, { cachePath: CACHE_OCR });
      })();
      this.moteur = demarrage;
      demarrage.catch(() => {
        this.moteur = null;
      });
    }
    return this.moteur;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.moteur) return;
    try {
      await (await this.moteur).terminate();
    } catch {
      // Moteur jamais demarre : rien a arreter
    }
  }

  private async reconnaitre(contenu: Buffer): Promise<string> {
    let minuteur: NodeJS.Timeout | undefined;
    const delai = new Promise<never>((_, rejeter) => {
      minuteur = setTimeout(
        () => rejeter(new Error('Lecture trop longue')),
        DELAI_MAX_MS,
      );
    });
    try {
      const moteur = await this.obtenirMoteur();
      const resultat = await Promise.race([moteur.recognize(contenu), delai]);
      return resultat.data.text;
    } finally {
      clearTimeout(minuteur);
    }
  }

  async lire(
    dossierId: string,
    utilisateur: ChargeJeton,
    fichier: FichierRecu | undefined,
  ): Promise<ResultatLecture & { texte: string }> {
    try {
      await this.dossiers.verifierAcces(dossierId, utilisateur);
    } catch {
      throw new NotFoundException('Dossier introuvable');
    }
    if (!fichier) {
      throw new BadRequestException('Envoyez la photo de la pièce');
    }
    if (fichier.size > TAILLE_MAX_OCTETS) {
      throw new PayloadTooLargeException('Fichier trop lourd (10 Mo maximum)');
    }
    if (!estImage(fichier.buffer)) {
      throw new BadRequestException(
        'La lecture automatique fonctionne avec une photo (JPG ou PNG)',
      );
    }
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { raisonSociale: true, niu: true, regime: true, tauxTva: true },
    });
    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }

    let texte: string;
    try {
      texte = await this.reconnaitre(fichier.buffer);
    } catch {
      throw new ServiceUnavailableException(
        'La lecture automatique est indisponible pour le moment. Remplissez les champs à la main.',
      );
    }
    const resultat = analyserTexte(texte, {
      raisonSociale: dossier.raisonSociale,
      niu: dossier.niu,
      regime: dossier.regime,
      tauxTva: dossier.tauxTva.toNumber(),
      aujourdhui: new Date(),
    });
    return { ...resultat, texte: texte.slice(0, 4000) };
  }
}
