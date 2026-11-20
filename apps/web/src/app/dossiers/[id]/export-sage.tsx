"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApercuExport, LotExport } from "@/lib/api";

const formatMontant = new Intl.NumberFormat("fr-FR");

function formatJour(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

function formatDateHeure(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  });
}

export function ExportSage({
  dossierId,
  apercu,
  lots,
}: {
  dossierId: string;
  apercu: ApercuExport;
  lots: LotExport[];
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const equilibre = apercu.totalDebit === apercu.totalCredit;

  async function generer() {
    setErreur(null);
    setEnCours(true);
    try {
      const reponse = await fetch(`/api/dossiers/${dossierId}/exports`, { method: "POST" });
      const corps = (await reponse.json().catch(() => null)) as
        | { id?: string; message?: string }
        | null;
      if (!reponse.ok || !corps?.id) {
        setErreur(corps?.message ?? "L'export a échoué. Réessaie.");
        return;
      }
      router.refresh();
      // Lance le téléchargement du fichier sans quitter la page
      const lien = document.createElement("a");
      lien.href = `/api/exports/${corps.id}/fichier`;
      lien.download = "";
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
    } catch {
      setErreur("Le serveur Marly est injoignable. Réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section
      aria-labelledby="titre-export"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titre-export" className="text-lg font-bold">
          Export vers Sage
        </h2>
        <span className="text-sm text-muted">Fichier CSV · séparateur « ; »</span>
      </div>

      {erreur && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">
          {erreur}
        </p>
      )}

      {apercu.nbPieces === 0 ? (
        <p className="text-sm text-muted">Aucune nouvelle pièce validée à exporter.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-page p-4">
          <div className="flex flex-col gap-1">
            <strong>
              {apercu.nbPieces} pièce{apercu.nbPieces > 1 ? "s" : ""} prête
              {apercu.nbPieces > 1 ? "s" : ""} à exporter
            </strong>
            <span className="text-sm text-muted">
              {apercu.nbLignes} lignes
              {apercu.du && apercu.au
                ? ` · du ${formatJour(apercu.du)} au ${formatJour(apercu.au)}`
                : ""}
            </span>
            <span className={`text-sm ${equilibre ? "text-success-ink" : "text-danger-ink"}`}>
              Débit {formatMontant.format(apercu.totalDebit)} {equilibre ? "=" : "≠"} Crédit{" "}
              {formatMontant.format(apercu.totalCredit)} FCFA
            </span>
          </div>
          <button
            type="button"
            onClick={generer}
            disabled={enCours || !equilibre}
            className="h-11 rounded-xl bg-action px-5 font-bold text-white disabled:opacity-60"
          >
            {enCours ? "Génération…" : "Générer l'export"}
          </button>
        </div>
      )}

      {lots.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="mb-2 text-left font-medium text-muted">
              Exports précédents
            </caption>
            <thead>
              <tr className="text-muted">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Par</th>
                <th className="px-3 py-2 text-right font-medium">Pièces</th>
                <th className="px-3 py-2 text-right font-medium">Montant</th>
                <th className="py-2 pl-3">
                  <span className="sr-only">Fichier</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-t border-line">
                  <td className="py-3 pr-3">{formatDateHeure(lot.creeLe)}</td>
                  <td className="px-3 py-3">{lot.creePar}</td>
                  <td className="px-3 py-3 text-right">{lot.nbPieces}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatMontant.format(lot.totalDebit)} FCFA
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <a
                      href={`/api/exports/${lot.id}/fichier`}
                      className="font-bold text-heading underline"
                    >
                      Télécharger
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}