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
  autonome: boolean;
  dossier: { id: string; raisonSociale: string } | null;
}

export interface Piece {
  id: string;
  date: string;
  montantTtc: number;
  fournisseur: string | null;
  categorie: string;
  statut: StatutPiece;
  fichier: string | null;
  factureId: string | null;
  empreinte: string | null;
  creeLe: string;
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
    factureId: string | null;
    empreinte: string | null;
    recueLe: string;
  };
  dossier: { id: string; raisonSociale: string; regime: Regime; tauxTva: number; niu: string | null };
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


export interface ApercuExport {
  nbPieces: number;
  nbLignes: number;
  totalDebit: number;
  totalCredit: number;
  du: string | null;
  au: string | null;
}

export interface LotExport {
  id: string;
  creeLe: string;
  creePar: string;
  nbPieces: number;
  nbLignes: number;
  totalDebit: number;
  totalCredit: number;
}

export function lireApercuExport(dossierId: string): Promise<ApercuExport> {
  return appelerApi<ApercuExport>(`/dossiers/${encodeURIComponent(dossierId)}/exports/apercu`);
}

export function listerExports(dossierId: string): Promise<LotExport[]> {
  return appelerApi<LotExport[]>(`/dossiers/${encodeURIComponent(dossierId)}/exports`);
}


export interface FicheDossier {
  id: string;
  raisonSociale: string;
  regime: Regime;
  niu: string | null;
  rccm: string | null;
  tauxTva: number;
}

export function lireDossier(dossierId: string): Promise<FicheDossier> {
  return appelerApi<FicheDossier>(`/dossiers/${encodeURIComponent(dossierId)}`);
}


export interface Membre {
  id: string;
  nom: string;
  email: string | null;
  role: RoleMarly;
}

export interface ResumeInvitation {
  id: string;
  role: RoleMarly;
  nom: string;
  telephone: string | null;
  email: string | null;
  statut: "EN_ATTENTE" | "ACCEPTEE" | "ANNULEE";
  expiree: boolean;
  expireLe: string;
  creeLe: string;
  accepteeLe: string | null;
  dossierId: string | null;
}

export interface Acces {
  membres: Membre[];
  invitations: ResumeInvitation[];
}

// Avec un dossier : le gérant et ses invitations. Sans : l'équipe du cabinet
export function lireAcces(dossierId?: string): Promise<Acces> {
  const filtre = dossierId ? `?dossierId=${encodeURIComponent(dossierId)}` : "";
  return appelerApi<Acces>(`/invitations${filtre}`);
}


export interface LigneTableau {
  id: string;
  raisonSociale: string;
  regime: Regime;
  recues: number;
  demandees: number;
  attendues: number;
  aValider: number;
  aCompleter: number;
  pretesExport: number;
  derniereLe: string | null;
  premiereAValiderId: string | null;
}

export interface Activite {
  type: "piece" | "demande" | "acces" | "export";
  le: string;
  titre: string;
  dossierId: string | null;
  dossier: string | null;
}

export interface TableauDeBord {
  stats: {
    recues: number;
    recuesSemaine: number;
    aValider: number;
    dossiersAValider: number;
    demandees: number;
    aReprendre: number;
    exportees: number;
    dernierExport: string | null;
  };
  export: { pieces: number; debit: number; credit: number };
  premiereAValiderId: string | null;
  dossiers: LigneTableau[];
  activite: Activite[];
}

export function lireTableauDeBord(): Promise<TableauDeBord> {
  return appelerApi<TableauDeBord>("/tableau-de-bord");
}


export interface Comptable {
  id: string;
  nom: string;
  ville: string | null;
}

export type StatutRattachement = "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "ANNULEE";

export interface MonRattachement {
  id: string;
  statut: StatutRattachement;
  cabinet: string;
  message: string | null;
  creeLe: string;
  traiteeLe: string | null;
}

export function listerComptables(): Promise<Comptable[]> {
  return appelerApi<Comptable[]>("/comptables");
}

export async function lireMonRattachement(): Promise<MonRattachement | null> {
  return (await appelerApi<{ demande: MonRattachement | null }>("/rattachements/mien")).demande;
}


export interface RattachementRecu {
  id: string;
  message: string | null;
  creeLe: string;
  dossier: { id: string; raisonSociale: string; regime: Regime; nbPieces: number };
  gerant: { nom: string; email: string | null };
}

export function listerRattachementsRecus(): Promise<RattachementRecu[]> {
  return appelerApi<RattachementRecu[]>("/rattachements");
}


export interface FicheFacturation {
  formeJuridique: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  centreImpots: string | null;
  banque: string | null;
  compte: string | null;
  conditionsPaiement: string | null;
  penalitesRetard: string | null;
}

export interface ProfilEmetteur {
  raisonSociale: string;
  regime: Regime;
  tauxTva: number;
  niu: string | null;
  rccm: string | null;
  autonome: boolean;
  fiche: FicheFacturation;
  manquants: string[];
}

export interface ClientFacture {
  id: string;
  nom: string;
  adresse: string | null;
  niu: string | null;
  telephone: string | null;
  email: string | null;
}

export function lireProfilEmetteur(): Promise<ProfilEmetteur> {
  return appelerApi<ProfilEmetteur>("/facturation/profil");
}

export function listerClientsFacture(q?: string): Promise<ClientFacture[]> {
  const filtre = q ? `?q=${encodeURIComponent(q)}` : "";
  return appelerApi<ClientFacture[]>(`/facturation/clients${filtre}`);
}

export function lireClientFacture(id: string): Promise<ClientFacture> {
  return appelerApi<ClientFacture>(`/facturation/clients/${encodeURIComponent(id)}`);
}


export type TypeFacture = "FACTURE" | "AVOIR";
export type StatutFacture = "BROUILLON" | "EMISE" | "ANNULEE";

export interface FactureResume {
  id: string;
  type: TypeFacture;
  statut: StatutFacture;
  numero: string | null;
  client: string;
  dateEmission: string | null;
  totalTtc: number;
  netAPayer: number;
  creeLe: string;
}

export interface FactureDetail extends FactureResume {
  clientId: string;
  clientDetail: { nom: string; adresse: string | null; niu: string | null; telephone: string | null; email: string | null };
  dateEcheance: string | null;
  regime: Regime;
  tauxTva: number;
  tauxRetenue: number;
  totalHt: number;
  totalTva: number;
  retenue: number;
  lignes: { designation: string; detail: string | null; quantite: number; prixUnitaire: number; totalHt: number }[];
  factureOrigine: { id: string; numero: string | null } | null;
  avoir: { id: string; numero: string | null } | null;
  jetonPartage: string | null;
  emetteur: EmetteurFige | null;
}


export function listerFactures(): Promise<FactureResume[]> {
  return appelerApi<FactureResume[]>("/facturation/factures");
}

export function lireFacture(id: string): Promise<FactureDetail> {
  return appelerApi<FactureDetail>(`/facturation/factures/${encodeURIComponent(id)}`);
}


export interface EmetteurFige {
  raisonSociale: string;
  niu: string | null;
  rccm: string | null;
  regime: Regime;
  formeJuridique: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  centreImpots: string | null;
  banque: string | null;
  compte: string | null;
  conditionsPaiement: string | null;
  penalitesRetard: string | null;
}

export interface FactureDocument {
  type: TypeFacture;
  statut: StatutFacture;
  numero: string | null;
  dateEmission: string | null;
  dateEcheance: string | null;
  regime: Regime;
  tauxTva: number;
  tauxRetenue: number;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  retenue: number;
  netAPayer: number;
  client: FactureDetail["clientDetail"];
  emetteur: EmetteurFige | null;
  lignes: FactureDetail["lignes"];
  factureOrigine: { numero: string | null } | null;
  avoir: { numero: string | null } | null;
}

// Lecture sans session, pour le lien public envoyé au client
export async function lireFacturePublique(jeton: string): Promise<FactureDocument | null> {
  try {
    const reponse = await fetch(`${API_URL}/public/factures/${encodeURIComponent(jeton)}`, { cache: "no-store" });
    if (!reponse.ok) return null;
    return (await reponse.json()) as FactureDocument;
  } catch {
    return null;
  }
}
 

// Le document d'une vente émise avec Marly, pour le cabinet qui valide la pièce
export function lireFactureDePiece(pieceId: string): Promise<FactureDocument> {
  return appelerApi<FactureDocument>(`/pieces/${encodeURIComponent(pieceId)}/facture`);
}