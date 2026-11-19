import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Regime } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreerDossierDto, ModifierDossierDto } from './dto/dossier.dto';

export interface FicheDossier {
  id: string;
  raisonSociale: string;
  regime: Regime;
  niu: string | null;
  rccm: string | null;
  tauxTva: number;
}

const SELECTION = {
  id: true,
  raisonSociale: true,
  regime: true,
  niu: true,
  rccm: true,
  tauxTva: true,
} as const;

function versFiche(
  dossier: Prisma.DossierGetPayload<{ select: typeof SELECTION }>,
): FicheDossier {
  return { ...dossier, tauxTva: Number(dossier.tauxTva) };
}

@Injectable()
export class GestionDossiersService {
  constructor(private readonly prisma: PrismaService) {}

  // Un cabinet ne voit et ne modifie que ses propres dossiers
  async lire(id: string, utilisateur: ChargeJeton): Promise<FicheDossier> {
    const dossier = await this.prisma.dossier.findFirst({
      where: { AND: [{ id }, { cabinetId: utilisateur.cabinetId }] },
      select: SELECTION,
    });
    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }
    return versFiche(dossier);
  }

  private async verifierNiu(
    niu: string | null | undefined,
    cabinetId: string,
    saufId?: string,
  ): Promise<void> {
    if (!niu) return;
    const doublon = await this.prisma.dossier.findFirst({
      where: {
        AND: [
          { cabinetId },
          { niu },
          ...(saufId ? [{ NOT: { id: saufId } }] : []),
        ],
      },
      select: { id: true },
    });
    if (doublon) {
      throw new ConflictException(
        'Un dossier de ton cabinet utilise déjà ce NIU',
      );
    }
  }

  async creer(
    dto: CreerDossierDto,
    utilisateur: ChargeJeton,
  ): Promise<FicheDossier> {
    await this.verifierNiu(dto.niu, utilisateur.cabinetId);
    const dossier = await this.prisma.dossier.create({
      data: {
        raisonSociale: dto.raisonSociale,
        regime: dto.regime,
        niu: dto.niu ?? null,
        rccm: dto.rccm ?? null,
        cabinetId: utilisateur.cabinetId,
      },
      select: SELECTION,
    });
    return versFiche(dossier);
  }

  async modifier(
    id: string,
    dto: ModifierDossierDto,
    utilisateur: ChargeJeton,
  ): Promise<FicheDossier> {
    await this.lire(id, utilisateur);
    await this.verifierNiu(dto.niu, utilisateur.cabinetId, id);

    const dossier = await this.prisma.dossier.update({
      where: { id },
      data: {
        raisonSociale: dto.raisonSociale ?? undefined,
        regime: dto.regime ?? undefined,
        // undefined = ne pas toucher ; null = effacer
        niu: dto.niu,
        rccm: dto.rccm,
      },
      select: SELECTION,
    });
    return versFiche(dossier);
  }
}
