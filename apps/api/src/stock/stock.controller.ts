import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import {
  ArticleDto,
  InventaireDto,
  ModifArticleDto,
  MouvementDto,
} from './dto/stock.dto';
import { StockService } from './stock.service';

@Controller('dossiers/:dossierId/stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('resume')
  resume(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.stock.resume(dossierId, utilisateur);
  }

  @Get('articles')
  lister(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Query('recherche') recherche?: string,
    @Query('alerte') alerte?: string,
  ) {
    return this.stock.lister(dossierId, utilisateur, recherche, alerte === '1');
  }

  @Post('articles')
  creer(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ArticleDto,
  ) {
    return this.stock.creer(dossierId, utilisateur, dto);
  }

  @Get('articles/:id')
  detail(
    @Param('dossierId') dossierId: string,
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.stock.detail(dossierId, id, utilisateur);
  }

  @Patch('articles/:id')
  modifier(
    @Param('dossierId') dossierId: string,
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: ModifArticleDto,
  ) {
    return this.stock.modifier(dossierId, id, utilisateur, dto);
  }

  @Post('articles/:id/mouvements')
  mouvement(
    @Param('dossierId') dossierId: string,
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: MouvementDto,
  ) {
    return this.stock.mouvement(dossierId, id, utilisateur, dto);
  }

  @Post('articles/:id/inventaire')
  @HttpCode(HttpStatus.OK)
  inventaire(
    @Param('dossierId') dossierId: string,
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: InventaireDto,
  ) {
    return this.stock.inventaire(dossierId, id, utilisateur, dto);
  }
}
