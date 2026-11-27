"use client";

import { useActionState, useState } from "react";
import { saisirOperation, type EtatAction } from "../actions";
import { APPORTS, CHARGES, OPERATIONS, TRESORERIES } from "../operations";

const CHAMP = "h-12 w-full rounded-xl border border-line-strong bg-surface px-3 text-[15px] text-ink";
const ETIQUETTE = "flex flex-col gap-1.5 text-[13px] font-medium text-muted";

export function FormulaireOperation({ dossierId, aujourdhui }: { dossierId: string; aujourdhui: string }) {
  const [etat, action, enCours] = useActionState<EtatAction, FormData>(saisirOperation, { erreur: null });
  const [operation, setOperation] = useState<string>("depense");
  const choisie = OPERATIONS.find((o) => o.valeur === operation);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="dossierId" value={dossierId} />

      <label className={ETIQUETTE}>
        Opération
        <select name="operation" value={operation} onChange={(e) => setOperation(e.target.value)} className={CHAMP}>
          {OPERATIONS.map((o) => (
            <option key={o.valeur} value={o.valeur}>{o.libelle}</option>
          ))}
        </select>
      </label>

      {operation === "depense" && (
        <label className={ETIQUETTE}>
          Nature de la dépense
          <select name="charge" defaultValue="" required className={CHAMP}>
            <option value="" disabled>Choisir…</option>
            {CHARGES.map((c) => (
              <option key={c.compte} value={c.compte}>{c.libelle}</option>
            ))}
          </select>
        </label>
      )}

      {operation === "apport" && (
        <label className={ETIQUETTE}>
          Type d&apos;apport
          <select name="apport" defaultValue="104" className={CHAMP}>
            {APPORTS.map((a) => (
              <option key={a.compte} value={a.compte}>{a.libelle}</option>
            ))}
          </select>
        </label>
      )}

      {choisie?.avecTresorerie && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-medium text-muted">
            {operation === "apport" ? "Argent reçu en" : "Argent sorti de"}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TRESORERIES).map(([cle, t]) => (
              <label key={cle} className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-sm has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:font-bold has-[:checked]:text-white">
                <input type="radio" name="tresorerie" value={cle} defaultChecked={cle === "caisse"} className="sr-only" />
                {t.libelle}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className={ETIQUETTE}>
          Date
          <input type="date" name="date" defaultValue={aujourdhui} max={aujourdhui} required className={CHAMP} />
        </label>
        <label className={ETIQUETTE}>
          Montant (FCFA)
          <input type="text" name="montant" inputMode="numeric" required placeholder="0" className={`${CHAMP} tabular-nums`} />
        </label>
      </div>

      <label className={ETIQUETTE}>
        Libellé (facultatif)
        <input type="text" name="libelle" maxLength={120} placeholder="Par exemple : loyer de novembre" className={CHAMP} />
      </label>

      {operation === "depense" && (
        <p className="text-[13px] leading-[19px] text-muted">
          Pour une dépense avec une facture et de la TVA, envoyez plutôt la photo de la facture : Marly calcule la TVA.
        </p>
      )}

      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">{etat.erreur}</p>
      )}

      <button type="submit" disabled={enCours} className="flex h-[52px] items-center justify-center rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer l'opération"}
      </button>
    </form>
  );
}