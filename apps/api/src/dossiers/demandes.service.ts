import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DemandePiece, StatutDemande, StatutPiece } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { DossiersService } from './dossiers.service';
import { ACompleterDto, CreerDemandeDto } from './dto/demande.dto';
import { dateAMidi, prochaineEcheance } from './echeances';

function formatJour(date: Date): string {
  const jour = String(date.getUTCDate()).padStart(2, '0');
  const mois = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${jour}/${mois}`;
}

@Injectable()
export class DemandesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossiersService,
  ) {}

  async lister(dossierId: string, utilisateur: ChargeJeton): Promise<DemandePiece[]> {
    await this.dossiers.verifierAcces(dossierId, utilisateur);
    return this.prisma.demandePiece.findMany({
      where: { dossierId },
      orderBy: [{ statut: 'asc' }, { echeance: 'asc' }],
    });
  }

  async creer(
    dossierId: string,
    utilisateur: ChargeJeton,
    dto: CreerDemandeDto,
  ): Promise<DemandePiece> {
    await this.dossiers.verifierAcces(dossierId, utilisateur);
    return this.prisma.demandePiece.create({
      data: {
        dossierId,
        description: dto.description.trim(),
        echeance: dto.echeance ? dateAMidi(dto.echeance) : prochaineEcheance(new Date()),
        demandeParId: utilisateur.sub,
      },
    });
  }

  async annuler(demandeId: string, utilisateur: ChargeJeton): Promise<DemandePiece> {
    const demande = await this.prisma.demandePiece.findUnique({
      where: { id: demandeId },
    });
    if (!demande) {
      throw new NotFoundException('Demande introuvable');
    }
    try {
      await this.dossiers.verifierAcces(demande.dossierId, utilisateur);
    } catch {
      throw new NotFoundException('Demande introuvable');
    }
    if (demande.statut !== StatutDemande.OUVERTE) {
      throw new ConflictException('Cette demande est deja close');
    }
    return this.prisma.demandePiece.update({
      where: { id: demandeId },
      data: { statut: StatutDemande.ANNULEE },
    });
  }

  // Pièce illisible ou incomplète : renvoyée à la PME avec une demande
  async marquerACompleter(
    pieceId: string,
    utilisateur: ChargeJeton,
    dto: ACompleterDto,
  ): Promise<DemandePiece> {
    const piece = await this.prisma.piece.findUnique({ where: { id: pieceId } });
    if (!piece) {
      throw new NotFoundException('Piece introuvable');
    }
    try {
      await this.dossiers.verifierAcces(piece.dossierId, utilisateur);
    } catch {
      throw new NotFoundException('Piece introuvable');
    }
    if (piece.statut !== StatutPiece.RECUE) {
      throw new ConflictException(
        'Seule une piece recue peut etre renvoyee a l entreprise',
      );
    }

    const description =
      `${dto.motif.trim()} : ${piece.fournisseur ?? piece.categorie} du ${formatJour(piece.date)}`.slice(0, 160);

    const [, demande] = await this.prisma.$transaction([
      this.prisma.piece.update({
        where: { id: pieceId },
        data: { statut: StatutPiece.A_COMPLETER },
      }),
      this.prisma.demandePiece.create({
        data: {
          dossierId: piece.dossierId,
          description,
          echeance: prochaineEcheance(new Date()),
          pieceId,
          demandeParId: utilisateur.sub,
        },
      }),
    ]);
    return demande;
  }
}