import { Module } from '@nestjs/common';
import { DemandesController } from './demandes.controller';
import { DemandesService } from './demandes.service';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { PiecesService } from './pieces.service';

@Module({
  controllers: [DossiersController, DemandesController],
  providers: [DossiersService, PiecesService, DemandesService],
  exports: [DossiersService],
})
export class DossiersModule {}