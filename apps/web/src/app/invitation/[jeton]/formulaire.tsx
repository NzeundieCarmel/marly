"use client";

import { useActionState } from "react";
import type { EtatAcceptation } from "./actions";

export function FormulaireInvitation({
  action,
  emailInitial,
}: {
  action: (etat: EtatAcceptation, donnees: FormData) => Promise<EtatAcceptation>;
  emailInitial: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, { erreur: null });

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-[#FDECEC] p-3 text-sm text-[#A12A2A]">
          {etat.erreur}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-marly-gris">
          Votre adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          defaultValue={etat.email ?? emailInitial}
          className="h-12 rounded-xl border border-marly-bord bg-white px-3"
        />
        <span className="text-xs text-marly-gris">Elle vous servira pour vous connecter.</span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="motDePasse" className="text-sm font-medium text-marly-gris">
          Choisissez un mot de passe
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          required
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          aria-describedby="aide-mot-de-passe"
          className="h-12 rounded-xl border border-marly-bord bg-white px-3"
        />
        <span id="aide-mot-de-passe" className="text-xs text-marly-gris">
          10 caractères minimum, avec au moins une lettre et un chiffre.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmation" className="text-sm font-medium text-marly-gris">
          Confirmez le mot de passe
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          className="h-12 rounded-xl border border-marly-bord bg-white px-3"
        />
      </div>

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 h-13 rounded-xl bg-marly-bleu text-base font-bold text-white disabled:opacity-60"
      >
        {enCours ? "Création de votre accès…" : "Créer mon accès"}
      </button>
    </form>
  );
}