import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { DemandeCodeDto, ReinitialisationDto } from './dto/mot-de-passe.dto';
import { ipDe } from './ip-relayee';
import { MotDePasseService } from './mot-de-passe.service';
import { Public } from './public.decorator';

@Controller('auth/mot-de-passe')
export class MotDePasseController {
  constructor(private readonly service: MotDePasseService) {}

  @Public()
  @Post('demande')
  @HttpCode(HttpStatus.OK)
  demander(
    @Body() dto: DemandeCodeDto,
    @Req() requete: Request,
  ): Promise<{ message: string }> {
    return this.service.demander(dto.email, ipDe(requete));
  }

  @Public()
  @Post('reinitialiser')
  @HttpCode(HttpStatus.OK)
  reinitialiser(
    @Body() dto: ReinitialisationDto,
    @Req() requete: Request,
  ): Promise<{ message: string }> {
    return this.service.reinitialiser(dto, ipDe(requete));
  }
}
