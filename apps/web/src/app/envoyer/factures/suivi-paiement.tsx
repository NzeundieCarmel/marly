"use client";

import { useActionState } from "react";
import type { EtatPaiement, ModeReglement, Paiement } from "@/lib/api";
import { formatJour } from "@/lib/calcul-facture";
import { enregistrerReglement, relancerClient, supprimerReglement, type EtatPaiementAction } from "./actions-paiement";
import { Message } from "./champs";

const NOMBRE = new Intl.NumberFormat("fr-FR");
const ETAT_INITIAL: EtatPaiementAction = { erreur: null };
const CHAMP = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base";
const LIBELLE = "text-[13px] font-medium text-muted";

const MODES: { valeur: ModeReglement; libelle: string }[] = [
  { valeur: "MTN_MOMO", libelle: "MTN Mobile Money" },
  { valeur: "ORANGE_MONEY", libelle: "Orange Money" },
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "VIREMENT", libelle: "Virement" },
  { valeur: "CHEQUE", libelle: "Chèque" },
  { valeur: "AUTRE", libelle: "Autre" },
];

const ETATS: Record<EtatPaiement, { classe: string; texte: string }> = {
  PAYEE: { classe: "bg-success-bg text-success-ink", texte: "Payée" },
  PARTIELLE: { classe: "bg-info-bg text-info-ink", texte: "Partiellement payée" },
  EN_RETARD: { classe: "bg-danger-bg text-danger-ink", texte: "En retard" },
  A_PAYER: { classe: "bg-warning-bg text-warning-ink", texte: "À payer" },
};

function libelleMode(mode: ModeReglement): string {
  return MODES.find((m) => m.valeur === mode)?.libelle ?? mode;
}

export function SuiviPaiement({
  paiement: p,
  aujourdhui,
  dateEmission,
}: {
  paiement: Paiement;
  aujourdhui: string;
  dateEmission: string;
}) {
  const [etatAjout, ajouter, ajoutEnCours] = useActionState(enregistrerReglement, ETAT_INITIAL);
  const [etatRelance, relancer, relanceEnCours] = useActionState(relancerClient, ETAT_INITIAL);
  if (!p.etat) return null;
  const etat = ETATS[p.etat];

  return (
    <section aria-labelledby="titre-paiement" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titre-paiement" className="text-base font-bold text-heading">Paiement</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${etat.classe}`}>{etat.texte}</span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-muted">Net à payer</dt>
          <dd className="font-bold tabular-nums">{NOMBRE.format(p.netAPayer)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-muted">Déjà réglé</dt>
          <dd className="font-bold tabular-nums text-success-ink">{NOMBRE.format(p.montantRegle)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-muted">Reste</dt>
          <dd className="font-bold tabular-nums text-heading">{NOMBRE.format(p.reste)} FCFA</dd>
        </div>
      </dl>

      {p.reglements.length > 0 && (
        <ul aria-label="Règlements reçus" className="overflow-hidden rounded-xl border border-line">
          {p.reglements.map((r, i) => (
            <li key={r.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium tabular-nums">{NOMBRE.format(r.montant)} FCFA</span>
                <span className="truncate text-[13px] text-muted">
                  {formatJour(r.date)} · {libelleMode(r.mode)}
                  {r.reference ? ` · ${r.reference}` : ""}
                </span>
              </span>
              <form action={supprimerReglement}>
                <input type="hidden" name="factureId" value={p.factureId} />
                <input type="hidden" name="reglementId" value={r.id} />
                <button type="submit" className="h-10 px-2 text-[13px] font-medium text-danger-ink underline">Retirer</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Message erreur={etatAjout.erreur ?? etatRelance.erreur} />

      {p.reste > 0 && (
        <form action={ajouter} className="flex flex-col gap-3 rounded-xl bg-sunken p-3">
          <h3 className="text-sm font-bold text-ink">Enregistrer un règlement</h3>
          <input type="hidden" name="factureId" value={p.factureId} />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="date-reglement" className={LIBELLE}>Date</label>
              <input id="date-reglement" name="date" type="date" required min={dateEmission} max={aujourdhui} defaultValue={aujourdhui} className={CHAMP} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="montant-reglement" className={LIBELLE}>Montant (FCFA)</label>
              <input id="montant-reglement" name="montant" required inputMode="numeric" defaultValue={p.reste} className={`${CHAMP} tabular-nums`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="mode-reglement" className={LIBELLE}>Mode</label>
              <select id="mode-reglement" name="mode" required defaultValue="MTN_MOMO" className={CHAMP}>
                {MODES.map((m) => (
                  <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="reference-reglement" className={LIBELLE}>Référence (facultatif)</label>
              <input id="reference-reglement" name="reference" maxLength={60} placeholder="N° de transaction" className={CHAMP} />
            </div>
          </div>
          <button type="submit" disabled={ajoutEnCours} className="h-11 rounded-xl bg-action text-[15px] font-bold text-white hover:bg-action-hover disabled:opacity-60">
            {ajoutEnCours ? "Enregistrement…" : "Enregistrer le règlement"}
          </button>
        </form>
      )}

      {p.etat !== "PAYEE" && (
        <form action={relancer} className="flex flex-col gap-1.5">
          <input type="hidden" name="factureId" value={p.factureId} />
          <button type="submit" disabled={relanceEnCours} className="h-12 rounded-xl bg-whatsapp text-[15px] font-bold text-white disabled:opacity-60">
            {relanceEnCours ? "Ouverture de WhatsApp…" : "Relancer par WhatsApp"}
          </button>
          {p.derniereRelanceLe && (
            <span className="text-center text-[13px] text-muted">
              Dernière relance le {new Date(p.derniereRelanceLe).toLocaleDateString("fr-FR", { timeZone: "Africa/Douala" })}
            </span>
          )}
        </form>
      )}
    </section>
  );
}