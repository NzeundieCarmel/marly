import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import type { Role, StatutInvitation } from '@prisma/client';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccepterInvitationDto,
  CreerInvitationDto,
} from './dto/invitation.dto';

const DUREE_INVITATION_MS = 7 * 24 * 60 * 60 * 1000;
const FORMAT_JETON = /^[A-Za-z0-9_-]{43}$/;
const LIEN_INVALIDE =
  "Ce lien d'invitation est invalide ou a expiré. Demandez un nouveau lien à votre cabinet.";

const SELECTION = {
  id: true,
  role: true,
  nom: true,
  telephone: true,
  email: true,
  statut: true,
  expireLe: true,
  creeLe: true,
  accepteeLe: true,
  dossierId: true,
} as const;

export interface ResumeInvitation {
  id: string;
  role: Role;
  nom: string;
  telephone: string | null;
  email: string | null;
  statut: StatutInvitation;
  expiree: boolean;
  expireLe: Date;
  creeLe: Date;
  accepteeLe: Date | null;
  dossierId: string | null;
}

export interface InvitationAvecLien extends ResumeInvitation {
  // Code du lien, renvoyé une seule fois : la base n'en garde que l'empreinte
  jeton: string;
}

export interface Acces {
  membres: { id: string; nom: string; email: string | null; role: Role }[];
  invitations: ResumeInvitation[];
}

function hacher(brut: string): string {
  return createHash('sha256').update(brut).digest('hex');
}

function nouveauJeton(): { brut: string; hache: string } {
  const brut = randomBytes(32).toString('base64url');
  return { brut, hache: hacher(brut) };
}

function resumer(
  invitation: Prisma.InvitationGetPayload<{ select: typeof SELECTION }>,
): ResumeInvitation {
  return {
    ...invitation,
    expiree:
      invitation.statut === 'EN_ATTENTE' &&
      invitation.expireLe.getTime() < Date.now(),
  };
}

@Injectable()
export class InvitationsService {
  private readonly dureeSecondes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.dureeSecondes = Number(config.get('JWT_DUREE_SECONDES') ?? 28800);
  }

  // ----- Côté cabinet -----

  async creer(
    dto: CreerInvitationDto,
    utilisateur: ChargeJeton,
  ): Promise<InvitationAvecLien> {
    if (dto.role === 'COMPTABLE' && utilisateur.role !== 'RESPONSABLE') {
      throw new ForbiddenException(
        'Seul le responsable du cabinet peut inviter un collaborateur',
      );
    }

    let dossierId: string | null = null;
    if (dto.role === 'PME') {
      if (!dto.dossierId) {
        throw new NotFoundException('Dossier introuvable');
      }
      const dossier = await this.prisma.dossier.findFirst({
        where: {
          AND: [{ id: dto.dossierId }, { cabinetId: utilisateur.cabinetId }],
        },
        select: { id: true },
      });
      if (!dossier) {
        throw new NotFoundException('Dossier introuvable');
      }
      dossierId = dossier.id;
    }

    if (dto.email) {
      const pris = await this.prisma.utilisateur.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      if (pris) {
        throw new ConflictException(
          'Un compte Marly utilise déjà cette adresse e-mail',
        );
      }
    }

    const { brut, hache } = nouveauJeton();
    const invitation = await this.prisma.invitation.create({
      data: {
        cabinetId: utilisateur.cabinetId,
        dossierId,
        role: dto.role,
        nom: dto.nom,
        telephone: dto.telephone ?? null,
        email: dto.email ?? null,
        jetonHache: hache,
        expireLe: new Date(Date.now() + DUREE_INVITATION_MS),
        creeParId: utilisateur.sub,
      },
      select: SELECTION,
    });
    return { ...resumer(invitation), jeton: brut };
  }

  async lister(utilisateur: ChargeJeton, dossierId?: string): Promise<Acces> {
    if (dossierId) {
      const dossier = await this.prisma.dossier.findFirst({
        where: {
          AND: [{ id: dossierId }, { cabinetId: utilisateur.cabinetId }],
        },
        select: { id: true },
      });
      if (!dossier) {
        throw new NotFoundException('Dossier introuvable');
      }
      const [membres, invitations] = await Promise.all([
        this.prisma.utilisateur.findMany({
          where: { AND: [{ dossierId: dossier.id }, { role: 'PME' }] },
          select: { id: true, nom: true, email: true, role: true },
          orderBy: { creeLe: 'asc' },
        }),
        this.prisma.invitation.findMany({
          where: {
            AND: [{ dossierId: dossier.id }, { statut: { not: 'ANNULEE' } }],
          },
          select: SELECTION,
          orderBy: { creeLe: 'desc' },
          take: 20,
        }),
      ]);
      return { membres, invitations: invitations.map(resumer) };
    }

    // Sans dossier : l'équipe du cabinet
    const [membres, invitations] = await Promise.all([
      this.prisma.utilisateur.findMany({
        where: {
          AND: [
            { cabinetId: utilisateur.cabinetId },
            { role: { in: ['RESPONSABLE', 'COMPTABLE'] } },
          ],
        },
        select: { id: true, nom: true, email: true, role: true },
        orderBy: { creeLe: 'asc' },
      }),
      this.prisma.invitation.findMany({
        where: {
          AND: [
            { cabinetId: utilisateur.cabinetId },
            { role: 'COMPTABLE' },
            { statut: { not: 'ANNULEE' } },
          ],
        },
        select: SELECTION,
        orderBy: { creeLe: 'desc' },
        take: 20,
      }),
    ]);
    return { membres, invitations: invitations.map(resumer) };
  }

  private async invitationDuCabinet(id: string, utilisateur: ChargeJeton) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { AND: [{ id }, { cabinetId: utilisateur.cabinetId }] },
      select: { id: true, role: true, statut: true },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation introuvable');
    }
    if (invitation.role === 'COMPTABLE' && utilisateur.role !== 'RESPONSABLE') {
      throw new ForbiddenException(
        'Seul le responsable du cabinet gère les collaborateurs',
      );
    }
    if (invitation.statut !== 'EN_ATTENTE') {
      throw new ConflictException("Cette invitation n'est plus en attente");
    }
    return invitation;
  }

  async annuler(
    id: string,
    utilisateur: ChargeJeton,
  ): Promise<ResumeInvitation> {
    await this.invitationDuCabinet(id, utilisateur);
    const invitation = await this.prisma.invitation.update({
      where: { id },
      data: { statut: 'ANNULEE' },
      select: SELECTION,
    });
    return resumer(invitation);
  }

  // Nouveau lien, nouveau délai de 7 jours : l'ancien lien ne marche plus
  async renouveler(
    id: string,
    utilisateur: ChargeJeton,
  ): Promise<InvitationAvecLien> {
    await this.invitationDuCabinet(id, utilisateur);
    const { brut, hache } = nouveauJeton();
    const invitation = await this.prisma.invitation.update({
      where: { id },
      data: {
        jetonHache: hache,
        expireLe: new Date(Date.now() + DUREE_INVITATION_MS),
      },
      select: SELECTION,
    });
    return { ...resumer(invitation), jeton: brut };
  }

  // ----- Côté invité (pages publiques) -----

  private async invitationValide(brut: string) {
    if (!FORMAT_JETON.test(brut)) {
      throw new NotFoundException(LIEN_INVALIDE);
    }
    const invitation = await this.prisma.invitation.findUnique({
      where: { jetonHache: hacher(brut) },
      include: {
        cabinet: { select: { nom: true } },
        dossier: { select: { raisonSociale: true } },
      },
    });
    if (
      !invitation ||
      invitation.statut !== 'EN_ATTENTE' ||
      invitation.expireLe.getTime() < Date.now()
    ) {
      throw new NotFoundException(LIEN_INVALIDE);
    }
    return invitation;
  }

  async consulter(brut: string) {
    const invitation = await this.invitationValide(brut);
    return {
      nom: invitation.nom,
      email: invitation.email,
      role: invitation.role,
      cabinet: invitation.cabinet.nom,
      dossier: invitation.dossier?.raisonSociale ?? null,
      expireLe: invitation.expireLe,
    };
  }

  async accepter(
    brut: string,
    dto: AccepterInvitationDto,
  ): Promise<{ jeton: string; role: Role }> {
    const invitation = await this.invitationValide(brut);

    const pris = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (pris) {
      throw new ConflictException(
        'Un compte Marly utilise déjà cette adresse e-mail',
      );
    }

    const motDePasseHache = await hash(dto.motDePasse, 10);

    let utilisateur: {
      id: string;
      role: Role;
      cabinetId: string;
      dossierId: string | null;
    };
    try {
      utilisateur = await this.prisma.$transaction(async (tx) => {
        // Le lien ne sert qu'une fois, même si deux personnes cliquent en même temps
        const maj = await tx.invitation.updateMany({
          where: {
            id: invitation.id,
            statut: 'EN_ATTENTE',
            expireLe: { gt: new Date() },
          },
          data: { statut: 'ACCEPTEE', accepteeLe: new Date() },
        });
        if (maj.count !== 1) {
          throw new NotFoundException(LIEN_INVALIDE);
        }
        return tx.utilisateur.create({
          data: {
            nom: invitation.nom,
            email: dto.email,
            motDePasseHache,
            role: invitation.role,
            cabinetId: invitation.cabinetId,
            dossierId: invitation.dossierId,
          },
          select: { id: true, role: true, cabinetId: true, dossierId: true },
        });
      });
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un compte Marly utilise déjà cette adresse e-mail',
        );
      }
      throw erreur;
    }

    const jeton = await this.jwt.signAsync(
      {
        sub: utilisateur.id,
        role: utilisateur.role,
        cabinetId: utilisateur.cabinetId,
        dossierId: utilisateur.dossierId,
      },
      { expiresIn: this.dureeSecondes },
    );
    return { jeton, role: utilisateur.role };
  }
}
