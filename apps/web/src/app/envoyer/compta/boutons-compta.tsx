"use client";

import { useActionState } from "react";
import { comptabiliserPiece, comptabiliserTout, type EtatAction } from "./actions";

const INITIAL: EtatAction = { erreur: null };
const BOUTON =
  "flex h-12 w-full items-center justify-center rounded-xl bg-action text-[15px] font-bold text-white hover:bg-action-hover disabled:opacity-60";

function Erreur({ texte }: { texte: string | null }) {
  if (!texte) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
      {texte}
    </p>
  );
}

export function BoutonToutComptabiliser({ dossierId, nombre }: { dossierId: string; nombre: number }) {
  const [etat, action, enCours] = useActionState(comptabiliserTout, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Comptabilisation…" : `Comptabiliser ${nombre > 1 ? `les ${nombre} pièces` : "la pièce"}`}
      </button>
      <Erreur texte={etat.erreur} />
    </form>
  );
}

export function BoutonComptabiliserPiece({ pieceId }: { pieceId: string }) {
  const [etat, action, enCours] = useActionState(comptabiliserPiece, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="pieceId" value={pieceId} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Comptabilisation…" : "Comptabiliser cette pièce"}
      </button>
      <Erreur texte={etat.erreur} />
    </form>
  );
}