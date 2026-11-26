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
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { ReglementDto } from './dto/reglement.dto';
import { ReglementsService } from './reglements.service';
import type { Paiement, ResumePaiement } from './reglements.service';

@Roles('PME')
@Controller('facturation')
export class ReglementsController {
  constructor(private readonly service: ReglementsService) {}

  @Get('paiements')
  lister(
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ResumePaiement[]> {
    return this.service.lister(utilisateur);
  }

  @Get('factures/:id/paiement')
  lire(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<Paiement> {
    return this.service.lire(utilisateur, id);
  }

  @Post('factures/:id/reglements')
  enregistrer(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ReglementDto,
  ): Promise<Paiement> {
    return this.service.enregistrer(utilisateur, id, dto);
  }

  @Post('factures/:id/reglements/:reglementId/supprimer')
  @HttpCode(HttpStatus.OK)
  supprimer(
    @Param('id') id: string,
    @Param('reglementId') reglementId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<Paiement> {
    return this.service.supprimer(utilisateur, id, reglementId);
  }

  @Post('factures/:id/relance')
  @HttpCode(HttpStatus.OK)
  relancer(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<Paiement> {
    return this.service.relancer(utilisateur, id);
  }
}
