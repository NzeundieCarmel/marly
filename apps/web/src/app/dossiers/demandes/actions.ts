"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { lireJeton } from "@/lib/session";

async function decider(id: string, decision: "accepter" | "refuser"): Promise<number> {
  const jeton = await lireJeton();
  if (!jeton) {
    redirect("/connexion");
  }
  try {
    const reponse = await fetch(`${API_URL}/rattachements/${encodeURIComponent(id)}/${decision}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}` },
      cache: "no-store",
    });
    return reponse.status;
  } catch {
    return 503;
  }
}

export async function accepterDemande(donnees: FormData): Promise<void> {
  const statut = await decider(String(donnees.get("id") ?? ""), "accepter");
  if (statut === 401) redirect("/connexion?expiree=1");
  if (statut !== 200) redirect(`/dossiers/demandes?erreur=${statut}`);
  const dossierId = String(donnees.get("dossierId") ?? "");
  redirect(`/dossiers/demandes?acceptee=${encodeURIComponent(dossierId)}`);
}

export async function refuserDemande(donnees: FormData): Promise<void> {
  const statut = await decider(String(donnees.get("id") ?? ""), "refuser");
  if (statut === 401) redirect("/connexion?expiree=1");
  if (statut !== 200) redirect(`/dossiers/demandes?erreur=${statut}`);
  redirect("/dossiers/demandes?refusee=1");
}