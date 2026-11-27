import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { FacturationController } from './facturation.controller';
import { FacturationService } from './facturation.service';
import { FacturesPubliquesController } from './factures-publiques.controller';
import { FacturesController } from './factures.controller';
import { FacturesService } from './factures.service';
import { ReglementsController } from './reglements.controller';
import { ReglementsService } from './reglements.service';

@Module({
  imports: [StockModule],
  controllers: [
    FacturationController,
    FacturesController,
    FacturesPubliquesController,
    ReglementsController,
  ],
  providers: [FacturationService, FacturesService, ReglementsService],
  exports: [FacturesService],
})
export class FacturationModule {}
