import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Souvenir {
  compte: string;
  fois: number;
  source: 'dossier' | 'cabinet';
}

interface LigneMontant {
  compte: string;
  debit: number;
  credit: number;
}

// Mots ignorés pour reconnaître un fournisseur : « ENEO Cameroun SA » = « Eneo »
const MOTS_IGNORES = new Set([
  'sa',
  'sarl',
  'sarlu',
  'sas',
  'ets',
  'etablissements',
  'plc',
  'ltd',
  'cameroun',
  'cameroon',
  'cie',
  'et',
]);

export function cleFournisseur(nom: string | null | undefined): string | null {
  if (!nom) return null;
  const mots = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((mot) => mot && !MOTS_IGNORES.has(mot));
  const cle = mots.join(' ').slice(0, 80);
  return cle || null;
}

// La ligne de charge : le plus gros débit hors comptes de tiers (40, 41) et de taxes (44)
function ligneCharge<T extends LigneMontant>(lignes: T[]): T | undefined {
  return lignes
    .filter((l) => l.debit > 0 && !/^(40|41|44)/.test(l.compte))
    .sort((a, b) => b.debit - a.debit)[0];
}

@Injectable()
export class MemoireComptesService {
  constructor(private readonly prisma: PrismaService) {}

  // Remplace le compte de charge proposé par celui retenu pour ce fournisseur, s'il existe
  async appliquer<T extends LigneMontant>(
    piece: {
      dossierId: string;
      fournisseur: string | null;
      factureId: string | null;
      dossier: { cabinetId: string };
    },
    proposition: { journal: string; lignes: T[] },
  ): Promise<{ journal: string; lignes: T[]; souvenir: Souvenir | null }> {
    const cle = cleFournisseur(piece.fournisseur);
    const charge = ligneCharge(proposition.lignes);
    if (!cle || !charge || piece.factureId)
      return { ...proposition, souvenir: null };

    // D'abord ce dossier, sinon un autre dossier du même cabinet (jamais au-delà)
    const local = await this.prisma.memoireCompte.findUnique({
      where: {
        dossierId_cleFournisseur: {
          dossierId: piece.dossierId,
          cleFournisseur: cle,
        },
      },
    });
    const memoire =
      local ??
      (await this.prisma.memoireCompte.findFirst({
        where: {
          cleFournisseur: cle,
          dossier: { cabinetId: piece.dossier.cabinetId },
        },
        orderBy: [{ utilisations: 'desc' }, { majLe: 'desc' }],
      }));
    if (!memoire) return { ...proposition, souvenir: null };

    return {
      journal: memoire.journal,
      lignes: proposition.lignes.map((l) =>
        l === charge ? { ...l, compte: memoire.compte } : l,
      ),
      souvenir: {
        compte: memoire.compte,
        fois: memoire.utilisations,
        source: local ? 'dossier' : 'cabinet',
      },
    };
  }

  // Retient le compte de charge validé ; un changement d'avis remet le compteur à 1
  async retenir(
    piece: {
      dossierId: string;
      fournisseur: string | null;
      factureId: string | null;
    },
    ecriture: { journal: string; lignes: LigneMontant[] },
  ): Promise<void> {
    const cle = cleFournisseur(piece.fournisseur);
    const charge = ligneCharge(ecriture.lignes);
    if (!cle || !charge || piece.factureId) return;

    const ou = {
      dossierId_cleFournisseur: {
        dossierId: piece.dossierId,
        cleFournisseur: cle,
      },
    };
    const existant = await this.prisma.memoireCompte.findUnique({ where: ou });
    if (existant && existant.compte === charge.compte) {
      await this.prisma.memoireCompte.update({
        where: ou,
        data: { journal: ecriture.journal, utilisations: { increment: 1 } },
      });
      return;
    }
    await this.prisma.memoireCompte.upsert({
      where: ou,
      create: {
        dossierId: piece.dossierId,
        cleFournisseur: cle,
        compte: charge.compte,
        journal: ecriture.journal,
      },
      update: {
        compte: charge.compte,
        journal: ecriture.journal,
        utilisations: 1,
      },
    });
  }
}
