// Lecture d'un ticket ou d'une facture : du texte brut (OCR) aux montants, à la date et au tiers.
// Fonction pure, sans accès à la base : elle se teste seule (analyse.spec.ts).

export interface ContexteLecture {
  raisonSociale: string;
  niu: string | null;
  regime: 'REEL' | 'IGS';
  tauxTva: number;
  aujourdhui: Date;
}

export type ChampLu =
  'montantTtc' | 'montantHt' | 'tva' | 'date' | 'tiers' | 'niuTiers';

export interface ResultatLecture {
  nature: 'ACHAT' | 'VENTE';
  montantTtc: number | null;
  montantHt: number | null;
  tva: number | null;
  tvaCalculee: boolean;
  date: string | null;
  tiers: string | null;
  niuTiers: string | null;
  champsLus: ChampLu[];
}

const MOIS: Record<string, number> = {
  JAN: 1,
  FEV: 2,
  MAR: 3,
  AVR: 4,
  MAI: 5,
  JUIN: 6,
  JUIL: 7,
  AOU: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const MOTS_GENERIQUES = new Set([
  'SARL',
  'SARLU',
  'ETS',
  'ETABLISSEMENTS',
  'ETABLISSEMENT',
  'SOCIETE',
  'ENTREPRISE',
  'CAMEROUN',
  'GROUPE',
  'GLOBAL',
  'SERVICES',
]);

// Lignes qui ne sont jamais le nom d'un fournisseur
const EXCLUS_TIERS =
  /(FACTURE|TICKET|RECU|DATE|TEL|PHONE|CAISSE|BIENVENUE|MERCI|NIU|RCCM|\bB\.?P\b|ADRESSE|CLIENT|WWW|@|TOTAL|MONTANT|TVA|N°|NO\s*\d)/;
// Lignes où un nombre n'est jamais un montant
const EXCLUS_MONTANT =
  /(TEL|PHONE|NIU|RCCM|\bB\.?P\b|FACTURE\s*N|TICKET\s*N|N°|CODE|REF)/;

function majuscules(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

function retirerDates(t: string): string {
  return t
    .replace(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/g, ' ')
    .replace(/\d{4}-\d{2}-\d{2}/g, ' ')
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ');
}

// Les montants d'une ligne : 23 850 · 23.850 · 23,850 · 23850 · 23 850,00
export function montantsDe(ligne: string): number[] {
  const propre = retirerDates(ligne).replace(/\d+(?:[.,]\d+)?\s*%/g, ' ');
  const resultats: number[] = [];
  const motif = /(\d{1,3}(?:[ \u00a0.,]\d{3})+|\d+)(?:[.,]\d{1,2}(?!\d))?/g;
  for (const m of propre.matchAll(motif)) {
    const valeur = Number(m[1].replace(/[ \u00a0.,]/g, ''));
    if (Number.isFinite(valeur) && valeur > 0 && valeur < 1_000_000_000) {
      resultats.push(valeur);
    }
  }
  return resultats;
}

// Montant d'une ligne-clé : le dernier nombre de la ligne, sinon le premier de la ligne suivante
function montantApres(lignes: string[], index: number): number | null {
  const ici = montantsDe(lignes[index]);
  if (ici.length > 0) return ici[ici.length - 1];
  const suivante = lignes[index + 1];
  if (suivante !== undefined) {
    const la = montantsDe(suivante);
    if (la.length > 0) return la[0];
  }
  return null;
}

function chercher(
  lignes: string[],
  maj: string[],
  cles: RegExp[],
  exclure?: RegExp,
): number | null {
  for (const cle of cles) {
    let meilleur: number | null = null;
    maj.forEach((l, i) => {
      if (!cle.test(l) || (exclure && exclure.test(l))) return;
      const v = montantApres(lignes, i);
      if (v !== null && (meilleur === null || v > meilleur)) meilleur = v;
    });
    if (meilleur !== null) return meilleur;
  }
  return null;
}

function dateValide(
  annee: number,
  mois: number,
  jour: number,
  aujourdhui: Date,
): string | null {
  if (annee < 100) annee += 2000;
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (
    d.getUTCFullYear() !== annee ||
    d.getUTCMonth() !== mois - 1 ||
    d.getUTCDate() !== jour
  ) {
    return null;
  }
  const max = aujourdhui.getTime() + 86_400_000;
  const min = aujourdhui.getTime() - 3 * 366 * 86_400_000;
  if (d.getTime() > max || d.getTime() < min) return null;
  return d.toISOString().slice(0, 10);
}

function dateDe(
  lignes: string[],
  maj: string[],
  aujourdhui: Date,
): string | null {
  // Les lignes qui parlent de date d'abord, puis toutes les autres
  const ordre = [
    ...maj.map((l, i) => ({ l, i })).filter((x) => /DATE|LE\s/.test(x.l)),
    ...maj.map((l, i) => ({ l, i })),
  ];
  for (const { i } of ordre) {
    const l = lignes[i];
    for (const m of l.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) {
      const d = dateValide(
        Number(m[1]),
        Number(m[2]),
        Number(m[3]),
        aujourdhui,
      );
      if (d) return d;
    }
    for (const m of l.matchAll(
      /(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4}|\d{2})(?!\d)/g,
    )) {
      const d = dateValide(
        Number(m[3]),
        Number(m[2]),
        Number(m[1]),
        aujourdhui,
      );
      if (d) return d;
    }
    for (const m of maj[i].matchAll(
      /(\d{1,2})\s+(JANV?|FEVR?|MARS|AVR|MAI|JUIN|JUIL|AOUT?|SEPT?|OCT|NOV|DEC)[A-Z.]*\s+(\d{4})/g,
    )) {
      const cle = Object.keys(MOIS).find((k) => m[2].startsWith(k));
      if (!cle) continue;
      const d = dateValide(Number(m[3]), MOIS[cle], Number(m[1]), aujourdhui);
      if (d) return d;
    }
  }
  return null;
}

function nettoyerNom(t: string): string {
  return t
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9.)]+$/g, '')
    .slice(0, 120)
    .trim();
}

// Le document porte-t-il le nom ou le NIU de l'entreprise elle-même ?
function estDeLEntreprise(
  maj: string[],
  nius: string[],
  contexte: ContexteLecture,
): boolean {
  if (contexte.niu && nius.includes(contexte.niu.toUpperCase())) return true;
  const mots = majuscules(contexte.raisonSociale)
    .split(/[^A-Z0-9]+/)
    .filter((m) => m.length >= 4 && !MOTS_GENERIQUES.has(m));
  if (mots.length === 0) return false;
  const entete = ` ${maj.slice(0, 8).join(' ')} `;
  const trouves = mots.filter((m) => entete.includes(m)).length;
  return trouves >= Math.max(1, Math.ceil(mots.length * 0.6));
}

export function analyserTexte(
  texte: string,
  contexte: ContexteLecture,
): ResultatLecture {
  const lignes = texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const maj = lignes.map(majuscules);
  const champsLus: ChampLu[] = [];

  // NIU : une lettre, 12 chiffres, une lettre (espaces et points ignorés)
  const nius = [
    ...new Set(
      maj.flatMap((l) =>
        [...l.replace(/[\s.-]/g, '').matchAll(/[A-Z]\d{12}[A-Z]/g)].map(
          (m) => m[0],
        ),
      ),
    ),
  ];
  const nature = estDeLEntreprise(maj, nius, contexte) ? 'VENTE' : 'ACHAT';
  const propre = contexte.niu?.toUpperCase() ?? null;
  const niuTiers = nius.find((n) => n !== propre) ?? null;

  // Montants : du plus sûr (net à payer, total TTC) au plus vague (total)
  const lignesMontant = maj.map((l) => (EXCLUS_MONTANT.test(l) ? '' : l));
  let montantTtc = chercher(
    lignes,
    lignesMontant,
    [
      /NET\s*A\s*PAYER/,
      /TOTAL\s*T\.?\s?T\.?\s?C/,
      /MONTANT\s*T\.?\s?T\.?\s?C/,
      /TOTAL\s*A\s*PAYER/,
      /\bA\s*PAYER\b/,
      /\bT\.?T\.?C\b/,
      /TOTAL(?!\s*H\.?\s?T)/,
    ],
    /\bH\.?\s?T\b(?!.*T\.?T\.?C)/,
  );
  let montantHt = chercher(
    lignes,
    lignesMontant,
    [/TOTAL\s*H\.?\s?T\b/, /MONTANT\s*H\.?\s?T\b/, /\bH\.?\s?T\b/],
    /T\.?T\.?C/,
  );
  let tva = chercher(
    lignes,
    lignesMontant,
    [/\bT\.?\s?V\.?\s?A\b/],
    /T\.?T\.?C|TOTAL\s*H/,
  );

  if (montantTtc === null) {
    // Sans mot-clé : le plus grand montant d'une ligne en FCFA, sinon le plus grand du document
    const enFcfa = lignes.flatMap((l, i) =>
      /CFA|XAF|FRS?\b/.test(lignesMontant[i]) ? montantsDe(l) : [],
    );
    const tous = lignes.flatMap((l, i) =>
      lignesMontant[i] ? montantsDe(l) : [],
    );
    const candidats = enFcfa.length > 0 ? enFcfa : tous.filter((v) => v >= 100);
    if (candidats.length > 0) montantTtc = Math.max(...candidats);
  }
  if (montantTtc !== null) champsLus.push('montantTtc');

  // Cohérence : deux montants connus donnent le troisième
  if (tva !== null && montantTtc !== null && tva >= montantTtc) tva = null;
  if (montantHt !== null && montantTtc !== null && montantHt > montantTtc)
    montantHt = null;
  if (montantHt !== null) champsLus.push('montantHt');
  if (tva !== null) champsLus.push('tva');
  let tvaCalculee = false;
  if (montantTtc !== null && montantHt !== null && tva === null) {
    tva = montantTtc - montantHt;
    tvaCalculee = true;
  } else if (montantTtc !== null && tva !== null && montantHt === null) {
    montantHt = montantTtc - tva;
    tvaCalculee = true;
  } else if (montantTtc === null && montantHt !== null && tva !== null) {
    montantTtc = montantHt + tva;
    champsLus.push('montantTtc');
  } else if (
    montantTtc !== null &&
    montantHt === null &&
    tva === null &&
    contexte.regime === 'REEL' &&
    maj.some((l) => /\bT\.?V\.?A\b|19[,.]25/.test(l))
  ) {
    montantHt = Math.round((montantTtc * 100) / (100 + contexte.tauxTva));
    tva = montantTtc - montantHt;
    tvaCalculee = true;
  }

  const date = dateDe(lignes, maj, contexte.aujourdhui);
  if (date) champsLus.push('date');

  // Tiers : pour un achat, le nom en tête du ticket ; pour une vente, le client indiqué
  let tiers: string | null = null;
  if (nature === 'VENTE') {
    for (let i = 0; i < maj.length && !tiers; i++) {
      const m =
        /(CLIENT|DOIT|ACHETEUR|A L.ATTENTION DE)\s*[:\-.]?\s*(.*)$/.exec(
          maj[i],
        );
      if (!m) continue;
      const reste = lignes[i].slice(lignes[i].length - m[2].length);
      const nom = nettoyerNom(reste || lignes[i + 1] || '');
      if (nom.length >= 2) tiers = nom;
    }
  } else {
    for (let i = 0; i < Math.min(6, lignes.length) && !tiers; i++) {
      const l = maj[i];
      const lettres = (l.match(/[A-Z]/g) ?? []).length;
      if (lettres < 3 || lettres / l.length < 0.5 || EXCLUS_TIERS.test(l))
        continue;
      const nom = nettoyerNom(lignes[i]);
      if (nom.length >= 3) tiers = nom;
    }
  }
  if (tiers) champsLus.push('tiers');
  if (niuTiers) champsLus.push('niuTiers');

  return {
    nature,
    montantTtc,
    montantHt,
    tva,
    tvaCalculee,
    date,
    tiers,
    niuTiers,
    champsLus,
  };
}
