import { notFound, redirect } from "next/navigation";
import { lireJeton } from "./session";

export type Regime = "REEL" | "IGS";
export type RoleMarly = "RESPONSABLE" | "COMPTABLE" | "PME" | "ADMIN";
export type StatutPiece = "EN_ATTENTE" | "RECUE" | "A_COMPLETER" | "TRAITEE" | "REMPLACEE";
export type StatutDemande = "OUVERTE" | "SATISFAITE" | "ANNULEE";

export interface ResumeDossier {
  id: string;
  raisonSociale: string;
  regime: Regime;
  piecesRecues: number;
  aValider: number;
  aCompleter: number;
  demandesOuvertes: number;
}

export interface Profil {
  id: string;
  nom: string;
  email: string | null;
  role: RoleMarly;
  cabinet: string;
  dossier: { id: string; raisonSociale: string } | null;
}

export interface Piece {
  id: string;
  date: string;
  montantTtc: number;
  fournisseur: string | null;
  categorie: string;
  statut: StatutPiece;
}

export interface Demande {
  id: string;
  dossierId: string;
  description: string;
  echeance: string;
  statut: StatutDemande;
  pieceId: string | null;
  reponseId: string | null;
  creeLe: string;
  satisfaiteLe: string | null;
}

export interface LigneEcriture {
  compte: string;
  libelle: string;
  tiers: string | null;
  debit: number;
  credit: number;
}

export interface DetailPiece {
  piece: {
    id: string;
    date: string;
    montantTtc: number;
    fournisseur: string | null;
    categorie: string;
    statut: StatutPiece;
    journal: string | null;
    valideLe: string | null;
    aUnFichier: boolean;
  };
  dossier: { id: string; raisonSociale: string; regime: Regime; tauxTva: number };
  ecriture: { journal: string; proposee: boolean; lignes: LigneEcriture[] };
}

export const API_URL = process.env.API_URL ?? "http://127.0.0.1:4001/api/v1";

async function appelerApi<T>(chemin: string): Promise<T> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }

  const reponse = await fetch(`${API_URL}${chemin}`, {
    headers: { Authorization: `Bearer ${jeton}` },
    cache: "no-store",
  });

  // Jeton expiré ou invalide : retour à l'écran de connexion avec un message
  if (reponse.status === 401) {
    redirect("/connexion?expiree=1");
  }
  // Page réservée au cabinet ouverte par une PME : retour à son écran
  if (reponse.status === 403) {
    redirect("/envoyer");
  }
  if (reponse.status === 404) {
    notFound();
  }
  if (!reponse.ok) {
    throw new Error(`L'API a répondu ${reponse.status}`);
  }
  return (await reponse.json()) as T;
}

export function listerDossiers(): Promise<ResumeDossier[]> {
  return appelerApi<ResumeDossier[]>("/dossiers");
}

export function lireProfil(): Promise<Profil> {
  return appelerApi<Profil>("/auth/moi");
}

export function listerPieces(dossierId: string): Promise<Piece[]> {
  return appelerApi<Piece[]>(`/dossiers/${encodeURIComponent(dossierId)}/pieces`);
}

export function lirePiece(pieceId: string): Promise<DetailPiece> {
  return appelerApi<DetailPiece>(`/pieces/${encodeURIComponent(pieceId)}`);
}

export function listerDemandes(dossierId: string): Promise<Demande[]> {
  return appelerApi<Demande[]>(`/dossiers/${encodeURIComponent(dossierId)}/demandes`);
}