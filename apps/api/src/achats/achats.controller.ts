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
import { AchatsService } from './achats.service';
import { AchatDto } from './dto/achat.dto';

@Controller('dossiers/:dossierId/achats')
export class AchatsController {
  constructor(private readonly achats: AchatsService) {}

  @Get()
  lister(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.achats.lister(dossierId, utilisateur);
  }

  @Post()
  creer(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: AchatDto,
  ) {
    return this.achats.creer(dossierId, utilisateur, dto);
  }

  @Get(':id')
  detail(
    @Param('dossierId') dossierId: string,
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.achats.detail(dossierId, id, utilisateur);
  }

  @Post(':id/annuler')
  @HttpCode(HttpStatus.OK)
  annuler(
    @Param('dossierId') dossierId: string,
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.achats.annuler(dossierId, id, utilisateur);
  }
}
