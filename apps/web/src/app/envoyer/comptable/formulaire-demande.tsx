"use client";

import { useActionState } from "react";
import type { Comptable } from "@/lib/api";
import { demanderComptable, type EtatDemande } from "./actions";

const ETAT_INITIAL: EtatDemande = { erreur: null };

export function FormulaireDemande({ comptables }: { comptables: Comptable[] }) {
  const [etat, action, enCours] = useActionState(demanderComptable, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
          {etat.erreur}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-muted">Cabinets partenaires de Marly</legend>
        {comptables.map((c, i) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line-strong bg-surface p-4 has-[:checked]:border-action has-[:checked]:bg-info-bg"
          >
            <input type="radio" name="cabinetId" value={c.id} required defaultChecked={i === 0} />
            <span className="flex flex-col">
              <strong>{c.nom}</strong>
              {c.ville && <span className="text-sm text-muted">{c.ville}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-muted">Message au cabinet (facultatif)</label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={500}
          placeholder="Ex. : je cherche un comptable pour mes déclarations."
          className="rounded-xl border border-line-strong bg-surface p-3 text-base"
        />
      </div>

      <button
        type="submit"
        disabled={enCours}
        className="h-[52px] rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60"
      >
        {enCours ? "Envoi de la demande…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}