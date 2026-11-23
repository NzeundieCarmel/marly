import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { ClientFactureDto, ProfilFacturationDto } from './dto/facturation.dto';
import { FacturationService } from './facturation.service';
import type { ClientFacture, ProfilEmetteur } from './facturation.service';

@Roles('PME')
@Controller('facturation')
export class FacturationController {
  constructor(private readonly service: FacturationService) {}

  @Get('profil')
  profil(
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ProfilEmetteur> {
    return this.service.lireProfil(utilisateur);
  }

  @Put('profil')
  modifierProfil(
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ProfilFacturationDto,
  ): Promise<ProfilEmetteur> {
    return this.service.modifierProfil(utilisateur, dto);
  }

  @Get('clients')
  clients(
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Query('q') q?: string,
  ): Promise<ClientFacture[]> {
    return this.service.listerClients(utilisateur, q);
  }

  @Post('clients')
  creerClient(
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ClientFactureDto,
  ): Promise<ClientFacture> {
    return this.service.creerClient(utilisateur, dto);
  }

  @Get('clients/:id')
  client(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ClientFacture> {
    return this.service.lireClient(utilisateur, id);
  }

  @Put('clients/:id')
  modifierClient(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ClientFactureDto,
  ): Promise<ClientFacture> {
    return this.service.modifierClient(utilisateur, id, dto);
  }

  @Post('clients/:id/archiver')
  @HttpCode(HttpStatus.OK)
  archiver(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<{ id: string }> {
    return this.service.archiverClient(utilisateur, id);
  }
}
