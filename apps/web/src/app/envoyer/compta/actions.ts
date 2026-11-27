"use server";

import { redirect } from "next/navigation";
import { API_URL, type DetailPiece } from "@/lib/api";
import { lireJeton } from "@/lib/session";
import { APPORTS, CHARGES, TRESORERIES } from "./operations";

export interface EtatAction {
  erreur: string | null;
}

type Reponse = { statut: number; corps: unknown };

// Appel de l'API avec la session ; l'expiration renvoie vers la connexion, hors de tout try
async function appeler(methode: "GET" | "POST", chemin: string, corps?: unknown): Promise<Reponse> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  let reponse: Response | null = null;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      cache: "no-store",
    });
  } catch {
    reponse = null;
  }
  if (reponse?.status === 401) {
    redirect("/connexion?expiree=1");
  }
  if (!reponse) {
    return { statut: 0, corps: null };
  }
  return { statut: reponse.status, corps: await reponse.json().catch(() => null) };
}

function messageErreur(r: Reponse): string {
  if (r.statut === 0) return "Marly est injoignable pour le moment. Réessayez dans un instant.";
  if (r.statut === 403) return "La comptabilité de votre entreprise est tenue par votre cabinet.";
  const message = (r.corps as { message?: string | string[] } | null)?.message;
  const texte = Array.isArray(message) ? message[0] : message;
  return texte ? `L'opération a été refusée : ${texte}` : "L'opération a été refusée.";
}

// Toutes les pièces reçues, avec l'écriture proposée par Marly
export async function comptabiliserTout(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const r = await appeler("POST", `/dossiers/${encodeURIComponent(dossierId)}/comptabilite/comptabiliser`);
  if (r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  const { comptabilisees, ignorees } = r.corps as { comptabilisees: number; ignorees: number };
  redirect(`/envoyer/compta?comptabilisees=${comptabilisees}&ignorees=${ignorees}`);
}

// Une seule pièce, telle que Marly la propose
export async function comptabiliserPiece(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const pieceId = String(donnees.get("pieceId") ?? "");
  const chemin = `/pieces/${encodeURIComponent(pieceId)}`;
  const detail = await appeler("GET", chemin);
  if (detail.statut !== 200) {
    return { erreur: messageErreur(detail) };
  }
  const { ecriture } = detail.corps as DetailPiece;
  const r = await appeler("POST", `${chemin}/valider`, {
    journal: ecriture.journal,
    lignes: ecriture.lignes.map((l) => ({ ...l, libelle: l.libelle.slice(0, 80) })),
  });
  if (r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  redirect(`/envoyer/pieces/${encodeURIComponent(pieceId)}`);
}

// Une opération courante, traduite en écriture équilibrée
export async function saisirOperation(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const dossierId = String(donnees.get("dossierId") ?? "");
  const operation = String(donnees.get("operation") ?? "");
  const date = String(donnees.get("date") ?? "");
  const montant = Number(String(donnees.get("montant") ?? "").replace(/[\s  ]/g, ""));
  const libelleSaisi = String(donnees.get("libelle") ?? "").trim();
  const tresorerie = TRESORERIES[String(donnees.get("tresorerie") ?? "")] ?? TRESORERIES.caisse;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { erreur: "Indiquez la date de l'opération." };
  }
  if (!Number.isInteger(montant) || montant <= 0) {
    return { erreur: "Indiquez un montant en FCFA, sans décimales." };
  }

  let journal = tresorerie.journal;
  let debit = "";
  let credit = "";
  let libelle = "";
  switch (operation) {
    case "depense": {
      const charge = CHARGES.find((c) => c.compte === donnees.get("charge"));
      if (!charge) return { erreur: "Choisissez la nature de la dépense." };
      [debit, credit, libelle] = [charge.compte, tresorerie.compte, charge.libelle];
      break;
    }
    case "apport": {
      const apport = APPORTS.find((a) => a.compte === donnees.get("apport"));
      if (!apport) return { erreur: "Choisissez le type d'apport." };
      [debit, credit, libelle] = [tresorerie.compte, apport.compte, "Apport"];
      break;
    }
    case "prelevement":
      [debit, credit, libelle] = ["104", tresorerie.compte, "Retrait du gérant"];
      break;
    case "depot-banque":
      [journal, debit, credit, libelle] = ["BQ", "521", "571", "Dépôt en banque"];
      break;
    case "retrait-banque":
      [journal, debit, credit, libelle] = ["BQ", "571", "521", "Retrait à la banque"];
      break;
    case "depot-momo":
      [journal, debit, credit, libelle] = ["MM", "552", "571", "Dépôt sur Mobile Money"];
      break;
    case "retrait-momo":
      [journal, debit, credit, libelle] = ["MM", "571", "552", "Retrait Mobile Money"];
      break;
    default:
      return { erreur: "Choisissez une opération." };
  }

  const r = await appeler("POST", `/dossiers/${encodeURIComponent(dossierId)}/comptabilite/ecritures`, {
    journal,
    date,
    libelle: (libelleSaisi || libelle).slice(0, 120),
    lignes: [
      { compte: debit, debit: montant, credit: 0 },
      { compte: credit, debit: 0, credit: montant },
    ],
  });
  if (r.statut !== 201 && r.statut !== 200) {
    return { erreur: messageErreur(r) };
  }
  redirect("/envoyer/compta?saisie=1");
}