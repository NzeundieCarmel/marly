import { Module } from '@nestjs/common';
import { RattachementsController } from './rattachements.controller';
import { RattachementsService } from './rattachements.service';

@Module({
  controllers: [RattachementsController],
  providers: [RattachementsService],
})
export class RattachementsModule {}
