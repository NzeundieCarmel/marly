import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ModeReglement } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReglementDto } from './dto/reglement.dto';

export type EtatPaiement = 'PAYEE' | 'PARTIELLE' | 'EN_RETARD' | 'A_PAYER';

export interface Paiement {
  factureId: string;
  netAPayer: number;
  montantRegle: number;
  reste: number;
  etat: EtatPaiement | null;
  dateEcheance: Date | null;
  derniereRelanceLe: Date | null;
  reglements: {
    id: string;
    date: Date;
    montant: number;
    mode: ModeReglement;
    reference: string | null;
  }[];
}

export interface ResumePaiement {
  factureId: string;
  etat: EtatPaiement | null;
  reste: number;
}

// Jour courant à l'heure du Cameroun, au format AAAA-MM-JJ
function aujourdhui(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Douala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function jour(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Seule une facture émise et non annulée a un état de paiement ; le retard prime sur l'acompte
function etatDe(
  f: {
    type: string;
    statut: string;
    netAPayer: number;
    montantRegle: number;
    dateEcheance: Date | null;
  },
  ceJour: string,
): EtatPaiement | null {
  if (f.type !== 'FACTURE' || f.statut !== 'EMISE') return null;
  if (f.montantRegle >= f.netAPayer) return 'PAYEE';
  if (f.dateEcheance && jour(f.dateEcheance) < ceJour) return 'EN_RETARD';
  return f.montantRegle > 0 ? 'PARTIELLE' : 'A_PAYER';
}

@Injectable()
export class ReglementsService {
  constructor(private readonly prisma: PrismaService) {}

  private dossierDe(utilisateur: ChargeJeton): string {
    if (!utilisateur.dossierId)
      throw new ForbiddenException('Aucun dossier rattaché à ce compte');
    return utilisateur.dossierId;
  }

  async lister(utilisateur: ChargeJeton): Promise<ResumePaiement[]> {
    const ceJour = aujourdhui();
    const factures = await this.prisma.facture.findMany({
      where: {
        dossierId: this.dossierDe(utilisateur),
        type: 'FACTURE',
        statut: 'EMISE',
      },
      select: {
        id: true,
        type: true,
        statut: true,
        netAPayer: true,
        montantRegle: true,
        dateEcheance: true,
      },
    });
    return factures.map((f) => ({
      factureId: f.id,
      etat: etatDe(f, ceJour),
      reste: Math.max(0, f.netAPayer - f.montantRegle),
    }));
  }

  async lire(utilisateur: ChargeJeton, factureId: string): Promise<Paiement> {
    const f = await this.prisma.facture.findFirst({
      where: {
        AND: [{ id: factureId }, { dossierId: this.dossierDe(utilisateur) }],
      },
      select: {
        id: true,
        type: true,
        statut: true,
        netAPayer: true,
        montantRegle: true,
        dateEcheance: true,
        derniereRelanceLe: true,
        reglements: {
          orderBy: [{ date: 'asc' }, { creeLe: 'asc' }],
          select: {
            id: true,
            date: true,
            montant: true,
            mode: true,
            reference: true,
          },
        },
      },
    });
    if (!f) throw new NotFoundException('Facture introuvable');
    return {
      factureId: f.id,
      netAPayer: f.netAPayer,
      montantRegle: f.montantRegle,
      reste: Math.max(0, f.netAPayer - f.montantRegle),
      etat: etatDe(f, aujourdhui()),
      dateEcheance: f.dateEcheance,
      derniereRelanceLe: f.derniereRelanceLe,
      reglements: f.reglements,
    };
  }

  async enregistrer(
    utilisateur: ChargeJeton,
    factureId: string,
    dto: ReglementDto,
  ): Promise<Paiement> {
    const dossierId = this.dossierDe(utilisateur);
    const ceJour = aujourdhui();

    await this.prisma.$transaction(async (tx) => {
      const f = await tx.facture.findFirst({
        where: { AND: [{ id: factureId }, { dossierId }] },
        select: {
          type: true,
          statut: true,
          netAPayer: true,
          montantRegle: true,
          dateEmission: true,
        },
      });
      if (!f) throw new NotFoundException('Facture introuvable');
      if (f.type !== 'FACTURE' || f.statut !== 'EMISE') {
        throw new ConflictException(
          'Seule une facture émise, et non annulée, peut recevoir un règlement',
        );
      }
      if (dto.date > ceJour)
        throw new BadRequestException(
          'La date du règlement ne peut pas être dans le futur',
        );
      const emission = f.dateEmission ? jour(f.dateEmission) : null;
      if (emission && dto.date < emission) {
        throw new BadRequestException(
          "Le règlement ne peut pas précéder la date d'émission de la facture",
        );
      }
      const reste = f.netAPayer - f.montantRegle;
      if (dto.montant > reste) {
        throw new BadRequestException(
          `Le montant dépasse le reste à payer (${reste} FCFA)`,
        );
      }

      // Le total ne change que s'il n'a pas bougé depuis la lecture : deux saisies simultanées ne dépassent jamais le dû
      const maj = await tx.facture.updateMany({
        where: { id: factureId, montantRegle: f.montantRegle },
        data: { montantRegle: { increment: dto.montant } },
      });
      if (maj.count !== 1)
        throw new ConflictException(
          "Un autre règlement vient d'être enregistré. Réessayez.",
        );

      await tx.reglementFacture.create({
        data: {
          factureId,
          date: new Date(`${dto.date}T00:00:00.000Z`),
          montant: dto.montant,
          mode: dto.mode,
          reference: dto.reference || null,
          creeParId: utilisateur.sub,
        },
      });
    });
    return this.lire(utilisateur, factureId);
  }

  // Pour corriger une erreur de saisie
  async supprimer(
    utilisateur: ChargeJeton,
    factureId: string,
    reglementId: string,
  ): Promise<Paiement> {
    const dossierId = this.dossierDe(utilisateur);
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.reglementFacture.findFirst({
        where: {
          AND: [{ id: reglementId }, { factureId }, { facture: { dossierId } }],
        },
        select: { montant: true },
      });
      if (!r) throw new NotFoundException('Règlement introuvable');
      const sup = await tx.reglementFacture.deleteMany({
        where: { id: reglementId },
      });
      if (sup.count !== 1) throw new NotFoundException('Règlement introuvable');
      await tx.facture.update({
        where: { id: factureId },
        data: { montantRegle: { decrement: r.montant } },
      });
    });
    return this.lire(utilisateur, factureId);
  }

  // Note la date de la relance ; le message WhatsApp est composé par l'interface
  async relancer(
    utilisateur: ChargeJeton,
    factureId: string,
  ): Promise<Paiement> {
    const paiement = await this.lire(utilisateur, factureId);
    if (!paiement.etat || paiement.etat === 'PAYEE') {
      throw new ConflictException('Cette facture ne demande pas de relance');
    }
    await this.prisma.facture.update({
      where: { id: factureId },
      data: { derniereRelanceLe: new Date() },
    });
    return this.lire(utilisateur, factureId);
  }
}
