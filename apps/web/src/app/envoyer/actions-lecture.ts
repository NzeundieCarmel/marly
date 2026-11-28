"use server";

import { redirect } from "next/navigation";
import { API_URL, lireProfilEmetteur } from "@/lib/api";
import { lireJeton } from "@/lib/session";

type Reponse = { statut: number; corps: { id?: string; message?: string | string[] } | null };

async function poster(chemin: string, corps: unknown): Promise<Reponse> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  let reponse: Response | null = null;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
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
  return { statut: reponse.status, corps: (await reponse.json().catch(() => null)) as Reponse["corps"] };
}

function erreur(r: Reponse): string {
  if (r.statut === 0) return "Marly est injoignable pour le moment. Réessayez dans un instant.";
  const message = r.corps?.message;
  const texte = Array.isArray(message) ? message[0] : message;
  return texte ?? "La facture n'a pas pu être préparée. Réessayez.";
}

// Vente lue sur une photo : un brouillon de facture au montant lu, pour le client choisi ou un nouveau
export async function creerVenteLue(donnees: FormData): Promise<{ erreur: string } | undefined> {
  const montantTtc = Number(String(donnees.get("montantTtc") ?? "").replace(/[\s  ]/g, ""));
  const designation = String(donnees.get("designation") ?? "").trim().slice(0, 200) || "Vente selon bon";
  let clientId = String(donnees.get("clientId") ?? "");
  const nouveauClient = String(donnees.get("nouveauClient") ?? "").trim();

  if (!Number.isInteger(montantTtc) || montantTtc <= 0) {
    return { erreur: "Indiquez le montant de la vente, en FCFA, sans décimales." };
  }
  if (!clientId && nouveauClient.length < 2) {
    return { erreur: "Choisissez le client, ou indiquez le nom du nouveau client." };
  }

  // Au réel, la facture travaille en hors taxes : le TTC lu est ramené au HT
  const emetteur = await lireProfilEmetteur();
  const prixUnitaire =
    emetteur.regime === "REEL" ? Math.round((montantTtc * 100) / (100 + emetteur.tauxTva)) : montantTtc;

  if (!clientId) {
    const client = await poster("/facturation/clients", { nom: nouveauClient.slice(0, 120) });
    if (client.statut !== 201 && client.statut !== 200) {
      return { erreur: erreur(client) };
    }
    clientId = String(client.corps?.id ?? "");
  }
  const facture = await poster("/facturation/factures", {
    clientId,
    lignes: [{ designation, quantite: 1, prixUnitaire }],
  });
  if (facture.statut !== 201 && facture.statut !== 200) {
    return { erreur: erreur(facture) };
  }
  redirect(`/envoyer/factures/${encodeURIComponent(String(facture.corps?.id ?? ""))}?depuisPhoto=1`);
}