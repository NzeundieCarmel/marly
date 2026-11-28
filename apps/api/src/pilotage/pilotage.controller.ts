import { Controller, Get, Param } from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { PilotageService } from './pilotage.service';

@Controller('dossiers/:dossierId/pilotage')
export class PilotageController {
  constructor(private readonly pilotage: PilotageService) {}

  @Get()
  lire(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.pilotage.lire(dossierId, utilisateur);
  }
}
