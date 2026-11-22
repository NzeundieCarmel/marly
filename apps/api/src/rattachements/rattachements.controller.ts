import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { StatutRattachement } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { DemanderRattachementDto } from './dto/rattachement.dto';
import { RattachementsService } from './rattachements.service';
import type {
  Comptable,
  MonRattachement,
  RattachementRecu,
} from './rattachements.service';

@Controller()
export class RattachementsController {
  constructor(private readonly service: RattachementsService) {}

  // Côté entreprise
  @Roles('PME')
  @Get('comptables')
  comptables(): Promise<Comptable[]> {
    return this.service.comptables();
  }

  @Roles('PME')
  @Get('rattachements/mien')
  mien(
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<{ demande: MonRattachement | null }> {
    return this.service.mienne(utilisateur);
  }

  @Roles('PME')
  @Post('rattachements')
  demander(
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: DemanderRattachementDto,
  ): Promise<{ demande: MonRattachement | null }> {
    return this.service.demander(utilisateur, dto);
  }

  @Roles('PME')
  @Post('rattachements/:id/annuler')
  @HttpCode(HttpStatus.OK)
  annuler(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<{ demande: MonRattachement | null }> {
    return this.service.annuler(id, utilisateur);
  }

  // Côté cabinet : toute l'équipe voit les demandes, seul le responsable décide
  @Roles('RESPONSABLE', 'COMPTABLE')
  @Get('rattachements')
  recues(
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<RattachementRecu[]> {
    return this.service.recues(utilisateur);
  }

  @Roles('RESPONSABLE')
  @Post('rattachements/:id/accepter')
  @HttpCode(HttpStatus.OK)
  accepter(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<{ id: string; statut: StatutRattachement }> {
    return this.service.traiter(id, utilisateur, true);
  }

  @Roles('RESPONSABLE')
  @Post('rattachements/:id/refuser')
  @HttpCode(HttpStatus.OK)
  refuser(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<{ id: string; statut: StatutRattachement }> {
    return this.service.traiter(id, utilisateur, false);
  }
}
