import type { Ton } from "@/components/pastille";
import type { StatutPiece } from "./api";

type Statuts = Record<StatutPiece, { ton: Ton; texte: string }>;

const CABINET: Statuts = {
  EN_ATTENTE: { ton: "neutral", texte: "En attente" },
  RECUE: { ton: "info", texte: "Reçue" },
  A_COMPLETER: { ton: "warning", texte: "À compléter" },
  TRAITEE: { ton: "success", texte: "Traitée" },
  REMPLACEE: { ton: "neutral", texte: "Remplacée" },
};

const AUTONOME: Statuts = {
  EN_ATTENTE: { ton: "neutral", texte: "En attente" },
  RECUE: { ton: "success", texte: "Rangée" },
  A_COMPLETER: { ton: "warning", texte: "À reprendre" },
  TRAITEE: { ton: "success", texte: "Rangée" },
  REMPLACEE: { ton: "neutral", texte: "Remplacée" },
};

export function statutsPiece(autonome: boolean): Statuts {
  return autonome ? AUTONOME : CABINET;
}