import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { ChargeJeton } from './auth.service';
import type { RequeteAuthentifiee } from './jwt-auth.guard';

export const UtilisateurCourant = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): ChargeJeton => {
    const requete = contexte.switchToHttp().getRequest<RequeteAuthentifiee>();
    if (!requete.utilisateur) {
      throw new UnauthorizedException('Connexion requise');
    }
    return requete.utilisateur;
  },
);