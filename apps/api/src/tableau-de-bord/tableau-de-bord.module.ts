import { Module } from '@nestjs/common';
import { TableauDeBordController } from './tableau-de-bord.controller';
import { TableauDeBordService } from './tableau-de-bord.service';

@Module({
  controllers: [TableauDeBordController],
  providers: [TableauDeBordService],
})
export class TableauDeBordModule {}
