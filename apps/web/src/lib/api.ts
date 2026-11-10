export type Regime = "REEL" | "IGS";

export interface ResumeDossier {
  id: string;
  raisonSociale: string;
  regime: Regime;
  piecesRecues: number;
  aValider: number;
  aCompleter: number;
}

const API_URL = process.env.API_URL ?? "http://127.0.0.1:4001/api/v1";

export async function listerDossiers(): Promise<ResumeDossier[]> {
  const reponse = await fetch(`${API_URL}/dossiers`, { cache: "no-store" });
  if (!reponse.ok) {
    throw new Error(`L'API a répondu ${reponse.status}`);
  }
  return (await reponse.json()) as ResumeDossier[];
}