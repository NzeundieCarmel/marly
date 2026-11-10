import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Piece } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { DossiersService } from './dossiers.service';
import type { ResumeDossier } from './dossiers.service';
import { CreerPieceDto } from './dto/creer-piece.dto';
import { PiecesService, TAILLE_MAX_OCTETS } from './pieces.service';
import type { FichierRecu } from './pieces.service';

@Controller('dossiers')
export class DossiersController {
  constructor(
    private readonly dossiers: DossiersService,
    private readonly piecesService: PiecesService,
  ) {}

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

  @Post(':id/pieces')
  @UseInterceptors(
    FileInterceptor('fichier', {
      limits: { fileSize: TAILLE_MAX_OCTETS, files: 1 },
    }),
  )
  creerPiece(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: CreerPieceDto,
    @UploadedFile() fichier: FichierRecu | undefined,
  ): Promise<Piece> {
    return this.piecesService.creer(id, utilisateur, dto, fichier);
  }
}