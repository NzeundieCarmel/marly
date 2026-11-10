"use client";

import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { seConnecter, type EtatConnexion } from "./actions";

const etatInitial: EtatConnexion = { erreur: null };

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(seConnecter, etatInitial);
  const sessionExpiree = useSearchParams().get("expiree") === "1";

  // Déconnexion ou session expirée : on efface les pages gardées pour le hors ligne
  useEffect(() => {
    if ("caches" in window) {
      void caches.delete("marly-pages-v1");
    }
  }, []);

  return (
    <form action={action} className="flex flex-col gap-4">
      {sessionExpiree && !etat.erreur && (
        <p role="status" className="rounded-xl bg-[#FFF2DB] p-3 text-sm text-[#7A4A00]">
          Ta session a expiré. Reconnecte-toi.
        </p>
      )}
      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-[#FDECEC] p-3 text-sm text-[#A12A2A]">
          {etat.erreur}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-marly-gris">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 rounded-xl border border-marly-bord bg-white px-4"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="motDePasse" className="text-sm font-medium text-marly-gris">
          Mot de passe
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="h-12 rounded-xl border border-marly-bord bg-white px-4"
        />
      </div>

      <button
        type="submit"
        disabled={enCours}
        className="h-12 rounded-xl bg-marly-bleu font-bold text-white disabled:opacity-60"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}