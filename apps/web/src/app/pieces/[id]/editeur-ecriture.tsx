"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LigneEcriture, StatutPiece } from "@/lib/api";

interface LigneSaisie {
  compte: string;
  libelle: string;
  tiers: string | null;
  debit: string;
  credit: string;
}

const formatMontant = new Intl.NumberFormat("fr-FR");

function enEntier(valeur: string): number {
  const nombre = Number.parseInt(valeur.replace(/\s/g, ""), 10);
  return Number.isFinite(nombre) && nombre > 0 ? nombre : 0;
}

function versSaisie(ligne: LigneEcriture): LigneSaisie {
  return {
    compte: ligne.compte,
    libelle: ligne.libelle,
    tiers: ligne.tiers,
    debit: ligne.debit > 0 ? String(ligne.debit) : "",
    credit: ligne.credit > 0 ? String(ligne.credit) : "",
  };
}

export function EditeurEcriture({
  pieceId,
  dossierId,
  statut,
  journal,
  lignesInitiales,
  suivanteId,
}: {
  pieceId: string;
  dossierId: string;
  statut: StatutPiece;
  journal: string;
  lignesInitiales: LigneEcriture[];
  suivanteId: string | null;
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState<LigneSaisie[]>(() => lignesInitiales.map(versSaisie));
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lectureSeule = statut !== "RECUE";
  const totalDebit = lignes.reduce((somme, l) => somme + enEntier(l.debit), 0);
  const totalCredit = lignes.reduce((somme, l) => somme + enEntier(l.credit), 0);
  const equilibree = totalDebit > 0 && totalDebit === totalCredit;

  function modifier(index: number, champ: keyof LigneSaisie, valeur: string) {
    setLignes((actuelles) =>
      actuelles.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)),
    );
  }

  function ajouterLigne() {
    const libelle = lignes[0]?.libelle ?? "";
    setLignes((actuelles) => [
      ...actuelles,
      { compte: "", libelle, tiers: null, debit: "", credit: "" },
    ]);
  }

  function supprimerLigne(index: number) {
    setLignes((actuelles) => actuelles.filter((_, i) => i !== index));
  }

  async function valider() {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      const reponse = await fetch(`/api/pieces/${pieceId}/valider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journal,
          lignes: lignes.map((l) => ({
            compte: l.compte.trim(),
            libelle: l.libelle.trim(),
            tiers: l.tiers,
            debit: enEntier(l.debit),
            credit: enEntier(l.credit),
          })),
        }),
      });

      if (reponse.status === 401) {
        router.push("/connexion?expiree=1");
        return;
      }
      if (!reponse.ok) {
        const corps = (await reponse.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
        setErreur(message ?? "La validation a échoué. Réessaie.");
        return;
      }

      // Pièce suivante du dossier, ou retour au dossier quand tout est validé
      router.push(suivanteId ? `/pieces/${suivanteId}` : `/dossiers/${dossierId}`);
      router.refresh();
    } catch {
      setErreur("Le serveur Marly est injoignable. Réessaie.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="flex flex-col rounded-2xl border-2 border-marly-bleu bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-marly-bord px-5 py-4">
        <h2 className="text-base font-bold">
          {lectureSeule ? "Écriture enregistrée" : "Écriture proposée"} · journal {journal}
        </h2>
        <span className="text-sm text-marly-gris">Plan comptable SYSCOHADA</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-marly-gris">
              <th className="px-4 py-2 font-medium">Compte</th>
              <th className="px-2 py-2 font-medium">Libellé</th>
              <th className="px-2 py-2 text-right font-medium">Débit</th>
              <th className="px-2 py-2 text-right font-medium">Crédit</th>
              {!lectureSeule && <th className="px-4 py-2" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, index) => (
              <tr key={index} className="border-t border-marly-bord">
                <td className="px-4 py-2">
                  <input
                    aria-label={`Compte de la ligne ${index + 1}`}
                    value={ligne.compte}
                    onChange={(e) => modifier(index, "compte", e.target.value)}
                    readOnly={lectureSeule}
                    inputMode="numeric"
                    className="h-10 w-24 rounded-lg border border-marly-bord px-2 font-bold read-only:border-transparent"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`Libellé de la ligne ${index + 1}`}
                    value={ligne.libelle}
                    onChange={(e) => modifier(index, "libelle", e.target.value)}
                    readOnly={lectureSeule}
                    className="h-10 w-full min-w-40 rounded-lg border border-marly-bord px-2 read-only:border-transparent"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`Débit de la ligne ${index + 1}`}
                    value={ligne.debit}
                    onChange={(e) => modifier(index, "debit", e.target.value)}
                    readOnly={lectureSeule}
                    inputMode="numeric"
                    className="h-10 w-28 rounded-lg border border-marly-bord px-2 text-right tabular-nums read-only:border-transparent"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`Crédit de la ligne ${index + 1}`}
                    value={ligne.credit}
                    onChange={(e) => modifier(index, "credit", e.target.value)}
                    readOnly={lectureSeule}
                    inputMode="numeric"
                    className="h-10 w-28 rounded-lg border border-marly-bord px-2 text-right tabular-nums read-only:border-transparent"
                  />
                </td>
                {!lectureSeule && (
                  <td className="px-4 py-2 text-right">
                    {lignes.length > 2 && (
                      <button
                        type="button"
                        onClick={() => supprimerLigne(index)}
                        className="h-10 rounded-lg px-2 text-marly-gris underline"
                      >
                        Retirer
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            <tr className="border-t-2 border-marly-bord font-bold">
              <td className="px-4 py-3" colSpan={2}>
                Total ·{" "}
                <span className={equilibree ? "text-[#11734B]" : "text-[#A12A2A]"}>
                  {equilibree ? "équilibrée" : "déséquilibrée"}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMontant.format(totalDebit)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMontant.format(totalCredit)}</td>
              {!lectureSeule && <td />}
            </tr>
          </tbody>
        </table>
      </div>

      {!lectureSeule && (
        <div className="flex flex-col gap-3 border-t border-marly-bord p-5">
          {erreur && (
            <p role="alert" className="rounded-xl bg-[#FDECEC] p-3 text-sm text-[#A12A2A]">
              {erreur}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={ajouterLigne}
              className="h-11 rounded-xl border border-marly-bord px-4 text-sm font-medium"
            >
              Ajouter une ligne
            </button>
            <button
              type="button"
              onClick={valider}
              disabled={!equilibree || envoiEnCours}
              className="h-11 rounded-xl bg-marly-bleu px-5 font-bold text-white disabled:opacity-50"
            >
              {envoiEnCours
                ? "Validation…"
                : suivanteId
                  ? "Valider et passer à la suivante"
                  : "Valider"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}