// Mise en forme des montants, dates et noms, à l'heure du Cameroun

const FUSEAU = "Africa/Douala";
const NOMBRE = new Intl.NumberFormat("fr-FR");

export function formatMontant(montant: number): string {
  return NOMBRE.format(montant);
}

// « Lundi 9 novembre 2026 »
export function formatDateLongue(date: Date): string {
  const texte = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: FUSEAU,
  });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// « le 18 nov. à 17 h 05 »
export function formatDateHeure(iso: string): string {
  const date = new Date(iso);
  const jour = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: FUSEAU });
  const heure = date
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: FUSEAU })
    .replace(":", " h ");
  return `le ${jour} à ${heure}`;
}

// « il y a 20 min », « il y a 2 h », « hier », « il y a 3 jours »
export function ilYa(iso: string | null, maintenant: Date): string {
  if (!iso) return "aucun envoi";
  const minutes = Math.round((maintenant.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  if (jours === 1) return "hier";
  if (jours < 7) return `il y a ${jours} jours`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: FUSEAU });
}

// « Quincaillerie Essomba » → « QE »
export function initiales(nom: string): string {
  const mots = nom.split(/\s+/).filter((m) => m.length > 2);
  const lettres = mots.slice(0, 2).map((m) => m.charAt(0).toUpperCase()).join("");
  return lettres || nom.slice(0, 2).toUpperCase();
}

export function prenom(nom: string): string {
  return nom.split(/\s+/)[0] ?? nom;
}