import { Module } from '@nestjs/common';
import { FacturationController } from './facturation.controller';
import { FacturationService } from './facturation.service';

@Module({
  controllers: [FacturationController],
  providers: [FacturationService],
})
export class FacturationModule {}
