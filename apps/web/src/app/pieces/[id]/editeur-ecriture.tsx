"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LigneEcriture } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { intitule } from "@/lib/plan-comptable";

interface LigneSaisie {
  compte: string;
  libelle: string;
  tiers: string;
  debit: string;
  credit: string;
}

function versSaisie(l: LigneEcriture): LigneSaisie {
  return {
    compte: l.compte,
    libelle: l.libelle,
    tiers: l.tiers ?? "",
    debit: l.debit ? String(l.debit) : "",
    credit: l.credit ? String(l.credit) : "",
  };
}

function nombre(valeur: string): number {
  const n = parseInt(valeur.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const CHAMP =
  "h-10 w-full rounded-lg border border-line-strong bg-surface px-2 text-[15px] text-ink";

export function EditeurEcriture({
  pieceId,
  dossierId,
  suivanteId,
  journal,
  lignesInitiales,
  proposee,
  modifiable,
  actionsSecondaires,
}: {
  pieceId: string;
  dossierId: string;
  suivanteId: string | null;
  journal: string;
  lignesInitiales: LigneEcriture[];
  proposee: boolean;
  modifiable: boolean;
  actionsSecondaires?: ReactNode;
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState<LigneSaisie[]>(() => lignesInitiales.map(versSaisie));
  const [edition, setEdition] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const totalDebit = lignes.reduce((s, l) => s + nombre(l.debit), 0);
  const totalCredit = lignes.reduce((s, l) => s + nombre(l.credit), 0);
  const equilibre = totalDebit === totalCredit && totalDebit > 0;

  function changer(index: number, champ: keyof LigneSaisie, valeur: string) {
    setLignes((ls) => ls.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  function ajouter() {
    setLignes((ls) => [...ls, { compte: "", libelle: ls[0]?.libelle ?? "", tiers: "", debit: "", credit: "" }]);
  }

  function retirer(index: number) {
    setLignes((ls) => ls.filter((_, i) => i !== index));
  }

  async function valider(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (!modifiable || enCours) return;
    setErreur(null);
    if (!equilibre) {
      setErreur("L'écriture n'est pas équilibrée : le total des débits doit égaler celui des crédits.");
      return;
    }
    setEnCours(true);
    try {
      const reponse = await fetch(`/api/pieces/${pieceId}/valider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journal,
          lignes: lignes.map((l) => ({
            compte: l.compte.trim(),
            libelle: l.libelle.trim(),
            tiers: l.tiers.trim() || null,
            debit: nombre(l.debit),
            credit: nombre(l.credit),
          })),
        }),
      });
      if (!reponse.ok) {
        const corps = (await reponse.json().catch(() => null)) as { message?: string | string[] } | null;
        const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
        setErreur(message ?? "La validation a échoué. Réessaie.");
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

  return (
    <div className="flex flex-col gap-4">
      <form id="form-ecriture" onSubmit={valider}>
        <section
          aria-labelledby="titre-ecriture"
          className="overflow-hidden rounded-2xl border-2 border-heading bg-surface"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="titre-ecriture" className="text-base font-bold">
              Écriture {modifiable ? (proposee ? "proposée" : "à compléter") : "validée"} · journal{" "}
              {journal === "AC" ? "des achats (AC)" : journal}
            </h2>
            <span className="text-[13px] text-muted">Plan comptable SYSCOHADA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="text-[13px] text-muted">
                  <th scope="col" className="px-5 py-2.5 font-medium">Compte</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Libellé</th>
                  {edition && <th scope="col" className="px-3 py-2.5 font-medium">Tiers</th>}
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Débit</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Crédit</th>
                  {edition && <th scope="col" className="w-12"><span className="sr-only">Retirer</span></th>}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) =>
                  edition ? (
                    <tr key={i} className="border-t border-line">
                      <td className="px-5 py-2">
                        <input aria-label={`Compte, ligne ${i + 1}`} value={l.compte} inputMode="numeric" maxLength={8} onChange={(e) => changer(i, "compte", e.target.value)} className={`${CHAMP} max-w-[96px] tabular-nums`} />
                      </td>
                      <td className="px-3 py-2">
                        <input aria-label={`Libellé, ligne ${i + 1}`} value={l.libelle} maxLength={80} onChange={(e) => changer(i, "libelle", e.target.value)} className={CHAMP} />
                      </td>
                      <td className="px-3 py-2">
                        <input aria-label={`Tiers, ligne ${i + 1}`} value={l.tiers} maxLength={120} onChange={(e) => changer(i, "tiers", e.target.value)} className={CHAMP} />
                      </td>
                      <td className="px-3 py-2">
                        <input aria-label={`Débit, ligne ${i + 1}`} value={l.debit} inputMode="numeric" onChange={(e) => changer(i, "debit", e.target.value)} className={`${CHAMP} text-right tabular-nums`} />
                      </td>
                      <td className="px-5 py-2">
                        <input aria-label={`Crédit, ligne ${i + 1}`} value={l.credit} inputMode="numeric" onChange={(e) => changer(i, "credit", e.target.value)} className={`${CHAMP} text-right tabular-nums`} />
                      </td>
                      <td className="pr-3">
                        <button type="button" aria-label={`Retirer la ligne ${i + 1}`} disabled={lignes.length <= 2} onClick={() => retirer(i)} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-survol disabled:opacity-40">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-t border-line">
                      <td className="px-5 py-3">
                        <strong>{l.compte}</strong> {intitule(l.compte)}
                        {l.tiers && <span className="text-muted"> · {l.tiers}</span>}
                      </td>
                      <td className="px-3 py-3">{l.libelle}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{nombre(l.debit) ? formatMontant(nombre(l.debit)) : ""}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{nombre(l.credit) ? formatMontant(nombre(l.credit)) : ""}</td>
                    </tr>
                  ),
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong font-bold">
                  <td colSpan={edition ? 3 : 2} className={`px-5 py-3 ${equilibre ? "text-success-ink" : "text-danger-ink"}`}>
                    {equilibre ? "Total · équilibrée" : `Écart de ${formatMontant(Math.abs(totalDebit - totalCredit))} FCFA`}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMontant(totalDebit)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatMontant(totalCredit)}</td>
                  {edition && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
          {edition && (
            <div className="border-t border-line px-5 py-3">
              <button type="button" onClick={ajouter} disabled={lignes.length >= 20} className="h-10 rounded-lg px-2 text-sm font-medium text-link underline">
                + Ajouter une ligne
              </button>
            </div>
          )}
        </section>
      </form>

      {erreur && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
          {erreur}
        </p>
      )}

      {modifiable && (
        <div className="flex flex-wrap items-center gap-3">
          {actionsSecondaires}
          <button
            type="button"
            onClick={() => setEdition((e) => !e)}
            className="h-11 rounded-xl border border-line-strong bg-surface px-4 text-[15px] font-medium text-ink hover:bg-survol"
          >
            {edition ? "Terminer la modification" : "Modifier l'écriture"}
          </button>
          <span className="flex-grow" />
          <button
            type="submit"
            form="form-ecriture"
            autoFocus={!edition}
            disabled={enCours || !equilibre}
            className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-action px-5 text-[15px] font-bold text-white hover:bg-action-hover disabled:opacity-60"
          >
            {enCours ? "Validation…" : suivanteId ? "Valider et passer à la suivante" : "Valider la pièce"}
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium">Entrée</span>
          </button>
        </div>
      )}
    </div>
  );
}