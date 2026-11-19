import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { CreerDossierDto, ModifierDossierDto } from './dto/dossier.dto';
import { GestionDossiersService } from './gestion-dossiers.service';
import type { FicheDossier } from './gestion-dossiers.service';

@Controller('dossiers')
export class GestionDossiersController {
  constructor(private readonly service: GestionDossiersService) {}

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post()
  creer(
    @Body() dto: CreerDossierDto,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<FicheDossier> {
    return this.service.creer(dto, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Get(':id')
  lire(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<FicheDossier> {
    return this.service.lire(id, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body() dto: ModifierDossierDto,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<FicheDossier> {
    return this.service.modifier(id, dto, utilisateur);
  }
}
