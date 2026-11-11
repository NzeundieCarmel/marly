import { Module } from '@nestjs/common';
import { DossiersModule } from '../dossiers/dossiers.module';
import { ComptabiliteController } from './comptabilite.controller';
import { ComptabiliteService } from './comptabilite.service';

@Module({
  imports: [DossiersModule],
  controllers: [ComptabiliteController],
  providers: [ComptabiliteService],
})
export class ComptabiliteModule {}