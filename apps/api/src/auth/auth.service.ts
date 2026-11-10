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
}