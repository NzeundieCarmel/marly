import { Module } from '@nestjs/common';
import { AchatsController } from '../achats/achats.controller';
import { AchatsService } from '../achats/achats.service';
import { CaisseController } from '../caisse/caisse.controller';
import { CaisseService } from '../caisse/caisse.service';
import { DossiersModule } from '../dossiers/dossiers.module';
import { FacturationModule } from '../facturation/facturation.module';
import { LectureController } from '../lecture/lecture.controller';
import { LectureService } from '../lecture/lecture.service';
import { PilotageController } from '../pilotage/pilotage.controller';
import { PilotageService } from '../pilotage/pilotage.service';
import { StockModule } from '../stock/stock.module';
import { ComptabiliteController } from './comptabilite.controller';
import { ComptabiliteService } from './comptabilite.service';
import { GrandLivreController } from './grand-livre.controller';
import { GrandLivreService } from './grand-livre.service';
import { MemoireComptesService } from './memoire-comptes.service';

@Module({
  imports: [DossiersModule, FacturationModule, StockModule],
  controllers: [
    ComptabiliteController,
    GrandLivreController,
    CaisseController,
    AchatsController,
    PilotageController,
    LectureController,
  ],
  providers: [
    ComptabiliteService,
    MemoireComptesService,
    GrandLivreService,
    CaisseService,
    AchatsService,
    PilotageService,
    LectureService,
  ],
  exports: [GrandLivreService],
})
export class ComptabiliteModule {}
