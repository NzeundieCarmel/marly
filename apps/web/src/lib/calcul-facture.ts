import type { Regime } from "./api";

export function calculerFacture(
  lignes: { quantite: number; prixUnitaire: number }[],
  regime: Regime,
  tauxTva: number,
  tauxRetenue: number,
) {
  const totaux = lignes.map((l) => Math.round(l.quantite * l.prixUnitaire));
  const totalHt = totaux.reduce((somme, t) => somme + t, 0);
  const totalTva = regime === "REEL" ? Math.round((totalHt * tauxTva) / 100) : 0;
  const totalTtc = totalHt + totalTva;
  const retenue = Math.round((totalHt * tauxRetenue) / 100);
  return { totaux, totalHt, totalTva, totalTtc, retenue, netAPayer: totalTtc - retenue };
}

// Jour à l'heure du Cameroun, au format AAAA-MM-JJ
export function jourDouala(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatJour(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

export function formatTaux(taux: number): string {
  return `${String(taux).replace(".", ",")} %`;
}