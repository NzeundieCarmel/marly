"use client";

import { useActionState } from "react";
import { sInscrire, type EtatInscription } from "./actions";

const ETAT_INITIAL: EtatInscription = { erreur: null };

function Champ({
  id,
  libelle,
  aide,
  ...attributs
}: {
  id: string;
  libelle: string;
  aide?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {libelle}
      </label>
      <input
        id={id}
        name={id}
        required
        aria-describedby={aide ? `${id}-aide` : undefined}
        className="h-12 rounded-xl border border-line-strong bg-surface px-3"
        {...attributs}
      />
      {aide && (
        <span id={`${id}-aide`} className="text-xs text-muted">
          {aide}
        </span>
      )}
    </div>
  );
}

export function FormulaireInscription() {
  const [etat, action, enCours] = useActionState(sInscrire, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
          {etat.erreur}
        </p>
      )}

      <Champ
        id="nomCabinet"
        libelle="Nom du cabinet"
        autoComplete="organization"
        maxLength={120}
        defaultValue={etat.valeurs?.nomCabinet}
      />
      <Champ
        id="nomResponsable"
        libelle="Ton nom"
        autoComplete="name"
        maxLength={80}
        defaultValue={etat.valeurs?.nomResponsable}
      />
      <Champ
        id="email"
        libelle="Adresse e-mail"
        type="email"
        autoComplete="email"
        maxLength={254}
        defaultValue={etat.valeurs?.email}
      />
      <Champ
        id="motDePasse"
        libelle="Mot de passe"
        type="password"
        autoComplete="new-password"
        minLength={10}
        maxLength={72}
        aide="10 caractères minimum, avec au moins une lettre et un chiffre."
      />
      <Champ
        id="confirmation"
        libelle="Confirme le mot de passe"
        type="password"
        autoComplete="new-password"
        minLength={10}
        maxLength={72}
      />

      {/* Champ piège : invisible et ignoré par les humains */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="siteWeb">Site web</label>
        <input id="siteWeb" name="siteWeb" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 h-12 rounded-xl bg-action font-bold text-white disabled:opacity-60"
      >
        {enCours ? "Création du compte…" : "Créer le compte du cabinet"}
      </button>
    </form>
  );
}