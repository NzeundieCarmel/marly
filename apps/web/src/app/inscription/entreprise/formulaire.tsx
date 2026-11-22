"use client";

import { useActionState } from "react";
import { sInscrireEntreprise, type EtatInscriptionEntreprise } from "./actions";

const ETAT_INITIAL: EtatInscriptionEntreprise = { erreur: null };
const CHAMP = "h-12 rounded-xl border border-line-strong bg-surface px-3 text-base";

const REGIMES = [
  { valeur: "IGS", titre: "IGS", detail: "Impôt général synthétique, sans TVA" },
  { valeur: "REEL", titre: "Régime réel", detail: "Vous facturez la TVA" },
];

export function FormulaireEntreprise() {
  const [etat, action, enCours] = useActionState(sInscrireEntreprise, ETAT_INITIAL);
  const v = etat.valeurs;

  return (
    <form action={action} className="flex flex-col gap-4">
      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
          {etat.erreur}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="raisonSociale" className="text-sm font-medium text-muted">Nom de votre entreprise</label>
        <input id="raisonSociale" name="raisonSociale" required minLength={2} maxLength={120} autoComplete="organization" defaultValue={v?.raisonSociale} placeholder="Ex. : Boutique Mama Ngono" className={CHAMP} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nomGerant" className="text-sm font-medium text-muted">Votre nom</label>
        <input id="nomGerant" name="nomGerant" required minLength={2} maxLength={80} autoComplete="name" defaultValue={v?.nomGerant} className={CHAMP} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-muted">Régime fiscal</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REGIMES.map((r) => (
            <label key={r.valeur} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong bg-surface p-4 has-[:checked]:border-action has-[:checked]:bg-info-bg">
              <input type="radio" name="regime" value={r.valeur} required defaultChecked={(v?.regime ?? "IGS") === r.valeur} className="mt-1" />
              <span className="flex flex-col">
                <strong>{r.titre}</strong>
                <span className="text-sm text-muted">{r.detail}</span>
              </span>
            </label>
          ))}
        </div>
        <span className="text-[13px] text-muted">
          Marly s&apos;en sert seulement pour classer vos pièces. En cas de doute, demandez à un comptable.
        </span>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-muted">Adresse e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} defaultValue={v?.email} className={CHAMP} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="motDePasse" className="text-sm font-medium text-muted">Mot de passe</label>
        <input id="motDePasse" name="motDePasse" type="password" required autoComplete="new-password" minLength={10} maxLength={72} aria-describedby="aide-mdp" className={CHAMP} />
        <span id="aide-mdp" className="text-[13px] text-muted">10 caractères minimum, avec au moins une lettre et un chiffre.</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmation" className="text-sm font-medium text-muted">Confirmez le mot de passe</label>
        <input id="confirmation" name="confirmation" type="password" required autoComplete="new-password" minLength={10} maxLength={72} className={CHAMP} />
      </div>

      {/* Champ piège : invisible et ignoré par les humains */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="siteWeb">Site web</label>
        <input id="siteWeb" name="siteWeb" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" disabled={enCours} className="mt-2 h-[52px] rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60">
        {enCours ? "Création de votre espace…" : "Créer l'espace de mon entreprise"}
      </button>
    </form>
  );
}