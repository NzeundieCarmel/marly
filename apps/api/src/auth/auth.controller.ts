import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService, ReponseConnexion } from './auth.service';
import { ConnexionDto } from './dto/connexion.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('connexion')
  @HttpCode(HttpStatus.OK)
  connecter(@Body() dto: ConnexionDto): Promise<ReponseConnexion> {
    return this.auth.connecter(dto);
  }
}