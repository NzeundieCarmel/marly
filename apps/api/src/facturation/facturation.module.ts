import { Module } from '@nestjs/common';
import { FacturationController } from './facturation.controller';
import { FacturationService } from './facturation.service';
import { FacturesController } from './factures.controller';
import { FacturesService } from './factures.service';

@Module({
  controllers: [FacturationController, FacturesController],
  providers: [FacturationService, FacturesService],
})
export class FacturationModule {}
