import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { FacturesService } from './factures.service';
import type { FactureDocument } from './factures.service';

// Sans connexion : le jeton du lien suffit, et il ne donne accès qu'à ce document
@Controller('public/factures')
export class FacturesPubliquesController {
  constructor(private readonly service: FacturesService) {}

  @Public()
  @Get(':jeton')
  lire(@Param('jeton') jeton: string): Promise<FactureDocument> {
    return this.service.lirePublic(jeton);
  }
}
