import { Controller, Get, Param } from '@nestjs/common';
import type { Piece } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { DossiersService } from './dossiers.service';
import type { ResumeDossier } from './dossiers.service';

@Controller('dossiers')
export class DossiersController {
  constructor(private readonly dossiers: DossiersService) {}

  @Get()
  lister(
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ResumeDossier[]> {
    return this.dossiers.lister(utilisateur);
  }

  @Get(':id/pieces')
  pieces(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<Piece[]> {
    return this.dossiers.pieces(id, utilisateur);
  }
}