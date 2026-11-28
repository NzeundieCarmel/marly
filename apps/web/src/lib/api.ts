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
  numero: string | null;
  montantHt: number | null;
  tva: number | null;
  niuTiers: string | null;
  luAuto: boolean;
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
  ecriture: {
    journal: string;
    proposee: boolean;
    lignes: LigneEcriture[];
    souvenir?: { compte: string; fois: number; source: "dossier" | "cabinet" } | null;
  };
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
  lignes: { articleId?: string | null; designation: string; detail: string | null; quantite: number; prixUnitaire: number; totalHt: number }[];
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
export type EtatPaiement = "PAYEE" | "PARTIELLE" | "EN_RETARD" | "A_PAYER";
export type ModeReglement = "ESPECES" | "VIREMENT" | "MTN_MOMO" | "ORANGE_MONEY" | "CHEQUE" | "AUTRE";

export interface Reglement {
  id: string;
  date: string;
  montant: number;
  mode: ModeReglement;
  reference: string | null;
}

export interface Paiement {
  factureId: string;
  netAPayer: number;
  montantRegle: number;
  reste: number;
  etat: EtatPaiement | null;
  dateEcheance: string | null;
  derniereRelanceLe: string | null;
  reglements: Reglement[];
}

export interface ResumePaiement {
  factureId: string;
  etat: EtatPaiement | null;
  reste: number;
}

export function lirePaiement(factureId: string): Promise<Paiement> {
  return appelerApi<Paiement>(`/facturation/factures/${encodeURIComponent(factureId)}/paiement`);
}

export function listerPaiements(): Promise<ResumePaiement[]> {
  return appelerApi<ResumePaiement[]>("/facturation/paiements");
}
export interface EntreeJournal {
  id: string;
  creeLe: string;
  nomUtilisateur: string;
  role: RoleMarly;
  action: string;
  cible: string | null;
  ip: string | null;
  dossierId: string | null;
  dossier: string | null;
}

export function lireJournal(dossierId?: string): Promise<EntreeJournal[]> {
  const filtre = dossierId ? `?dossierId=${encodeURIComponent(dossierId)}` : "";
  return appelerApi<EntreeJournal[]>(`/journal${filtre}`);
}
// Comptabilité générale du dossier : plan, balance, journaux, grand livre
export interface CompteDuPlan {
  numero: string;
  intitule: string;
  perso: boolean;
}

export interface LigneBalance {
  compte: string;
  intitule: string;
  debit: number;
  credit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export interface Balance {
  lignes: LigneBalance[];
  totalDebit: number;
  totalCredit: number;
  equilibree: boolean;
}

export interface EcritureJournal {
  id: string;
  journal: string;
  numero: number;
  date: string;
  libelle: string;
  origine: "PIECE" | "CAISSE" | "STOCK" | "MANUELLE" | "ACHAT";
  mouvements: { compte: string; intitule: string; libelle: string; tiers: string | null; debit: number; credit: number }[];
}

export interface GrandLivreCompte {
  compte: string;
  intitule: string;
  soldeInitial: number;
  lignes: {
    date: string;
    journal: string;
    numero: number;
    compte: string;
    libelle: string;
    tiers: string | null;
    debit: number;
    credit: number;
    solde: number;
  }[];
  totalDebit: number;
  totalCredit: number;
  soldeFinal: number;
}

function cheminCompta(dossierId: string, suite: string): string {
  return `/dossiers/${encodeURIComponent(dossierId)}/comptabilite/${suite}`;
}

export function lirePlanComptable(dossierId: string): Promise<CompteDuPlan[]> {
  return appelerApi<CompteDuPlan[]>(cheminCompta(dossierId, "plan"));
}

export function lireBalance(dossierId: string, du?: string, au?: string): Promise<Balance> {
  const p = new URLSearchParams();
  if (du) p.set("du", du);
  if (au) p.set("au", au);
  const q = p.toString();
  return appelerApi<Balance>(cheminCompta(dossierId, `balance${q ? `?${q}` : ""}`));
}

export function lireJournalComptable(dossierId: string, journal?: string): Promise<EcritureJournal[]> {
  const q = journal ? `?journal=${encodeURIComponent(journal)}` : "";
  return appelerApi<EcritureJournal[]>(cheminCompta(dossierId, `journal${q}`));
}

export function lireGrandLivre(dossierId: string, compte: string): Promise<GrandLivreCompte> {
  return appelerApi<GrandLivreCompte>(cheminCompta(dossierId, `grand-livre?compte=${encodeURIComponent(compte)}`));
}
// Stock : articles, mouvements et valeur au coût moyen pondéré
export type EtatStock = "EN_STOCK" | "STOCK_BAS" | "RUPTURE" | "SANS_SUIVI";

export interface Article {
  id: string;
  reference: string;
  nom: string;
  categorie: string | null;
  unite: string;
  prixVente: number;
  tauxTva: number;
  suiviStock: boolean;
  seuilAlerte: number;
  quantite: number;
  valeurStock: number;
  coutMoyen: number;
  actif: boolean;
  etat: EtatStock;
}

export interface MouvementStock {
  id: string;
  type: "ENTREE" | "SORTIE" | "INVENTAIRE";
  date: string;
  quantite: number;
  coutUnitaire: number;
  valeur: number;
  quantiteApres: number;
  valeurApres: number;
  motif: string;
  origine: string | null;
}

export interface FicheArticle extends Article {
  mouvements: MouvementStock[];
}

export interface ResumeStock {
  articles: number;
  valeur: number;
  ruptures: number;
  stockBas: number;
}

function cheminStock(dossierId: string, suite: string): string {
  return `/dossiers/${encodeURIComponent(dossierId)}/stock/${suite}`;
}

export function listerArticles(dossierId: string, recherche?: string, alerte?: boolean): Promise<Article[]> {
  const params = new URLSearchParams();
  if (recherche) params.set("recherche", recherche);
  if (alerte) params.set("alerte", "1");
  const q = params.toString();
  return appelerApi<Article[]>(cheminStock(dossierId, `articles${q ? `?${q}` : ""}`));
}

export function lireArticle(dossierId: string, id: string): Promise<FicheArticle> {
  return appelerApi<FicheArticle>(cheminStock(dossierId, `articles/${encodeURIComponent(id)}`));
}

export function lireResumeStock(dossierId: string): Promise<ResumeStock> {
  return appelerApi<ResumeStock>(cheminStock(dossierId, "resume"));
}
// Caisse : sessions (journée de caisse) et tickets
export type ModeCaisse = "ESPECES" | "MTN_MOMO" | "ORANGE_MONEY";

export interface SessionCaisse {
  id: string;
  ouverteLe: string;
  fondInitial: number;
  ventes: number;
  totalTtc: number;
  parMode: Record<ModeCaisse, number>;
  especesAttendues: number;
}

export interface VenteCaisseResume {
  id: string;
  numero: number;
  date: string;
  totalTtc: number;
  mode: ModeCaisse;
}

export interface TicketCaisse {
  id: string;
  numero: number;
  annee: number;
  date: string;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  mode: ModeCaisse;
  montantRecu: number | null;
  monnaie: number | null;
  lignes: { articleId: string; nom: string; quantite: number; prixUnitaire: number; tauxTva: number; totalTtc: number }[];
}

function cheminCaisse(dossierId: string, suite: string): string {
  return `/dossiers/${encodeURIComponent(dossierId)}/caisse/${suite}`;
}

export function lireSessionCaisse(dossierId: string): Promise<{ session: SessionCaisse | null }> {
  return appelerApi<{ session: SessionCaisse | null }>(cheminCaisse(dossierId, "session"));
}

export function listerVentesCaisse(dossierId: string): Promise<VenteCaisseResume[]> {
  return appelerApi<VenteCaisseResume[]>(cheminCaisse(dossierId, "ventes"));
}

export function lireTicket(dossierId: string, id: string): Promise<TicketCaisse> {
  return appelerApi<TicketCaisse>(cheminCaisse(dossierId, `ventes/${encodeURIComponent(id)}`));
}
// Achats de marchandises : entrée en stock et écriture au grand livre
export type PaiementAchat = "A_CREDIT" | "ESPECES" | "MTN_MOMO" | "ORANGE_MONEY" | "VIREMENT";

export interface AchatResume {
  id: string;
  numero: number;
  date: string;
  fournisseur: string;
  totalTtc: number;
  paiement: PaiementAchat;
  statut: "VALIDE" | "ANNULE";
  montantRegle: number;
}

export interface Achat extends AchatResume {
  annee: number;
  referenceFournisseur: string | null;
  avecTva: boolean;
  totalHt: number;
  totalTva: number;
  annuleLe: string | null;
  reste: number;
  reglements: { id: string; date: string; montant: number; mode: PaiementAchat }[];
  lignes: { articleId: string; nom: string; quantite: number; coutUnitaire: number; totalHt: number }[];
}

export function listerAchats(dossierId: string): Promise<AchatResume[]> {
  return appelerApi<AchatResume[]>(`/dossiers/${encodeURIComponent(dossierId)}/achats`);
}

export function lireAchat(dossierId: string, id: string): Promise<Achat> {
  return appelerApi<Achat>(`/dossiers/${encodeURIComponent(dossierId)}/achats/${encodeURIComponent(id)}`);
}

// Devis : proposés au client, puis transformés en brouillon de facture
export type StatutDevis = "EN_COURS" | "ACCEPTE" | "REFUSE" | "TRANSFORME";

export interface DevisResume {
  id: string;
  numero: string;
  statut: StatutDevis;
  client: string;
  dateDevis: string;
  totalTtc: number;
  factureId: string | null;
}

export interface DevisDetail {
  id: string;
  numero: string;
  statut: StatutDevis;
  clientId: string;
  client: ClientFacture;
  dateDevis: string;
  validiteJours: number;
  finValidite: string;
  note: string | null;
  regime: Regime;
  tauxTva: number;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  factureId: string | null;
  lignes: { articleId: string | null; designation: string; detail: string | null; quantite: number; prixUnitaire: number; totalHt: number }[];
}

export function listerDevis(): Promise<DevisResume[]> {
  return appelerApi<DevisResume[]>("/facturation/devis");
}

export function lireDevis(id: string): Promise<DevisDetail> {
  return appelerApi<DevisDetail>(`/facturation/devis/${encodeURIComponent(id)}`);
}
// Accueil du gérant : les chiffres du jour et ce qui demande son attention
export interface Pilotage {
  autonome: boolean;
  caisseOuverte: boolean;
  ventesJour: { caisse: number; tickets: number; factures: number; nombreFactures: number };
  ventesMois: number;
  aEncaisser: number;
  enRetard: number;
  facturesEnRetard: number;
  aPayer: number;
  tresorerie: { caisse: number; banque: number; mobileMoney: number } | null;
  stock: {
    valeur: number;
    ruptures: number;
    stockBas: number;
    alertes: { id: string; nom: string; unite: string; quantite: number; seuilAlerte: number; etat: "RUPTURE" | "STOCK_BAS" }[];
  };
  piecesAComptabiliser: number;
  dernieresVentes: { id: string; numero: number; date: string; totalTtc: number; mode: ModeCaisse }[];
}

export function lirePilotage(dossierId: string): Promise<Pilotage> {
  return appelerApi<Pilotage>(`/dossiers/${encodeURIComponent(dossierId)}/pilotage`);
}