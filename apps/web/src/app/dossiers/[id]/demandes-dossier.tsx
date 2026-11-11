"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Demande } from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

async function lireMessage(reponse: Response, parDefaut: string): Promise<string> {
  const corps = (await reponse.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
  return message ?? parDefaut;
}

export function DemandesDossier({
  dossierId,
  demandes,
  echeanceParDefaut,
  peutGerer,
}: {
  dossierId: string;
  demandes: Demande[];
  echeanceParDefaut: string;
  peutGerer: boolean;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [echeance, setEcheance] = useState(echeanceParDefaut);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const ouvertes = demandes.filter((d) => d.statut === "OUVERTE");
  const closes = demandes.filter((d) => d.statut !== "OUVERTE").slice(0, 5);

  async function demander(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      const reponse = await fetch(`/api/dossiers/${dossierId}/demandes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, echeance }),
      });
      if (!reponse.ok) {
        setErreur(await lireMessage(reponse, "La demande n'a pas pu être créée."));
        return;
      }
      setDescription("");
      router.refresh();
    } catch {
      setErreur("Le serveur Marly est injoignable. Réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function annuler(demandeId: string) {
    setErreur(null);
    try {
      const reponse = await fetch(`/api/demandes/${demandeId}/annuler`, { method: "POST" });
      if (!reponse.ok) {
        setErreur(await lireMessage(reponse, "La demande n'a pas pu être annulée."));
        return;
      }
      router.refresh();
    } catch {
      setErreur("Le serveur Marly est injoignable. Réessaie.");
    }
  }

  return (
    <section aria-labelledby="titre-demandes" className="mb-6 flex flex-col gap-4 rounded-2xl border border-marly-bord bg-white p-5">
      <h2 id="titre-demandes" className="text-lg font-bold">
        Pièces demandées à l&apos;entreprise ({ouvertes.length})
      </h2>

      {erreur && (
        <p role="alert" className="rounded-xl bg-[#FDECEC] p-3 text-sm text-[#A12A2A]">
          {erreur}
        </p>
      )}

      {ouvertes.length === 0 ? (
        <p className="text-sm text-marly-gris">Aucune pièce en attente pour ce dossier.</p>
      ) : (
        <ul className="flex flex-col">
          {ouvertes.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-marly-bord py-3 first:border-t-0">
              <div className="flex flex-col">
                <span className="font-medium">{d.description}</span>
                <span className="text-sm text-marly-gris">
                  {d.pieceId ? "Pièce renvoyée · " : ""}À fournir avant le {formatDate(d.echeance)}
                </span>
              </div>
              {peutGerer && (
                <button
                  type="button"
                  onClick={() => annuler(d.id)}
                  className="h-10 rounded-lg px-3 text-sm text-marly-gris underline"
                >
                  Annuler
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {peutGerer && (
        <form onSubmit={demander} className="flex flex-wrap items-end gap-3 border-t border-marly-bord pt-4">
          <div className="flex min-w-60 flex-1 flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium text-marly-gris">
              Demander une pièce
            </label>
            <input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex. : Relevé bancaire d'octobre"
              required
              maxLength={160}
              className="h-11 rounded-xl border border-marly-bord px-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="echeance" className="text-sm font-medium text-marly-gris">
              Avant le
            </label>
            <input
              id="echeance"
              type="date"
              value={echeance}
              onChange={(e) => setEcheance(e.target.value)}
              required
              className="h-11 rounded-xl border border-marly-bord px-3"
            />
          </div>
          <button
            type="submit"
            disabled={enCours}
            className="h-11 rounded-xl bg-marly-bleu px-5 font-bold text-white disabled:opacity-60"
          >
            {enCours ? "Envoi…" : "Demander"}
          </button>
        </form>
      )}

      {closes.length > 0 && (
        <details className="text-sm text-marly-gris">
          <summary className="cursor-pointer">Demandes closes récentes ({closes.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {closes.map((d) => (
              <li key={d.id}>
                {d.description} · {d.statut === "SATISFAITE" ? "reçue" : "annulée"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}