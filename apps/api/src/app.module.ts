import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DossiersModule } from './dossiers/dossiers.module';
import { PrismaModule } from './prisma/prisma.module';
import { SanteModule } from './sante/sante.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SanteModule,
    AuthModule,
    DossiersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}