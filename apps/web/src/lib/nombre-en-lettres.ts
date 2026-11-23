const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit",
  "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

function moinsDeCent(n: number): string {
  if (n < 17) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  if (n < 70) {
    const dizaine = DIZAINES[Math.floor(n / 10)];
    const unite = n % 10;
    if (unite === 0) return dizaine;
    if (unite === 1) return `${dizaine} et un`;
    return `${dizaine}-${UNITES[unite]}`;
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${moinsDeCent(n - 60)}`;
  if (n === 80) return "quatre-vingts";
  return `quatre-vingt-${moinsDeCent(n - 80)}`;
}

// accord : « cents » et « quatre-vingts » prennent un s en fin de nombre ou devant million et milliard, jamais devant mille
function moinsDeMille(n: number, accord: boolean): string {
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  let texte = "";
  if (centaines > 0) {
    texte = centaines === 1 ? "cent" : `${UNITES[centaines]} cent`;
    if (centaines > 1 && reste === 0 && accord) texte += "s";
  }
  if (reste > 0) {
    const fin = reste === 80 && !accord ? "quatre-vingt" : moinsDeCent(reste);
    texte = texte ? `${texte} ${fin}` : fin;
  }
  return texte;
}

// Écrit un montant entier en toutes lettres, selon l'orthographe traditionnelle
export function nombreEnLettres(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) {
    throw new RangeError("Montant hors limites");
  }
  if (n === 0) return "zéro";
  const milliards = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const milliers = Math.floor((n % 1e6) / 1000);
  const unites = n % 1000;
  const parties: string[] = [];
  if (milliards) parties.push(`${moinsDeMille(milliards, true)} milliard${milliards > 1 ? "s" : ""}`);
  if (millions) parties.push(`${moinsDeMille(millions, true)} million${millions > 1 ? "s" : ""}`);
  if (milliers) parties.push(milliers === 1 ? "mille" : `${moinsDeMille(milliers, false)} mille`);
  if (unites) parties.push(moinsDeMille(unites, true));
  return parties.join(" ");
}