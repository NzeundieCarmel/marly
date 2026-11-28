"use client";

import { useActionState, useState } from "react";
import type { StatutDevis } from "@/lib/api";
import { Message } from "../champs";
import { changerStatutDevis, supprimerDevis, transformerDevis, type EtatDevis } from "./actions";

const INITIAL: EtatDevis = { erreur: null };
const PRINCIPAL = "h-12 w-full rounded-xl bg-action text-[15px] font-bold text-white hover:bg-action-hover disabled:opacity-60";
const SECONDAIRE = "h-12 w-full rounded-xl border border-line-strong bg-surface text-[15px] font-medium text-ink hover:bg-survol disabled:opacity-60";

export function ActionsDevis({ id, statut }: { id: string; statut: StatutDevis }) {
  const [confirmer, setConfirmer] = useState(false);
  const [etatFacture, facturer, facturation] = useActionState(transformerDevis, INITIAL);
  const [etatStatut, changer, changement] = useActionState(changerStatutDevis, INITIAL);
  const [etatSuppression, supprimer, suppression] = useActionState(supprimerDevis, INITIAL);

  return (
    <section aria-label="Suite du devis" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <Message erreur={etatFacture.erreur ?? etatStatut.erreur ?? etatSuppression.erreur} />

      {statut !== "REFUSE" &&
        (!confirmer ? (
          <button type="button" onClick={() => setConfirmer(true)} className={PRINCIPAL}>
            Transformer en facture
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-info-bg p-3 text-info-ink">
            <p className="text-sm leading-5">
              Marly crée un brouillon de facture avec les mêmes lignes. Vous pourrez le vérifier avant de l&apos;émettre.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmer(false)} className={SECONDAIRE}>Revenir</button>
              <form action={facturer}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" disabled={facturation} className={PRINCIPAL}>
                  {facturation ? "Création…" : "Confirmer"}
                </button>
              </form>
            </div>
          </div>
        ))}

      <div className="grid grid-cols-2 gap-2">
        {statut !== "ACCEPTE" && (
          <form action={changer}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="statut" value="ACCEPTE" />
            <button type="submit" disabled={changement} className={SECONDAIRE}>Accepté</button>
          </form>
        )}
        {statut !== "REFUSE" ? (
          <form action={changer}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="statut" value="REFUSE" />
            <button type="submit" disabled={changement} className={SECONDAIRE}>Refusé</button>
          </form>
        ) : (
          <form action={changer}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="statut" value="EN_COURS" />
            <button type="submit" disabled={changement} className={SECONDAIRE}>Remettre en cours</button>
          </form>
        )}
      </div>

      <form action={supprimer}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={suppression} className="h-11 w-full text-sm font-medium text-danger-ink underline">
          {suppression ? "Suppression…" : "Supprimer ce devis"}
        </button>
      </form>
    </section>
  );
}