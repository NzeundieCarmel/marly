"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EtatDossier, ValeursDossier } from "./actions";

const REGIMES = [
  { valeur: "REEL", titre: "Régime réel", detail: "Facture la TVA à 19,25 %" },
  { valeur: "IGS", titre: "IGS", detail: "Impôt général synthétique, sans TVA" },
];

export function FormulaireDossier({
  action,
  initial,
  libelleBouton,
  annulerVers,
}: {
  action: (etat: EtatDossier, donnees: FormData) => Promise<EtatDossier>;
  initial: ValeursDossier;
  libelleBouton: string;
  annulerVers: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, { erreur: null });
  const valeurs = etat.valeurs ?? initial;

  return (
    <form action={envoyer} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
          {etat.erreur}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="raisonSociale" className="text-sm font-medium text-muted">
          Raison sociale
        </label>
        <input
          id="raisonSociale"
          name="raisonSociale"
          required
          minLength={2}
          maxLength={120}
          defaultValue={valeurs.raisonSociale}
          placeholder="Ex. : Pharmacie du Littoral"
          className="h-12 rounded-xl border border-line-strong px-3"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-muted">Régime fiscal</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REGIMES.map((r) => (
            <label
              key={r.valeur}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong p-4 has-[:checked]:border-action has-[:checked]:bg-info-bg"
            >
              <input
                type="radio"
                name="regime"
                value={r.valeur}
                required
                defaultChecked={valeurs.regime === r.valeur}
                className="mt-1"
              />
              <span className="flex flex-col">
                <strong>{r.titre}</strong>
                <span className="text-sm text-muted">{r.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="niu" className="text-sm font-medium text-muted">
            NIU (facultatif)
          </label>
          <input
            id="niu"
            name="niu"
            maxLength={30}
            defaultValue={valeurs.niu}
            placeholder="M012345678901A"
            className="h-12 rounded-xl border border-line-strong px-3 uppercase"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rccm" className="text-sm font-medium text-muted">
            RCCM (facultatif)
          </label>
          <input
            id="rccm"
            name="rccm"
            maxLength={40}
            defaultValue={valeurs.rccm}
            placeholder="RC/DLA/2024/B/1234"
            className="h-12 rounded-xl border border-line-strong px-3"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="h-12 rounded-xl bg-action px-6 font-bold text-white disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : libelleBouton}
        </button>
        <Link href={annulerVers} className="px-3 text-sm text-muted underline">
          Annuler
        </Link>
      </div>
    </form>
  );
}