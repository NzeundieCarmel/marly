import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';

// L'intercepteur est global : toutes les routes de l'API sont couvertes, même les futures
@Module({
  controllers: [JournalController],
  providers: [
    JournalService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AuditModule {}
