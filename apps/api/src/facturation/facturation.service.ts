import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientFactureDto, ProfilFacturationDto } from './dto/facturation.dto';

export interface FicheFacturation {
  formeJuridique: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  centreImpots: string | null;
  banque: string | null;
  compte: string | null;
  conditionsPaiement: string | null;
  penalitesRetard: string | null;
}

export interface ProfilEmetteur {
  raisonSociale: string;
  regime: 'REEL' | 'IGS';
  tauxTva: number;
  niu: string | null;
  rccm: string | null;
  autonome: boolean;
  fiche: FicheFacturation;
  manquants: string[];
}

export interface ClientFacture {
  id: string;
  nom: string;
  adresse: string | null;
  niu: string | null;
  telephone: string | null;
  email: string | null;
}

const CHAMPS_CLIENT = {
  id: true,
  nom: true,
  adresse: true,
  niu: true,
  telephone: true,
  email: true,
} as const;

function vide(valeur: string | null | undefined): string | null {
  return valeur ? valeur : null;
}

@Injectable()
export class FacturationService {
  constructor(private readonly prisma: PrismaService) {}

  // La facturation concerne toujours le dossier inscrit dans le jeton du gérant
  private dossierDe(utilisateur: ChargeJeton): string {
    if (!utilisateur.dossierId) {
      throw new ForbiddenException('Aucun dossier rattaché à ce compte');
    }
    return utilisateur.dossierId;
  }

  async lireProfil(utilisateur: ChargeJeton): Promise<ProfilEmetteur> {
    const id = this.dossierDe(utilisateur);
    const d = await this.prisma.dossier.findUnique({
      where: { id },
      select: {
        raisonSociale: true,
        regime: true,
        tauxTva: true,
        niu: true,
        rccm: true,
        cabinet: { select: { autonome: true } },
        profilFacturation: true,
      },
    });
    if (!d) throw new NotFoundException('Dossier introuvable');

    const f = d.profilFacturation;
    const fiche: FicheFacturation = {
      formeJuridique: f?.formeJuridique ?? null,
      adresse: f?.adresse ?? null,
      telephone: f?.telephone ?? null,
      email: f?.email ?? null,
      centreImpots: f?.centreImpots ?? null,
      banque: f?.banque ?? null,
      compte: f?.compte ?? null,
      conditionsPaiement: f?.conditionsPaiement ?? null,
      penalitesRetard: f?.penalitesRetard ?? null,
    };

    // Mentions sans lesquelles aucune facture ne pourra être émise
    const manquants: string[] = [];
    if (!d.niu) manquants.push('NIU');
    if (!fiche.adresse) manquants.push('adresse');
    if (!fiche.telephone) manquants.push('téléphone');

    return {
      raisonSociale: d.raisonSociale,
      regime: d.regime,
      tauxTva: d.tauxTva.toNumber(),
      niu: d.niu,
      rccm: d.rccm,
      autonome: d.cabinet.autonome,
      fiche,
      manquants,
    };
  }

  async modifierProfil(
    utilisateur: ChargeJeton,
    dto: ProfilFacturationDto,
  ): Promise<ProfilEmetteur> {
    const id = this.dossierDe(utilisateur);
    const dossier = await this.prisma.dossier.findUnique({
      where: { id },
      select: { cabinetId: true, cabinet: { select: { autonome: true } } },
    });
    if (!dossier) throw new NotFoundException('Dossier introuvable');

    // Chez un cabinet, le NIU et le RCCM du dossier sont tenus par le cabinet
    const fiscal = dto.niu !== undefined || dto.rccm !== undefined;
    if (fiscal && !dossier.cabinet.autonome) {
      throw new ForbiddenException(
        'Votre NIU et votre RCCM sont gérés par votre cabinet comptable',
      );
    }
    if (dto.niu) {
      const doublon = await this.prisma.dossier.findFirst({
        where: {
          AND: [
            { cabinetId: dossier.cabinetId },
            { niu: dto.niu },
            { NOT: { id } },
          ],
        },
        select: { id: true },
      });
      if (doublon) throw new ConflictException('Ce NIU est déjà utilisé');
    }

    const fiche = {
      formeJuridique: vide(dto.formeJuridique),
      adresse: vide(dto.adresse),
      telephone: vide(dto.telephone),
      email: vide(dto.email),
      centreImpots: vide(dto.centreImpots),
      banque: vide(dto.banque),
      compte: vide(dto.compte),
      conditionsPaiement: vide(dto.conditionsPaiement),
      penalitesRetard: vide(dto.penalitesRetard),
    };

    await this.prisma.$transaction(async (tx) => {
      if (fiscal) {
        await tx.dossier.update({
          where: { id },
          data: {
            ...(dto.niu !== undefined ? { niu: vide(dto.niu) } : {}),
            ...(dto.rccm !== undefined ? { rccm: vide(dto.rccm) } : {}),
          },
        });
      }
      await tx.profilFacturation.upsert({
        where: { dossierId: id },
        create: { dossierId: id, ...fiche },
        update: fiche,
      });
    });
    return this.lireProfil(utilisateur);
  }

  listerClients(
    utilisateur: ChargeJeton,
    q?: string,
  ): Promise<ClientFacture[]> {
    const dossierId = this.dossierDe(utilisateur);
    const motCle = (q ?? '').trim().slice(0, 60);
    return this.prisma.clientFacture.findMany({
      where: {
        AND: [
          { dossierId },
          { archive: false },
          motCle
            ? {
                OR: [
                  { nom: { contains: motCle, mode: 'insensitive' } },
                  {
                    niu: { contains: motCle.replace(/\s+/g, '').toUpperCase() },
                  },
                  { telephone: { contains: motCle } },
                ],
              }
            : {},
        ],
      },
      orderBy: { nom: 'asc' },
      take: 200,
      select: CHAMPS_CLIENT,
    });
  }

  async lireClient(
    utilisateur: ChargeJeton,
    id: string,
  ): Promise<ClientFacture> {
    const client = await this.prisma.clientFacture.findFirst({
      where: {
        AND: [
          { id },
          { dossierId: this.dossierDe(utilisateur) },
          { archive: false },
        ],
      },
      select: CHAMPS_CLIENT,
    });
    if (!client) throw new NotFoundException('Client introuvable');
    return client;
  }

  private async verifierNiuLibre(
    dossierId: string,
    niu: string | undefined,
    sauf?: string,
  ): Promise<void> {
    if (!niu) return;
    const doublon = await this.prisma.clientFacture.findFirst({
      where: {
        AND: [
          { dossierId },
          { niu },
          { archive: false },
          ...(sauf ? [{ NOT: { id: sauf } }] : []),
        ],
      },
      select: { id: true },
    });
    if (doublon) throw new ConflictException('Un de vos clients a déjà ce NIU');
  }

  private donneesClient(dto: ClientFactureDto) {
    return {
      nom: dto.nom,
      niu: vide(dto.niu),
      adresse: vide(dto.adresse),
      telephone: vide(dto.telephone),
      email: vide(dto.email),
    };
  }

  async creerClient(
    utilisateur: ChargeJeton,
    dto: ClientFactureDto,
  ): Promise<ClientFacture> {
    const dossierId = this.dossierDe(utilisateur);
    await this.verifierNiuLibre(dossierId, dto.niu);
    return this.prisma.clientFacture.create({
      data: { dossierId, ...this.donneesClient(dto) },
      select: CHAMPS_CLIENT,
    });
  }

  async modifierClient(
    utilisateur: ChargeJeton,
    id: string,
    dto: ClientFactureDto,
  ): Promise<ClientFacture> {
    await this.lireClient(utilisateur, id);
    await this.verifierNiuLibre(this.dossierDe(utilisateur), dto.niu, id);
    return this.prisma.clientFacture.update({
      where: { id },
      data: this.donneesClient(dto),
      select: CHAMPS_CLIENT,
    });
  }

  // Retiré, jamais supprimé : les factures émises le référenceront
  async archiverClient(
    utilisateur: ChargeJeton,
    id: string,
  ): Promise<{ id: string }> {
    await this.lireClient(utilisateur, id);
    await this.prisma.clientFacture.update({
      where: { id },
      data: { archive: true },
    });
    return { id };
  }
}
