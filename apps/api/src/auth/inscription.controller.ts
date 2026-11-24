import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  InscriptionDto,
  InscriptionEntrepriseDto,
} from './dto/inscription.dto';
import { InscriptionService } from './inscription.service';
import { ipDe } from './ip-relayee';
import { Public } from './public.decorator';

@Controller('inscription')
export class InscriptionController {
  constructor(private readonly service: InscriptionService) {}

  @Public()
  @Post()
  inscrire(
    @Body() dto: InscriptionDto,
    @Req() requete: Request,
  ): Promise<{ jeton: string }> {
    return this.service.inscrire(dto, ipDe(requete));
  }

  @Public()
  @Post('entreprise')
  inscrireEntreprise(
    @Body() dto: InscriptionEntrepriseDto,
    @Req() requete: Request,
  ): Promise<{ jeton: string }> {
    return this.service.inscrireEntreprise(dto, ipDe(requete));
  }
}
