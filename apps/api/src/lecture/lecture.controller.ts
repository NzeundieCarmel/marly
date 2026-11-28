import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { ChargeJeton } from '../auth/auth.service';
import { UtilisateurCourant } from '../auth/utilisateur-courant.decorator';
import { TAILLE_MAX_OCTETS } from '../dossiers/pieces.service';
import type { FichierRecu } from '../dossiers/pieces.service';
import { LectureService } from './lecture.service';

@Controller('dossiers/:id/lecture')
export class LectureController {
  constructor(private readonly lecture: LectureService) {}

  // Lit la photo et propose les champs ; rien n'est enregistre
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('fichier', {
      limits: { fileSize: TAILLE_MAX_OCTETS, files: 1 },
    }),
  )
  lire(
    @Param('id') id: string,
    @UtilisateurCourant() utilisateur: ChargeJeton,
    @UploadedFile() fichier: FichierRecu | undefined,
  ) {
    return this.lecture.lire(id, utilisateur, fichier);
  }
}
