import { Module } from '@nestjs/common';
import { DossiersModule } from '../dossiers/dossiers.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [DossiersModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
