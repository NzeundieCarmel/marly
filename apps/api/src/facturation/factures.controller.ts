import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { FactureDto } from './dto/facture.dto';
import { FacturesService } from './factures.service';
import type { FactureDetail, FactureResume } from './factures.service';

@Roles('PME')
@Controller('facturation/factures')
export class FacturesController {
  constructor(private readonly service: FacturesService) {}

  @Get()
  lister(
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<FactureResume[]> {
    return this.service.lister(utilisateur);
  }

  @Post()
  creer(
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: FactureDto,
  ): Promise<FactureDetail> {
    return this.service.creer(utilisateur, dto);
  }

  @Get(':id')
  lire(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<FactureDetail> {
    return this.service.lire(utilisateur, id);
  }

  @Put(':id')
  modifier(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: FactureDto,
  ): Promise<FactureDetail> {
    return this.service.modifier(utilisateur, id, dto);
  }

  @Post(':id/supprimer')
  @HttpCode(HttpStatus.OK)
  supprimer(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<{ id: string }> {
    return this.service.supprimer(utilisateur, id);
  }

  @Post(':id/emettre')
  @HttpCode(HttpStatus.OK)
  emettre(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<FactureDetail> {
    return this.service.emettre(utilisateur, id);
  }

  @Post(':id/avoir')
  @HttpCode(HttpStatus.OK)
  avoir(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<FactureDetail> {
    return this.service.creerAvoir(utilisateur, id);
  }

  @Post(':id/partage')
  @HttpCode(HttpStatus.OK)
  partager(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<{ jeton: string }> {
    return this.service.partager(utilisateur, id);
  }

  @Post(':id/partage/desactiver')
  @HttpCode(HttpStatus.OK)
  desactiverPartage(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<{ id: string }> {
    return this.service.desactiverPartage(utilisateur, id);
  }
}
