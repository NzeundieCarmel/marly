import { lirePaiement, type FactureDetail } from "@/lib/api";
import { SuiviPaiement } from "./suivi-paiement";

// Lit le paiement côté serveur, puis confie l'affichage au panneau interactif
export async function PanneauPaiement({ facture, aujourdhui }: { facture: FactureDetail; aujourdhui: string }) {
  const paiement = await lirePaiement(facture.id);
  return (
    <SuiviPaiement
      paiement={paiement}
      aujourdhui={aujourdhui}
      dateEmission={facture.dateEmission?.slice(0, 10) ?? aujourdhui}
    />
  );
}