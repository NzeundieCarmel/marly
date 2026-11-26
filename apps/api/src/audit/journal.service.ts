import { Injectable, NotFoundException } from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

export interface EntreeJournal {
  id: string;
  creeLe: Date;
  nomUtilisateur: string;
  role: string;
  action: string;
  cible: string | null;
  ip: string | null;
  dossierId: string | null;
  dossier: string | null;
}

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  // Les actions du cabinet et celles faites sur ses dossiers, jamais au-delà
  async lister(
    utilisateur: ChargeJeton,
    dossierId?: string,
  ): Promise<EntreeJournal[]> {
    const dossiers = await this.prisma.dossier.findMany({
      where: { cabinetId: utilisateur.cabinetId },
      select: { id: true, raisonSociale: true },
    });
    const ids = dossiers.map((d) => d.id);
    if (dossierId && !ids.includes(dossierId))
      throw new NotFoundException('Dossier introuvable');

    const entrees = await this.prisma.journalAudit.findMany({
      where: dossierId
        ? { dossierId }
        : {
            OR: [
              { cabinetId: utilisateur.cabinetId },
              { dossierId: { in: ids } },
            ],
          },
      orderBy: { creeLe: 'desc' },
      take: 300,
    });
    const noms = new Map(dossiers.map((d) => [d.id, d.raisonSociale]));
    return entrees.map((e) => ({
      id: e.id,
      creeLe: e.creeLe,
      nomUtilisateur: e.nomUtilisateur,
      role: e.role,
      action: e.action,
      cible: e.cible,
      ip: e.ip,
      dossierId: e.dossierId,
      dossier: e.dossierId ? (noms.get(e.dossierId) ?? null) : null,
    }));
  }
}
