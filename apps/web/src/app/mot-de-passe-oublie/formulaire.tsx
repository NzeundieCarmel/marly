"use client";

import Link from "next/link";
import { useActionState } from "react";
import { traiter, type EtatMotDePasse } from "./actions";

const ETAT_INITIAL: EtatMotDePasse = { etape: "demande", email: "", erreur: null };
const CHAMP = "h-12 rounded-xl border border-line-strong bg-surface px-3 text-base";
const LIBELLE = "text-sm font-medium text-muted";
const BOUTON = "mt-2 h-[52px] rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60";

export function FormulaireMotDePasse() {
  const [etat, action, enCours] = useActionState(traiter, ETAT_INITIAL);

  if (etat.etape === "termine") {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Votre mot de passe a été modifié.
        </p>
        <Link href="/connexion" className="flex h-[52px] items-center justify-center rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="etape" value={etat.etape} />
      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
          {etat.erreur}
        </p>
      )}

      {etat.etape === "demande" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={LIBELLE}>Adresse e-mail du compte</label>
            <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} defaultValue={etat.email} className={CHAMP} />
          </div>
          <button type="submit" disabled={enCours} className={BOUTON}>
            {enCours ? "Envoi…" : "Recevoir un code"}
          </button>
        </>
      ) : (
        <>
          <p role="status" className="rounded-xl bg-info-bg p-3 text-sm leading-5 text-info-ink">
            Si un compte existe pour <strong>{etat.email}</strong>, un code à 6 chiffres vient d&apos;y être envoyé.
            Il est valable 15 minutes.
          </p>
          <input type="hidden" name="email" value={etat.email} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className={LIBELLE}>Code reçu</label>
            <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123 456" className={`${CHAMP} tracking-widest tabular-nums`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="motDePasse" className={LIBELLE}>Nouveau mot de passe</label>
            <input id="motDePasse" name="motDePasse" type="password" required autoComplete="new-password" minLength={10} maxLength={72} aria-describedby="aide-mdp" className={CHAMP} />
            <span id="aide-mdp" className="text-[13px] text-muted">10 caractères minimum, avec au moins une lettre et un chiffre.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmation" className={LIBELLE}>Confirmez le mot de passe</label>
            <input id="confirmation" name="confirmation" type="password" required autoComplete="new-password" minLength={10} maxLength={72} className={CHAMP} />
          </div>
          <button type="submit" disabled={enCours} className={BOUTON}>
            {enCours ? "Modification…" : "Changer mon mot de passe"}
          </button>
          <Link href="/mot-de-passe-oublie" className="self-center py-2 text-sm font-bold text-link underline">
            Pas reçu de code ? Recommencer
          </Link>
        </>
      )}
    </form>
  );
}