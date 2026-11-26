import { Controller, Get, Query } from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { JournalService } from './journal.service';
import type { EntreeJournal } from './journal.service';

@Roles('RESPONSABLE')
@Controller('journal')
export class JournalController {
  constructor(private readonly service: JournalService) {}

  @Get()
  lister(
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Query('dossierId') dossierId?: string,
  ): Promise<EntreeJournal[]> {
    return this.service.lister(utilisateur, dossierId || undefined);
  }
}
