import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import {
  AccepterInvitationDto,
  CreerInvitationDto,
} from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';
import type {
  Acces,
  InvitationAvecLien,
  ResumeInvitation,
} from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post()
  creer(
    @Body() dto: CreerInvitationDto,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<InvitationAvecLien> {
    return this.service.creer(dto, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Get()
  lister(
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Query('dossierId') dossierId?: string,
  ): Promise<Acces> {
    return this.service.lister(utilisateur, dossierId);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post(':id/annuler')
  @HttpCode(HttpStatus.OK)
  annuler(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ResumeInvitation> {
    return this.service.annuler(id, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post(':id/renouveler')
  @HttpCode(HttpStatus.OK)
  renouveler(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<InvitationAvecLien> {
    return this.service.renouveler(id, utilisateur);
  }

  @Public()
  @Get('lien/:jeton')
  consulter(@Param('jeton') jeton: string) {
    return this.service.consulter(jeton);
  }

  @Public()
  @Post('lien/:jeton/accepter')
  @HttpCode(HttpStatus.OK)
  accepter(
    @Param('jeton') jeton: string,
    @Body() dto: AccepterInvitationDto,
  ): Promise<{ jeton: string; role: Role }> {
    return this.service.accepter(jeton, dto);
  }
}
