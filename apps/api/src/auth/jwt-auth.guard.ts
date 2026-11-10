import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { ChargeJeton } from './auth.service';
import { CLE_ROUTE_PUBLIQUE } from './public.decorator';

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
    const estPublique = this.reflector.getAllAndOverride<boolean>(
      CLE_ROUTE_PUBLIQUE,
      [contexte.getHandler(), contexte.getClass()],
    );
    if (estPublique) {
      return true;
    }

    const requete = contexte.switchToHttp().getRequest<RequeteAuthentifiee>();
    const [type, jeton] = requete.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !jeton) {
      throw new UnauthorizedException('Connexion requise');
    }

    try {
      requete.utilisateur = await this.jwt.verifyAsync<ChargeJeton>(jeton);
    } catch {
      throw new UnauthorizedException('Session expiree ou invalide');
    }
    return true;
  }
}