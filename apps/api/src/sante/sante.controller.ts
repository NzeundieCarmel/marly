import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface EtatSante {
  api: 'ok';
  baseDeDonnees: 'ok';
  heure: string;
}

@Public()
@Controller('sante')
export class SanteController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async verifier(): Promise<EtatSante> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        api: 'ok',
        baseDeDonnees: 'ok',
        heure: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('Base de donnees injoignable');
    }
  }
}