import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { CaisseService } from './caisse.service';
import { ClotureDto, OuvertureDto, VenteDto } from './dto/caisse.dto';

@Controller('dossiers/:dossierId/caisse')
export class CaisseController {
  constructor(private readonly caisse: CaisseService) {}

  @Get('session')
  session(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.caisse.session(dossierId, utilisateur);
  }

  @Post('session/ouverture')
  ouvrir(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: OuvertureDto,
  ) {
    return this.caisse.ouvrir(dossierId, utilisateur, dto);
  }

  @Post('session/cloture')
  @HttpCode(HttpStatus.OK)
  fermer(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ClotureDto,
  ) {
    return this.caisse.fermer(dossierId, utilisateur, dto);
  }

  @Post('ventes')
  vendre(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: VenteDto,
  ) {
    return this.caisse.vendre(dossierId, utilisateur, dto);
  }

  @Get('ventes')
  ventes(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.caisse.ventes(dossierId, utilisateur);
  }

  @Get('ventes/:id')
  ticket(
    @Param('dossierId') dossierId: string,
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.caisse.ticket(dossierId, id, utilisateur);
  }
}
