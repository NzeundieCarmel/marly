import type { Piece } from "./api";

export interface CategorieMois {
  categorie: string;
  total: number;
}

export interface ResumeMois {
  cle: string; // "2026-11"
  libelle: string; // "novembre"
  total: number;
  nombre: number;
  categories: CategorieMois[];
  totalPrecedent: number;
  ventes: number;
}

const CATEGORIE_AVOIR = "Avoir sur ventes";

// "AAAA-MM" d'une date, dans un fuseau donné
export function cleMois(date: Date, fuseau: string): string {
  const parties = new Intl.DateTimeFormat("en-US", {
    timeZone: fuseau,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const valeur = (type: "year" | "month") => parties.find((p) => p.type === type)?.value ?? "";
  return `${valeur("year")}-${valeur("month")}`;
}

function moisPrecedent(cle: string): string {
  const [annee, mois] = cle.split("-").map(Number);
  return cleMois(new Date(Date.UTC(annee, mois - 2, 1)), "UTC");
}

// Les dates de pièces sont enregistrées à minuit UTC ; le mois en cours se lit à l'heure du Cameroun
export function resumerMois(pieces: Piece[], maintenant: Date): ResumeMois {
  const cle = cleMois(maintenant, "Africa/Douala");
  const precedent = moisPrecedent(cle);
  const parCategorie = new Map<string, number>();
  let total = 0;
  let nombre = 0;
  let totalPrecedent = 0;
  let ventes = 0;

  for (const p of pieces) {
    if (p.statut === "REMPLACEE") continue;
    const clePiece = cleMois(new Date(p.date), "UTC");

    // Une facture émise avec Marly est une vente : elle ne compte jamais dans les dépenses
    if (p.factureId) {
      if (clePiece === cle) ventes += p.categorie === CATEGORIE_AVOIR ? -p.montantTtc : p.montantTtc;
      continue;
    }

    if (clePiece === cle) {
      total += p.montantTtc;
      nombre += 1;
      parCategorie.set(p.categorie, (parCategorie.get(p.categorie) ?? 0) + p.montantTtc);
    } else if (clePiece === precedent) {
      totalPrecedent += p.montantTtc;
    }
  }

  const [annee, mois] = cle.split("-").map(Number);
  const libelle = new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    timeZone: "UTC",
  });

  return {
    cle,
    libelle,
    total,
    nombre,
    totalPrecedent,
    ventes,
    categories: [...parCategorie]
      .map(([categorie, montant]) => ({ categorie, total: montant }))
      .sort((a, b) => b.total - a.total),
  };
}