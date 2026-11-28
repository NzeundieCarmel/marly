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
import { DevisService } from './devis.service';
import { DevisDto, StatutDevisDto } from './dto/devis.dto';

@Roles('PME')
@Controller('facturation/devis')
export class DevisController {
  constructor(private readonly service: DevisService) {}

  @Get()
  lister(@UtilisateurCourant() utilisateur: ChargeJeton) {
    return this.service.lister(utilisateur);
  }

  @Post()
  creer(@UtilisateurCourant() utilisateur: ChargeJeton, @Body() dto: DevisDto) {
    return this.service.creer(utilisateur, dto);
  }

  @Get(':id')
  lire(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.service.lire(utilisateur, id);
  }

  @Put(':id')
  modifier(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: DevisDto,
  ) {
    return this.service.modifier(utilisateur, id, dto);
  }

  @Post(':id/statut')
  @HttpCode(HttpStatus.OK)
  statut(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: StatutDevisDto,
  ) {
    return this.service.changerStatut(utilisateur, id, dto);
  }

  @Post(':id/facture')
  @HttpCode(HttpStatus.OK)
  transformer(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.service.transformer(utilisateur, id);
  }

  @Post(':id/supprimer')
  @HttpCode(HttpStatus.OK)
  supprimer(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.service.supprimer(utilisateur, id);
  }
}
