import { Module } from '@nestjs/common';
import { DossiersModule } from '../dossiers/dossiers.module';
import { FacturationModule } from '../facturation/facturation.module';
import { ComptabiliteController } from './comptabilite.controller';
import { ComptabiliteService } from './comptabilite.service';
import { GrandLivreController } from './grand-livre.controller';
import { GrandLivreService } from './grand-livre.service';
import { MemoireComptesService } from './memoire-comptes.service';

@Module({
  imports: [DossiersModule, FacturationModule],
  controllers: [ComptabiliteController, GrandLivreController],
  providers: [ComptabiliteService, MemoireComptesService, GrandLivreService],
  exports: [GrandLivreService],
})
export class ComptabiliteModule {}
