import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type {
  ChargeJeton,
  ProfilUtilisateur,
  ReponseConnexion,
} from './auth.service';
import { ConnexionDto } from './dto/connexion.dto';
import { Public } from './public.decorator';
import { UtilisateurCourant } from './utilisateur-courant.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('connexion')
  @HttpCode(HttpStatus.OK)
  connecter(@Body() dto: ConnexionDto): Promise<ReponseConnexion> {
    return this.auth.connecter(dto);
  }

  // Révoque toutes les sessions du compte, y compris celle qui fait la demande
  @Post('deconnexion-partout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deconnecterPartout(
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<void> {
    await this.auth.deconnecterPartout(utilisateur.sub);
  }

  @Get('moi')
  moi(
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ProfilUtilisateur> {
    return this.auth.profil(utilisateur.sub);
  }
}
