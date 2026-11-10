import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SanteModule } from './sante/sante.module';

@Module({
  imports: [PrismaModule, SanteModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}