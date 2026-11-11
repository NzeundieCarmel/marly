// Échéance mensuelle des déclarations : le 15 du mois (même règle que l'API)

export function prochaineEcheance(aujourdhui: Date): Date {
  const echeance = new Date(
    Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), 15, 12),
  );
  if (aujourdhui.getUTCDate() > 15) {
    echeance.setUTCMonth(echeance.getUTCMonth() + 1);
  }
  return echeance;
}

export function joursAvant(echeance: Date, maintenant: Date): number {
  return Math.max(0, Math.ceil((echeance.getTime() - maintenant.getTime()) / 86_400_000));
}

export function formatJourMois(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function versIsoJour(date: Date): string {
  return date.toISOString().slice(0, 10);
}