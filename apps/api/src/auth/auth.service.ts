import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ConnexionDto } from './dto/connexion.dto';

export type RoleMarly = 'RESPONSABLE' | 'COMPTABLE' | 'PME' | 'ADMIN';

export interface ChargeJeton {
  sub: string;
  role: RoleMarly;
  cabinetId: string;
  dossierId: string | null;
}

export interface ReponseConnexion {
  jeton: string;
  utilisateur: { id: string; nom: string; role: RoleMarly };
}

export interface ProfilUtilisateur {
  id: string;
  nom: string;
  email: string | null;
  role: RoleMarly;
  cabinet: string;
  dossier: { id: string; raisonSociale: string } | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async connecter(dto: ConnexionDto): Promise<ReponseConnexion> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const motDePasseValide =
      utilisateur !== null &&
      (await compare(dto.motDePasse, utilisateur.motDePasseHache));

    // Même message dans les deux cas : on ne révèle jamais si l'e-mail existe
    if (!utilisateur || !motDePasseValide) {
      throw new UnauthorizedException('E-mail ou mot de passe incorrect');
    }

    const charge: ChargeJeton = {
      sub: utilisateur.id,
      role: utilisateur.role,
      cabinetId: utilisateur.cabinetId,
      dossierId: utilisateur.dossierId,
    };

    return {
      jeton: await this.jwt.signAsync(charge),
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        role: utilisateur.role,
      },
    };
  }

  async profil(id: string): Promise<ProfilUtilisateur> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: {
        cabinet: { select: { nom: true } },
        dossier: { select: { id: true, raisonSociale: true } },
      },
    });

    if (!utilisateur) {
      throw new UnauthorizedException('Compte introuvable');
    }

    return {
      id: utilisateur.id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role,
      cabinet: utilisateur.cabinet.nom,
      dossier: utilisateur.dossier,
    };
  }
}