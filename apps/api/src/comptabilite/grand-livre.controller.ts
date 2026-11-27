import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { ChargeJeton } from '../auth/auth.service';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { ComptabiliteService } from './comptabilite.service';
import { CompteDto, EcritureManuelleDto } from './dto/grand-livre.dto';
import { GrandLivreService } from './grand-livre.service';

@Controller('dossiers/:dossierId/comptabilite')
export class GrandLivreController {
  constructor(
    private readonly grandLivre: GrandLivreService,
    private readonly compta: ComptabiliteService,
  ) {}

  @Get('plan')
  plan(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.grandLivre.plan(dossierId, utilisateur);
  }

  @Post('comptes')
  ajouterCompte(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: CompteDto,
  ) {
    return this.grandLivre.ajouterCompte(dossierId, utilisateur, dto);
  }

  @Post('ecritures')
  saisir(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Body() dto: EcritureManuelleDto,
  ) {
    return this.grandLivre.saisir(dossierId, utilisateur, dto);
  }

  // Toutes les pieces recues, avec l'ecriture proposee par Marly
  @Post('comptabiliser')
  @HttpCode(HttpStatus.OK)
  comptabiliser(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
  ) {
    return this.compta.comptabiliserEnAttente(dossierId, utilisateur);
  }

  @Get('journal')
  journal(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Query('journal') journal?: string,
    @Query('du') du?: string,
    @Query('au') au?: string,
  ) {
    return this.grandLivre.journal(dossierId, utilisateur, journal, du, au);
  }

  @Get('grand-livre')
  grandLivreCompte(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Query('compte') compte?: string,
    @Query('du') du?: string,
    @Query('au') au?: string,
  ) {
    return this.grandLivre.grandLivre(dossierId, utilisateur, compte, du, au);
  }

  @Get('balance')
  balance(
    @Param('dossierId') dossierId: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @Query('du') du?: string,
    @Query('au') au?: string,
  ) {
    return this.grandLivre.balance(dossierId, utilisateur, du, au);
  }
}
