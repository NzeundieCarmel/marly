// Format du fichier d'import d'écritures pour Sage.
// Quand le cabinet fournit son modèle, on ajuste uniquement FORMAT_SAGE.

export type ColonneExport =
  | 'journal'
  | 'date'
  | 'reference'
  | 'compte'
  | 'tiers'
  | 'libelle'
  | 'debit'
  | 'credit';

export interface FormatExport {
  separateur: string;
  formatDate: 'JJ/MM/AAAA' | 'JJMMAA' | 'AAAA-MM-JJ';
  entete: boolean;
  colonnes: ColonneExport[];
  // Complète les comptes à droite avec des 0 (ex. 8 : 401 -> 40100000). null = tel quel
  longueurCompte: number | null;
  // Retire les accents : Sage lit souvent les fichiers en ANSI
  sansAccents: boolean;
  longueurMaxLibelle: number;
  // Ce qu'on écrit quand le débit ou le crédit vaut 0
  montantZero: string;
  finDeLigne: '\r\n' | '\n';
}

export const FORMAT_SAGE: FormatExport = {
  separateur: ';',
  formatDate: 'JJ/MM/AAAA',
  entete: true,
  colonnes: [
    'journal',
    'date',
    'reference',
    'compte',
    'tiers',
    'libelle',
    'debit',
    'credit',
  ],
  longueurCompte: null,
  sansAccents: true,
  longueurMaxLibelle: 35,
  montantZero: '',
  finDeLigne: '\r\n',
};

const TITRES: Record<ColonneExport, string> = {
  journal: 'Journal',
  date: 'Date',
  reference: 'N piece',
  compte: 'Compte',
  tiers: 'Tiers',
  libelle: 'Libelle',
  debit: 'Debit',
  credit: 'Credit',
};

export interface LigneExport {
  journal: string;
  date: Date;
  reference: string;
  compte: string;
  tiers: string | null;
  libelle: string;
  debit: number;
  credit: number;
}

function texte(brut: string, format: FormatExport): string {
  let t = brut.replace(/\s+/g, ' ').trim();
  if (format.sansAccents) {
    t = t
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '');
  }
  // Jamais de séparateur ni de guillemet à l'intérieur d'un champ
  t = t.split(format.separateur).join(' ').replace(/"/g, "'");
  // Un champ commençant par = + - @ serait exécuté comme formule par Excel
  return t.replace(/^[=+@-]+/, '').trim();
}

function formaterDate(date: Date, modele: FormatExport['formatDate']): string {
  const jour = String(date.getUTCDate()).padStart(2, '0');
  const mois = String(date.getUTCMonth() + 1).padStart(2, '0');
  const annee = String(date.getUTCFullYear());
  switch (modele) {
    case 'JJ/MM/AAAA':
      return `${jour}/${mois}/${annee}`;
    case 'JJMMAA':
      return `${jour}${mois}${annee.slice(2)}`;
    case 'AAAA-MM-JJ':
      return `${annee}-${mois}-${jour}`;
  }
}

function valeur(
  ligne: LigneExport,
  colonne: ColonneExport,
  format: FormatExport,
): string {
  switch (colonne) {
    case 'journal':
      return texte(ligne.journal, format);
    case 'date':
      return formaterDate(ligne.date, format.formatDate);
    case 'reference':
      return texte(ligne.reference, format);
    case 'compte': {
      const compte = ligne.compte.trim();
      return format.longueurCompte
        ? compte.padEnd(format.longueurCompte, '0')
        : compte;
    }
    case 'tiers':
      return texte(ligne.tiers ?? '', format);
    case 'libelle':
      return texte(ligne.libelle, format).slice(0, format.longueurMaxLibelle);
    case 'debit':
      return ligne.debit === 0 ? format.montantZero : String(ligne.debit);
    case 'credit':
      return ligne.credit === 0 ? format.montantZero : String(ligne.credit);
  }
}

export function genererCsv(
  lignes: LigneExport[],
  format: FormatExport = FORMAT_SAGE,
): string {
  const sortie: string[] = [];
  if (format.entete) {
    sortie.push(format.colonnes.map((c) => TITRES[c]).join(format.separateur));
  }
  for (const ligne of lignes) {
    sortie.push(
      format.colonnes
        .map((c) => valeur(ligne, c, format))
        .join(format.separateur),
    );
  }
  return sortie.join(format.finDeLigne) + format.finDeLigne;
}
