import { Module } from '@nestjs/common';
import { FacturationController } from './facturation.controller';
import { FacturationService } from './facturation.service';
import { FacturesPubliquesController } from './factures-publiques.controller';
import { FacturesController } from './factures.controller';
import { FacturesService } from './factures.service';

@Module({
  controllers: [
    FacturationController,
    FacturesController,
    FacturesPubliquesController,
  ],
  providers: [FacturationService, FacturesService],
  exports: [FacturesService],
})
export class FacturationModule {}
