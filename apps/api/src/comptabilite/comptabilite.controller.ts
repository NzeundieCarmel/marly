import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { ComptabiliteService } from './comptabilite.service';
import type { DetailPiece } from './comptabilite.service';
import { ValiderPieceDto } from './dto/valider-piece.dto';

@Controller('pieces')
export class ComptabiliteController {
  constructor(private readonly compta: ComptabiliteService) {}

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Get(':id')
  detail(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ): Promise<DetailPiece> {
    return this.compta.detail(id, utilisateur);
  }

  @Get(':id/fichier')
  async fichier(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<StreamableFile> {
    const { chemin, type } = await this.compta.fichier(id, utilisateur);
    reponse.set({
      'Content-Type': type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(chemin));
  }

  @Roles('RESPONSABLE', 'COMPTABLE')
  @Post(':id/valider')
  @HttpCode(HttpStatus.OK)
  valider(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ValiderPieceDto,
  ): Promise<DetailPiece> {
    return this.compta.valider(id, utilisateur, dto);
  }
}