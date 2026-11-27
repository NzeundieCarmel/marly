import type { EtatStock } from "@/lib/api";
import { formatMontant } from "@/lib/format";

export const UNITES = ["unité", "sac", "kg", "litre", "mètre", "carton", "paquet", "rouleau", "barre", "feuille", "seau"];

const PASTILLES: Record<EtatStock, { texte: string; classe: string }> = {
  EN_STOCK: { texte: "En stock", classe: "bg-success-bg text-success-ink" },
  STOCK_BAS: { texte: "Stock bas", classe: "bg-warning-bg text-warning-ink" },
  RUPTURE: { texte: "Rupture", classe: "bg-danger-bg text-danger-ink" },
  SANS_SUIVI: { texte: "Sans stock", classe: "border border-line text-muted" },
};

export function PastilleStock({ etat }: { etat: EtatStock }) {
  const p = PASTILLES[etat];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium ${p.classe}`}>
      {p.texte}
    </span>
  );
}

export function Quantite({ valeur, unite }: { valeur: number; unite: string }) {
  return (
    <span className="tabular-nums">
      {formatMontant(valeur)} {unite}
    </span>
  );
}

// Prix de vente TTC ramené hors taxes (taux en centièmes de pour cent)
export function prixHorsTaxes(prixTtc: number, tauxTva: number): number {
  return Math.round((prixTtc * 10000) / (10000 + tauxTva));
}