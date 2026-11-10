import { Module } from '@nestjs/common';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { PiecesService } from './pieces.service';

@Module({
  controllers: [DossiersController],
  providers: [DossiersService, PiecesService],
})
export class DossiersModule {}