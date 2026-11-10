import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface EtatSante {
  api: 'ok';
  baseDeDonnees: 'ok';
  dossiers: number;
  heure: string;
}

@Controller('sante')
export class SanteController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async verifier(): Promise<EtatSante> {
    try {
      const dossiers = await this.prisma.dossier.count();
      return {
        api: 'ok',
        baseDeDonnees: 'ok',
        dossiers,
        heure: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('Base de donnees injoignable');
    }
  }
}