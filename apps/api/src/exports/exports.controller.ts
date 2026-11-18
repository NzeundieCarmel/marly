import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { ExportsService } from './exports.service';
import type { ApercuExport, ResumeLot } from './exports.service';

@Controller()
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Get('dossiers/:id/exports/apercu')
  apercu(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ApercuExport> {
    return this.service.apercu(id, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Get('dossiers/:id/exports')
  lister(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ResumeLot[]> {
    return this.service.lister(id, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post('dossiers/:id/exports')
  creer(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<ResumeLot> {
    return this.service.creer(id, utilisateur);
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Get('exports/:id/fichier')
  async fichier(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<StreamableFile> {
    const { nom, contenu } = await this.service.fichier(id, utilisateur);
    reponse.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nom}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(Buffer.from(contenu, 'utf8'));
  }
}
