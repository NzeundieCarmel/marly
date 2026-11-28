import type { PaiementAchat } from "@/lib/api";

export const PAIEMENTS: { valeur: PaiementAchat; libelle: string }[] = [
  { valeur: "A_CREDIT", libelle: "À crédit (à payer plus tard)" },
  { valeur: "ESPECES", libelle: "Payé en espèces" },
  { valeur: "MTN_MOMO", libelle: "Payé par MTN MoMo" },
  { valeur: "ORANGE_MONEY", libelle: "Payé par Orange Money" },
  { valeur: "VIREMENT", libelle: "Payé par virement" },
];

export function libellePaiement(p: PaiementAchat): string {
  return PAIEMENTS.find((x) => x.valeur === p)?.libelle ?? p;
}