// Règles de pré-comptabilisation SYSCOHADA
// À FAIRE VALIDER PAR LE CABINET PILOTE avant tout usage réel

export const JOURNAL_ACHATS = 'AC';
export const COMPTE_FOURNISSEURS = '401';
export const COMPTE_TVA_RECUPERABLE = '4452';

// Catégorie choisie par la PME -> compte de charge proposé
export const COMPTES_PAR_CATEGORIE: Record<
  string,
  { compte: string; intitule: string }
> = {
  'Électricité, eau': { compte: '6052', intitule: 'Électricité' },
  Achats: { compte: '601', intitule: 'Achats de marchandises' },
  Transport: { compte: '618', intitule: 'Autres frais de transport' },
  'Télécommunications': { compte: '628', intitule: 'Frais de télécommunications' },
  Fournitures: { compte: '6055', intitule: 'Fournitures de bureau' },
  Autre: { compte: '658', intitule: 'Charges diverses' },
};

const COMPTE_PAR_DEFAUT = COMPTES_PAR_CATEGORIE['Autre'];

export interface LigneEcritureProposee {
  compte: string;
  libelle: string;
  tiers: string | null;
  debit: number;
  credit: number;
}

export function proposerEcriture(
  piece: {
    date: Date;
    montantTtc: number;
    fournisseur: string | null;
    categorie: string;
  },
  dossier: { regime: 'REEL' | 'IGS'; tauxTva: number },
): { journal: string; lignes: LigneEcritureProposee[] } {
  const charge = COMPTES_PAR_CATEGORIE[piece.categorie] ?? COMPTE_PAR_DEFAUT;
  const mois = String(piece.date.getUTCMonth() + 1).padStart(2, '0');
  const libelle =
    `${piece.fournisseur ?? piece.categorie} ${mois}/${piece.date.getUTCFullYear()}`.slice(0, 80);

  const ttc = piece.montantTtc;
  // À l'IGS, la TVA n'est pas récupérable : toute la dépense va en charge
  const ht =
    dossier.regime === 'REEL'
      ? Math.round(ttc / (1 + dossier.tauxTva / 100))
      : ttc;
  const tva = ttc - ht;

  const lignes: LigneEcritureProposee[] = [
    { compte: charge.compte, libelle, tiers: null, debit: ht, credit: 0 },
  ];
  if (tva > 0) {
    lignes.push({ compte: COMPTE_TVA_RECUPERABLE, libelle, tiers: null, debit: tva, credit: 0 });
  }
  lignes.push({
    compte: COMPTE_FOURNISSEURS,
    libelle,
    tiers: piece.fournisseur,
    debit: 0,
    credit: ttc,
  });

  return { journal: JOURNAL_ACHATS, lignes };
}