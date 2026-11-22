import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatutRattachement } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { DemanderRattachementDto } from './dto/rattachement.dto';

export interface Comptable {
  id: string;
  nom: string;
  ville: string | null;
}

export interface MonRattachement {
  id: string;
  statut: StatutRattachement;
  cabinet: string;
  message: string | null;
  creeLe: Date;
  traiteeLe: Date | null;
}

export interface RattachementRecu {
  id: string;
  message: string | null;
  creeLe: Date;
  dossier: {
    id: string;
    raisonSociale: string;
    regime: 'REEL' | 'IGS';
    nbPieces: number;
  };
  gerant: { nom: string; email: string | null };
}

const DEJA_TRAITEE = 'Cette demande est déjà traitée';
const EN_COURS = 'Une demande est déjà en cours';

@Injectable()
export class RattachementsService {
  constructor(private readonly prisma: PrismaService) {}

  // Annuaire : seuls les cabinets que Marly a marqués partenaires
  comptables(): Promise<Comptable[]> {
    return this.prisma.cabinet.findMany({
      where: { partenaire: true, autonome: false },
      select: { id: true, nom: true, ville: true },
      orderBy: { nom: 'asc' },
    });
  }

  // Dernière demande de l'entreprise (objet enveloppé : Nest renverrait un corps vide pour null)
  async mienne(
    utilisateur: ChargeJeton,
  ): Promise<{ demande: MonRattachement | null }> {
    if (!utilisateur.dossierId) return { demande: null };
    const d = await this.prisma.demandeRattachement.findFirst({
      where: { dossierId: utilisateur.dossierId },
      orderBy: { creeLe: 'desc' },
      include: { cabinet: { select: { nom: true } } },
    });
    return {
      demande: d
        ? {
            id: d.id,
            statut: d.statut,
            cabinet: d.cabinet.nom,
            message: d.message,
            creeLe: d.creeLe,
            traiteeLe: d.traiteeLe,
          }
        : null,
    };
  }

  async demander(
    utilisateur: ChargeJeton,
    dto: DemanderRattachementDto,
  ): Promise<{ demande: MonRattachement | null }> {
    const dossierId = utilisateur.dossierId;
    if (!dossierId) {
      throw new ForbiddenException('Aucun dossier rattaché à ce compte');
    }
    try {
      // Sérialisable : deux demandes envoyées en même temps ne passent pas toutes les deux
      await this.prisma.$transaction(
        async (tx) => {
          const dossier = await tx.dossier.findUnique({
            where: { id: dossierId },
            select: { cabinet: { select: { autonome: true } } },
          });
          if (!dossier) throw new NotFoundException('Dossier introuvable');
          if (!dossier.cabinet.autonome) {
            throw new ConflictException(
              'Votre entreprise est déjà suivie par un cabinet',
            );
          }
          const cabinet = await tx.cabinet.findFirst({
            where: {
              AND: [
                { id: dto.cabinetId },
                { partenaire: true },
                { autonome: false },
              ],
            },
            select: { id: true },
          });
          if (!cabinet) throw new NotFoundException('Cabinet introuvable');
          const enCours = await tx.demandeRattachement.findFirst({
            where: { dossierId, statut: StatutRattachement.EN_ATTENTE },
            select: { id: true },
          });
          if (enCours) throw new ConflictException(EN_COURS);
          await tx.demandeRattachement.create({
            data: {
              dossierId,
              cabinetId: cabinet.id,
              message: dto.message || null,
              creeParId: utilisateur.sub,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2034'
      ) {
        throw new ConflictException(EN_COURS);
      }
      throw erreur;
    }
    return this.mienne(utilisateur);
  }

  async annuler(
    id: string,
    utilisateur: ChargeJeton,
  ): Promise<{ demande: MonRattachement | null }> {
    const dossierId = utilisateur.dossierId ?? 'aucun-dossier';
    const maj = await this.prisma.demandeRattachement.updateMany({
      where: {
        AND: [{ id }, { dossierId }, { statut: StatutRattachement.EN_ATTENTE }],
      },
      data: { statut: StatutRattachement.ANNULEE, traiteeLe: new Date() },
    });
    if (maj.count === 0) {
      const existe = await this.prisma.demandeRattachement.findFirst({
        where: { AND: [{ id }, { dossierId }] },
        select: { id: true },
      });
      if (!existe) throw new NotFoundException('Demande introuvable');
      throw new ConflictException(DEJA_TRAITEE);
    }
    return this.mienne(utilisateur);
  }

  // Demandes en attente adressées au cabinet : aucune pièce n'est montrée avant l'accord
  async recues(utilisateur: ChargeJeton): Promise<RattachementRecu[]> {
    const liste = await this.prisma.demandeRattachement.findMany({
      where: {
        cabinetId: utilisateur.cabinetId,
        statut: StatutRattachement.EN_ATTENTE,
      },
      orderBy: { creeLe: 'asc' },
      include: {
        dossier: {
          select: {
            id: true,
            raisonSociale: true,
            regime: true,
            _count: { select: { pieces: true } },
          },
        },
        creePar: { select: { nom: true, email: true } },
      },
    });
    return liste.map((d) => ({
      id: d.id,
      message: d.message,
      creeLe: d.creeLe,
      dossier: {
        id: d.dossier.id,
        raisonSociale: d.dossier.raisonSociale,
        regime: d.dossier.regime,
        nbPieces: d.dossier._count.pieces,
      },
      gerant: { nom: d.creePar.nom, email: d.creePar.email },
    }));
  }

  // Accepter : le dossier et son gérant passent au cabinet, d'un seul coup
  async traiter(
    id: string,
    utilisateur: ChargeJeton,
    accepter: boolean,
  ): Promise<{ id: string; statut: StatutRattachement }> {
    return this.prisma.$transaction(async (tx) => {
      const demande = await tx.demandeRattachement.findFirst({
        where: { AND: [{ id }, { cabinetId: utilisateur.cabinetId }] },
        select: {
          statut: true,
          dossierId: true,
          cabinetId: true,
          dossier: { select: { cabinet: { select: { autonome: true } } } },
        },
      });
      if (!demande) throw new NotFoundException('Demande introuvable');
      if (demande.statut !== StatutRattachement.EN_ATTENTE) {
        throw new ConflictException(DEJA_TRAITEE);
      }
      if (accepter && !demande.dossier.cabinet.autonome) {
        throw new ConflictException(
          'Cette entreprise est déjà suivie par un cabinet',
        );
      }

      const statut = accepter
        ? StatutRattachement.ACCEPTEE
        : StatutRattachement.REFUSEE;
      // Deux décisions au même moment : seule la première passe
      const maj = await tx.demandeRattachement.updateMany({
        where: { id, statut: StatutRattachement.EN_ATTENTE },
        data: { statut, traiteParId: utilisateur.sub, traiteeLe: new Date() },
      });
      if (maj.count !== 1) throw new ConflictException(DEJA_TRAITEE);

      if (accepter) {
        await tx.dossier.update({
          where: { id: demande.dossierId },
          data: { cabinetId: demande.cabinetId },
        });
        await tx.utilisateur.updateMany({
          where: { dossierId: demande.dossierId, role: 'PME' },
          data: { cabinetId: demande.cabinetId },
        });
      }
      return { id, statut };
    });
  }
}
