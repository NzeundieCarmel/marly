import { Module } from '@nestjs/common';
import { DemandesController } from './demandes.controller';
import { DemandesService } from './demandes.service';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { PiecesService } from './pieces.service';
import { GestionDossiersController } from './gestion-dossiers.controller';
import { GestionDossiersService } from './gestion-dossiers.service';

@Module({
  controllers: [
    DossiersController,
    DemandesController,
    GestionDossiersController,
  ],
  providers: [
    DossiersService,
    PiecesService,
    DemandesService,
    GestionDossiersService,
  ],
  exports: [DossiersService],
})
export class DossiersModule {}
