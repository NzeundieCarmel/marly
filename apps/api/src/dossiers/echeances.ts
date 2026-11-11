// Échéance mensuelle des déclarations : le 15 du mois
// (les dates sont fixées à midi UTC pour ne jamais changer de jour selon le fuseau)

export function prochaineEcheance(aujourdhui: Date): Date {
  const echeance = new Date(
    Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), 15, 12),
  );
  if (aujourdhui.getUTCDate() > 15) {
    echeance.setUTCMonth(echeance.getUTCMonth() + 1);
  }
  return echeance;
}

export function dateAMidi(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}