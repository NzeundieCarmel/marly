"use client";

import { useActionState } from "react";
import type { PaiementAchat } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { formatJourCourt } from "@/app/envoyer/compta/en-tete";
import { reglerAchat, type EtatAchat } from "./actions";

const INITIAL: EtatAchat = { erreur: null };
const CHAMP = "h-12 w-full rounded-xl border border-line-strong bg-surface px-3 text-[16px] text-ink";
const ETIQUETTE = "flex flex-col gap-1.5 text-[13px] font-medium text-muted";
const MODES: { valeur: Exclude<PaiementAchat, "A_CREDIT">; libelle: string }[] = [
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "MTN_MOMO", libelle: "MTN MoMo" },
  { valeur: "ORANGE_MONEY", libelle: "Orange Money" },
  { valeur: "VIREMENT", libelle: "Virement" },
];

function libelle(mode: PaiementAchat): string {
  return MODES.find((m) => m.valeur === mode)?.libelle ?? mode;
}

export function PaiementFournisseur({
  dossierId,
  id,
  reste,
  montantRegle,
  reglements,
  dateAchat,
  aujourdhui,
}: {
  dossierId: string;
  id: string;
  reste: number;
  montantRegle: number;
  reglements: { id: string; date: string; montant: number; mode: PaiementAchat }[];
  dateAchat: string;
  aujourdhui: string;
}) {
  const [etat, action, enCours] = useActionState(reglerAchat, INITIAL);
  return (
    <section aria-labelledby="titre-paiement-fournisseur" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titre-paiement-fournisseur" className="text-base font-bold text-heading">Paiement du fournisseur</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${reste === 0 ? "bg-success-bg text-success-ink" : "bg-warning-bg text-warning-ink"}`}>
          {reste === 0 ? "Payé" : montantRegle > 0 ? "Payé en partie" : "À payer"}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-muted">Déjà payé</dt>
          <dd className="font-bold tabular-nums text-success-ink">{formatMontant(montantRegle)} FCFA</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-muted">Reste à payer</dt>
          <dd className="font-bold tabular-nums text-heading">{formatMontant(reste)} FCFA</dd>
        </div>
      </dl>
      {reglements.length > 0 && (
        <ul aria-label="Paiements faits" className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
          {reglements.map((r) => (
            <li key={r.id} className="flex justify-between gap-3">
              <span className="text-muted">
                {formatJourCourt(r.date)} · {libelle(r.mode)}
              </span>
              <span className="tabular-nums">{formatMontant(r.montant)} FCFA</span>
            </li>
          ))}
        </ul>
      )}
      {reste > 0 && (
        <form action={action} className="flex flex-col gap-3 rounded-xl bg-sunken p-3">
          <input type="hidden" name="dossierId" value={dossierId} />
          <input type="hidden" name="id" value={id} />
          <div className="grid grid-cols-2 gap-2">
            <label className={ETIQUETTE}>
              Date
              <input type="date" name="date" required min={dateAchat} max={aujourdhui} defaultValue={aujourdhui} className={CHAMP} />
            </label>
            <label className={ETIQUETTE}>
              Montant (FCFA)
              <input name="montant" inputMode="numeric" required defaultValue={reste} className={`${CHAMP} tabular-nums`} />
            </label>
          </div>
          <label className={ETIQUETTE}>
            Payé par
            <select name="mode" defaultValue="ESPECES" className={CHAMP}>
              {MODES.map((m) => (
                <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
              ))}
            </select>
          </label>
          {etat.erreur && (
            <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">{etat.erreur}</p>
          )}
          <button type="submit" disabled={enCours} className="h-12 rounded-xl bg-action text-[15px] font-bold text-white hover:bg-action-hover disabled:opacity-60">
            {enCours ? "Enregistrement…" : "Enregistrer le paiement"}
          </button>
        </form>
      )}
    </section>
  );
}