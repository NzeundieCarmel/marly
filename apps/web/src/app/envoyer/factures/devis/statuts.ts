import type { StatutDevis } from "@/lib/api";
import type { Ton } from "@/components/pastille";

export const STATUTS_DEVIS: Record<StatutDevis, { ton: Ton; texte: string }> = {
  EN_COURS: { ton: "warning", texte: "En cours" },
  ACCEPTE: { ton: "success", texte: "Accepté" },
  REFUSE: { ton: "danger", texte: "Refusé" },
  TRANSFORME: { ton: "info", texte: "Facturé" },
};