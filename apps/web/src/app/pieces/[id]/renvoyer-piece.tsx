"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MOTIFS = ["Pièce illisible", "Montant non visible", "Facture coupée", "Mauvaise pièce"];

export function RenvoyerPiece({
  pieceId,
  dossierId,
  suivanteId,
}: {
  pieceId: string;
  dossierId: string;
  suivanteId: string | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState(MOTIFS[0]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function renvoyer() {
    setErreur(null);
    setEnCours(true);
    try {
      const reponse = await fetch(`/api/pieces/${pieceId}/a-completer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif }),
      });
      if (!reponse.ok) {
        const corps = (await reponse.json().catch(() => null)) as { message?: string } | null;
        setErreur(corps?.message ?? "Le renvoi a échoué. Réessaie.");
        return;
      }
      router.push(suivanteId ? `/pieces/${suivanteId}` : `/dossiers/${dossierId}`);
      router.refresh();
    } catch {
      setErreur("Le serveur Marly est injoignable. Réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="h-11 self-start rounded-xl border border-[#7A4A00] px-4 text-sm font-medium text-[#7A4A00]"
      >
        Renvoyer à l&apos;entreprise (pièce illisible, incomplète…)
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[#F0C97A] bg-[#FFF8EC] p-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold text-[#7A4A00]">Pourquoi renvoyer cette pièce ?</legend>
        {MOTIFS.map((m) => (
          <label key={m} className="flex min-h-10 items-center gap-2">
            <input
              type="radio"
              name="motif"
              value={m}
              checked={motif === m}
              onChange={() => setMotif(m)}
            />
            {m}
          </label>
        ))}
      </fieldset>

      {erreur && (
        <p role="alert" className="rounded-xl bg-[#FDECEC] p-3 text-sm text-[#A12A2A]">
          {erreur}
        </p>
      )}

      <p className="text-sm text-[#7A4A00]">
        L&apos;entreprise verra cette demande sur son téléphone et pourra envoyer une nouvelle photo.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={renvoyer}
          disabled={enCours}
          className="h-11 rounded-xl bg-[#7A4A00] px-5 font-bold text-white disabled:opacity-60"
        >
          {enCours ? "Renvoi…" : "Confirmer le renvoi"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="h-11 rounded-xl px-4 text-sm underline"
        >
          Annuler
        </button>
      </div>
    </section>
  );
}