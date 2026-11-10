import { Controller, Get, Param } from '@nestjs/common';
import { Piece } from '@prisma/client';
import { DossiersService, ResumeDossier } from './dossiers.service';

@Controller('dossiers')
export class DossiersController {
  constructor(private readonly dossiers: DossiersService) {}

  @Get()
  lister(): Promise<ResumeDossier[]> {
    return this.dossiers.lister();
  }

  @Get(':id/pieces')
  pieces(@Param('id') id: string): Promise<Piece[]> {
    return this.dossiers.pieces(id);
  }
}