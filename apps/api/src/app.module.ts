import { FacturationModule } from './facturation/facturation.module';
import { RattachementsModule } from './rattachements/rattachements.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ComptabiliteModule } from './comptabilite/comptabilite.module';
import { ExportsModule } from './exports/exports.module';
import { DossiersModule } from './dossiers/dossiers.module';
import { PrismaModule } from './prisma/prisma.module';
import { SanteModule } from './sante/sante.module';
import { TableauDeBordModule } from './tableau-de-bord/tableau-de-bord.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SanteModule,
    AuthModule,
    DossiersModule,
    ComptabiliteModule,
    ExportsModule,
    TableauDeBordModule,
    RattachementsModule,
    FacturationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
