import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { DemandePiece } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { DemandesService } from './demandes.service';
import { ACompleterDto, CreerDemandeDto } from './dto/demande.dto';

@Controller()
export class DemandesController {
  constructor(private readonly demandes: DemandesService) {}

  @Get('dossiers/:id/demandes')
  lister(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<DemandePiece[]> {
    return this.demandes.lister(id, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post('dossiers/:id/demandes')
  creer(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: CreerDemandeDto,
  ): Promise<DemandePiece> {
    return this.demandes.creer(id, utilisateur, dto);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post('demandes/:id/annuler')
  @HttpCode(HttpStatus.OK)
  annuler(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<DemandePiece> {
    return this.demandes.annuler(id, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post('pieces/:id/a-completer')
  @HttpCode(HttpStatus.OK)
  aCompleter(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ACompleterDto,
  ): Promise<DemandePiece> {
    return this.demandes.marquerACompleter(id, utilisateur, dto);
  }
}