import { Controller, Get } from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { TableauDeBordService } from './tableau-de-bord.service';
import type { TableauDeBord } from './tableau-de-bord.service';

@Controller('tableau-de-bord')
export class TableauDeBordController {
  constructor(private readonly service: TableauDeBordService) {}

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Get()
  lire(@UtilisateurCourant() utilisateur: ChargeJeton): Promise<TableauDeBord> {
    return this.service.lire(utilisateur);
  }
}
