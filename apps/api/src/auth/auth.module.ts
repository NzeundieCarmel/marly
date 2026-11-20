import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { InvitationsController } from '../invitations/invitations.controller';
import { InvitationsService } from '../invitations/invitations.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InscriptionController } from './inscription.controller';
import { InscriptionService } from './inscription.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: Number(config.get<string>('JWT_DUREE_SECONDES', '28800')),
        },
      }),
    }),
  ],
  controllers: [AuthController, InscriptionController, InvitationsController],
  providers: [
    AuthService,
    InscriptionService,
    InvitationsService,
    // Toutes les routes exigent un jeton, sauf celles marquées @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
