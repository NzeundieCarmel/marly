// Plan comptable SYSCOHADA revise : comptes usuels d'une PME.
// L'entreprise peut ajouter ses propres comptes (sous-comptes ou comptes absents de cette liste).

export const JOURNAUX: Record<string, string> = {
  AC: 'Achats',
  VE: 'Ventes',
  CA: 'Caisse',
  BQ: 'Banque',
  MM: 'Mobile Money',
  OD: 'Op\u00e9rations diverses',
};

// Journaux que l'entreprise peut saisir a la main (achats et ventes viennent des pieces et des factures)
export const JOURNAUX_SAISIE = ['OD', 'CA', 'BQ', 'MM'];

export interface CompteDuPlan {
  numero: string;
  intitule: string;
}

const CLASSES: Record<string, string> = {
  '1': 'Comptes de ressources durables',
  '2': 'Comptes d\u2019actif immobilis\u00e9',
  '3': 'Comptes de stocks',
  '4': 'Comptes de tiers',
  '5': 'Comptes de tr\u00e9sorerie',
  '6': 'Charges des activit\u00e9s ordinaires',
  '7': 'Produits des activit\u00e9s ordinaires',
  '8': 'Autres charges et autres produits',
};

export const PLAN_SYSCOHADA: CompteDuPlan[] = [
  { numero: '101', intitule: 'Capital social' },
  { numero: '103', intitule: 'Capital personnel' },
  { numero: '104', intitule: 'Compte de l\u2019exploitant' },
  { numero: '111', intitule: 'R\u00e9serve l\u00e9gale' },
  { numero: '121', intitule: 'Report \u00e0 nouveau cr\u00e9diteur' },
  { numero: '129', intitule: 'Report \u00e0 nouveau d\u00e9biteur' },
  { numero: '131', intitule: 'R\u00e9sultat net : b\u00e9n\u00e9fice' },
  { numero: '139', intitule: 'R\u00e9sultat net : perte' },
  {
    numero: '162',
    intitule: 'Emprunts aupr\u00e8s des \u00e9tablissements de cr\u00e9dit',
  },
  { numero: '213', intitule: 'Logiciels et sites internet' },
  { numero: '221', intitule: 'Terrains' },
  { numero: '231', intitule: 'B\u00e2timents' },
  {
    numero: '241',
    intitule: 'Mat\u00e9riel et outillage industriel et commercial',
  },
  { numero: '2441', intitule: 'Mat\u00e9riel de bureau' },
  { numero: '2442', intitule: 'Mat\u00e9riel informatique' },
  { numero: '2444', intitule: 'Mobilier de bureau' },
  { numero: '245', intitule: 'Mat\u00e9riel de transport' },
  { numero: '2844', intitule: 'Amortissements du mat\u00e9riel et mobilier' },
  { numero: '2845', intitule: 'Amortissements du mat\u00e9riel de transport' },
  { numero: '311', intitule: 'Marchandises' },
  { numero: '321', intitule: 'Mati\u00e8res premi\u00e8res' },
  { numero: '401', intitule: 'Fournisseurs' },
  { numero: '408', intitule: 'Fournisseurs, factures non parvenues' },
  {
    numero: '409',
    intitule: 'Fournisseurs d\u00e9biteurs, avances vers\u00e9es',
  },
  { numero: '411', intitule: 'Clients' },
  { numero: '419', intitule: 'Clients cr\u00e9diteurs, avances re\u00e7ues' },
  { numero: '421', intitule: 'Personnel, avances et acomptes' },
  { numero: '422', intitule: 'Personnel, r\u00e9mun\u00e9rations dues' },
  { numero: '431', intitule: 'S\u00e9curit\u00e9 sociale (CNPS)' },
  {
    numero: '441',
    intitule: '\u00c9tat, imp\u00f4t sur les b\u00e9n\u00e9fices',
  },
  { numero: '4431', intitule: '\u00c9tat, TVA factur\u00e9e sur ventes' },
  { numero: '4441', intitule: '\u00c9tat, TVA due' },
  { numero: '4449', intitule: '\u00c9tat, cr\u00e9dit de TVA \u00e0 reporter' },
  {
    numero: '4451',
    intitule: '\u00c9tat, TVA r\u00e9cup\u00e9rable sur immobilisations',
  },
  {
    numero: '4452',
    intitule: '\u00c9tat, TVA r\u00e9cup\u00e9rable sur achats',
  },
  {
    numero: '447',
    intitule: '\u00c9tat, imp\u00f4ts retenus \u00e0 la source',
  },
  { numero: '471', intitule: 'D\u00e9biteurs et cr\u00e9diteurs divers' },
  { numero: '521', intitule: 'Banques' },
  {
    numero: '552',
    intitule: 'Monnaie \u00e9lectronique, t\u00e9l\u00e9phone portable',
  },
  { numero: '571', intitule: 'Caisse' },
  { numero: '585', intitule: 'Virements de fonds' },
  { numero: '601', intitule: 'Achats de marchandises' },
  { numero: '602', intitule: 'Achats de mati\u00e8res premi\u00e8res' },
  { numero: '6031', intitule: 'Variation des stocks de marchandises' },
  { numero: '6051', intitule: 'Fournitures non stockables, eau' },
  {
    numero: '6052',
    intitule: 'Fournitures non stockables, \u00e9lectricit\u00e9',
  },
  {
    numero: '6053',
    intitule: 'Fournitures non stockables, autres \u00e9nergies',
  },
  { numero: '6055', intitule: 'Fournitures de bureau non stockables' },
  { numero: '6056', intitule: 'Achats de petit mat\u00e9riel et outillage' },
  { numero: '608', intitule: 'Achats d\u2019emballages' },
  { numero: '618', intitule: 'Autres frais de transport' },
  { numero: '6181', intitule: 'Voyages et d\u00e9placements' },
  { numero: '6222', intitule: 'Locations de b\u00e2timents' },
  { numero: '624', intitule: 'Entretien, r\u00e9parations et maintenance' },
  { numero: '625', intitule: 'Primes d\u2019assurance' },
  {
    numero: '627',
    intitule: 'Publicit\u00e9, publications, relations publiques',
  },
  { numero: '628', intitule: 'Frais de t\u00e9l\u00e9communications' },
  { numero: '631', intitule: 'Frais bancaires' },
  { numero: '6324', intitule: 'Honoraires' },
  { numero: '641', intitule: 'Imp\u00f4ts et taxes directs' },
  { numero: '658', intitule: 'Charges diverses' },
  {
    numero: '661',
    intitule:
      'R\u00e9mun\u00e9rations directes vers\u00e9es au personnel national',
  },
  { numero: '664', intitule: 'Charges sociales' },
  { numero: '671', intitule: 'Int\u00e9r\u00eats des emprunts' },
  {
    numero: '681',
    intitule: 'Dotations aux amortissements d\u2019exploitation',
  },
  { numero: '701', intitule: 'Ventes de marchandises' },
  { numero: '702', intitule: 'Ventes de produits finis' },
  { numero: '706', intitule: 'Services vendus' },
  { numero: '707', intitule: 'Produits accessoires' },
  { numero: '758', intitule: 'Produits divers' },
  {
    numero: '771',
    intitule: 'Int\u00e9r\u00eats de pr\u00eats et cr\u00e9ances diverses',
  },
  {
    numero: '891',
    intitule: 'Imp\u00f4ts sur les b\u00e9n\u00e9fices de l\u2019exercice',
  },
];

const PLAN = new Map(PLAN_SYSCOHADA.map((c) => [c.numero, c.intitule]));

// Un compte de la comptabilite generale : classes 1 a 8, au moins deux chiffres
export function compteValide(numero: string): boolean {
  return /^[1-8]\d{1,9}$/.test(numero);
}

export function estCompteDuPlan(numero: string): boolean {
  return PLAN.has(numero);
}

// Intitule du compte, sinon de son compte parent le plus proche, sinon de sa classe
export function intituleDe(
  numero: string,
  perso: Map<string, string> = new Map(),
): string {
  for (let n = numero.length; n >= 2; n--) {
    const racine = numero.slice(0, n);
    const trouve = perso.get(racine) ?? PLAN.get(racine);
    if (trouve) return trouve;
  }
  return CLASSES[numero[0]] ?? `Compte ${numero}`;
}
