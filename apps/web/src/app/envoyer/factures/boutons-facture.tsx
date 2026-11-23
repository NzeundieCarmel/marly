"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { creerAvoir, emettreFacture, supprimerBrouillon, type EtatAction } from "./actions-facture";
import { Message } from "./champs";

const ETAT_INITIAL: EtatAction = { erreur: null };
const PRINCIPAL = "h-12 w-full rounded-xl bg-action text-[15px] font-bold text-white hover:bg-action-hover disabled:opacity-60";
const SECONDAIRE = "h-12 w-full rounded-xl border border-line-strong bg-surface text-[15px] font-medium text-ink hover:bg-survol";

export function ActionsBrouillon({ id, manquants }: { id: string; manquants: string[] }) {
  const [confirmer, setConfirmer] = useState(false);
  const [etatEmission, emettre, emissionEnCours] = useActionState(emettreFacture, ETAT_INITIAL);
  const [etatSuppression, supprimer, suppressionEnCours] = useActionState(supprimerBrouillon, ETAT_INITIAL);

  return (
    <section aria-label="Émettre la facture" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <Message erreur={etatEmission.erreur ?? etatSuppression.erreur} />

      {manquants.length > 0 ? (
        <p className="rounded-xl bg-warning-bg p-3 text-sm text-warning-ink">
          Avant d&apos;émettre, complétez votre fiche : {manquants.join(", ")}.{" "}
          <Link href="/envoyer/factures/fiche" className="font-bold underline">Compléter</Link>
        </p>
      ) : !confirmer ? (
        <button type="button" onClick={() => setConfirmer(true)} className={PRINCIPAL}>
          Émettre la facture
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-info-bg p-3 text-info-ink">
          <p className="text-sm leading-5">
            Une fois émise, la facture reçoit son numéro définitif et ne peut plus être modifiée. Pour la
            corriger, il faudra faire un avoir. Vérifiez que vos dernières modifications sont enregistrées.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmer(false)} className={SECONDAIRE}>Revenir</button>
            <form action={emettre}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" disabled={emissionEnCours} className={PRINCIPAL}>
                {emissionEnCours ? "Émission…" : "Confirmer"}
              </button>
            </form>
          </div>
        </div>
      )}

      <form action={supprimer}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={suppressionEnCours} className="h-11 w-full text-sm font-medium text-danger-ink underline">
          {suppressionEnCours ? "Suppression…" : "Supprimer ce brouillon"}
        </button>
      </form>
    </section>
  );
}

export function ActionAvoir({ id }: { id: string }) {
  const [confirmer, setConfirmer] = useState(false);
  const [etat, action, enCours] = useActionState(creerAvoir, ETAT_INITIAL);

  return (
    <section aria-label="Annuler la facture" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <Message erreur={etat.erreur} />
      {!confirmer ? (
        <button type="button" onClick={() => setConfirmer(true)} className={SECONDAIRE}>
          Annuler par un avoir
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-warning-bg p-3 text-warning-ink">
          <p className="text-sm leading-5">
            Un avoir du même montant sera émis avec son propre numéro, et cette facture sera marquée
            annulée. Cette opération est définitive.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmer(false)} className={SECONDAIRE}>Revenir</button>
            <form action={action}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" disabled={enCours} className={PRINCIPAL}>
                {enCours ? "Création…" : "Créer l'avoir"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}