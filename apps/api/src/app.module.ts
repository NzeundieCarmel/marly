import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DossiersModule } from './dossiers/dossiers.module';
import { PrismaModule } from './prisma/prisma.module';
import { SanteModule } from './sante/sante.module';

@Module({
  imports: [PrismaModule, SanteModule, DossiersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}