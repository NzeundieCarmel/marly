import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { ChargeJeton, RoleMarly } from './auth.service';
import { CLE_ROUTE_PUBLIQUE } from './public.decorator';
import { CLE_ROLES } from './roles.decorator';

export interface RequeteAuthentifiee extends Request {
  utilisateur?: ChargeJeton;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const cibles = [contexte.getHandler(), contexte.getClass()];

    const estPublique = this.reflector.getAllAndOverride<boolean>(
      CLE_ROUTE_PUBLIQUE,
      cibles,
    );
    if (estPublique) {
      return true;
    }

    const requete = contexte.switchToHttp().getRequest<RequeteAuthentifiee>();
    const [type, jeton] = requete.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !jeton) {
      throw new UnauthorizedException('Connexion requise');
    }

    let utilisateur: ChargeJeton;
    try {
      utilisateur = await this.jwt.verifyAsync<ChargeJeton>(jeton);
    } catch {
      throw new UnauthorizedException('Session expiree ou invalide');
    }
    requete.utilisateur = utilisateur;

    // Rôles exigés par la route, s'il y en a
    const roles = this.reflector.getAllAndOverride<RoleMarly[] | undefined>(
      CLE_ROLES,
      cibles,
    );
    if (roles && !roles.includes(utilisateur.role)) {
      throw new ForbiddenException('Action reservee au cabinet');
    }
    return true;
  }
}