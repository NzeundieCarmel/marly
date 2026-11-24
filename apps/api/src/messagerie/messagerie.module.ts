import { Global, Module } from '@nestjs/common';
import { MessagerieService } from './messagerie.service';

// Disponible partout : invitations, factures et alertes pourront s'en servir plus tard
@Global()
@Module({
  providers: [MessagerieService],
  exports: [MessagerieService],
})
export class MessagerieModule {}
