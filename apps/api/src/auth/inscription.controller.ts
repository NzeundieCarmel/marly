import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { InscriptionDto } from './dto/inscription.dto';
import { InscriptionService } from './inscription.service';
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
    // Next.js transmet l'adresse IP du visiteur ; sinon, celle de l'appel
    const relayee = requete.headers['x-marly-ip'];
    const ip =
      (typeof relayee === 'string' && relayee) || requete.ip || 'inconnue';
    return this.service.inscrire(dto, ip.slice(0, 64));
  }
}
