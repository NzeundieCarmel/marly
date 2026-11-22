import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  InscriptionDto,
  InscriptionEntrepriseDto,
} from './dto/inscription.dto';
import { InscriptionService } from './inscription.service';
import { Public } from './public.decorator';

// Next.js transmet l'adresse IP du visiteur ; sinon, celle de l'appel
function ipDe(requete: Request): string {
  const relayee = requete.headers['x-marly-ip'];
  const ip =
    (typeof relayee === 'string' && relayee) || requete.ip || 'inconnue';
  return ip.slice(0, 64);
}

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
