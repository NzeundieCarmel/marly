import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  lireAcces,
  lireApercuExport,
  lireProfil,
  listerDemandes,
  listerDossiers,
  listerExports,
  listerPieces,
  type StatutPiece,
} from "@/lib/api";
import { prochaineEcheance, versIsoJour } from "@/lib/echeances";
import { DemandesDossier } from "./demandes-dossier";
import { ExportSage } from "./export-sage";
import { GestionAcces } from "@/components/gestion-acces";

const LIBELLES: Record<StatutPiece, { texte: string; classes: string }> = {
  EN_ATTENTE: { texte: "En attente", classes: "bg-neutral-bg text-muted" },
  RECUE: { texte: "À valider", classes: "bg-info-bg text-info-ink" },
  A_COMPLETER: { texte: "À compléter", classes: "bg-warning-bg text-warning-ink" },
  TRAITEE: { texte: "Validée", classes: "bg-success-bg text-success-ink" },
  REMPLACEE: { texte: "Remplacée", classes: "bg-neutral-bg text-muted" },
};

const formatMontant = new Intl.NumberFormat("fr-FR");

async function ContenuDossier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profil, dossiers, pieces, demandes, apercuExport, lotsExport, acces] = await Promise.all([
    lireProfil(),
    listerDossiers(),
    listerPieces(id),
    listerDemandes(id),
    lireApercuExport(id),
    listerExports(id),
    lireAcces(id),
  ]);
  const dossier = dossiers.find((d) => d.id === id);
  if (!dossier) {
    notFound();
  }
  const premiereAValider = pieces.find((p) => p.statut === "RECUE");
  const peutGerer = profil.role === "RESPONSABLE" || profil.role === "COMPTABLE";

  // La date du jour est lue à chaque visite, jamais figée à l'avance
  await connection();
  const echeanceParDefaut = versIsoJour(prochaineEcheance(new Date()));

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted">
        <Link href="/dossiers" className="underline">← Dossiers du cabinet</Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-heading">{dossier.raisonSociale}</h1>
          <span className="text-sm text-muted">
            {dossier.regime === "REEL" ? "Régime réel" : "IGS"} · {dossier.piecesRecues} pièces ·{" "}
            {dossier.aValider} à valider
          </span>
        </div>
          <div className="flex flex-wrap gap-3">
          {peutGerer && (
            <Link
              href={`/dossiers/${dossier.id}/modifier`}
              className="flex h-11 items-center rounded-xl border border-line-strong bg-surface px-4 font-medium"
            >
              Modifier
            </Link>
          )}
        {premiereAValider && peutGerer && (
          <Link
            href={`/pieces/${premiereAValider.id}`}
            className="flex h-11 items-center rounded-xl bg-action px-5 font-bold text-white"
          >
            Valider les pièces ({dossier.aValider})
          </Link>
        )}
        </div>
      </header>

      <DemandesDossier
        dossierId={dossier.id}
        demandes={demandes}
        echeanceParDefaut={echeanceParDefaut}
        peutGerer={peutGerer}
      />

      
      <GestionAcces
        titre="Accès de l'entreprise"
        role="PME"
        dossierId={dossier.id}
        nomCabinet={profil.cabinet}
        nomDossier={dossier.raisonSociale}
        membres={acces.membres}
        invitations={acces.invitations}
        peutInviter={peutGerer}
      />

      {peutGerer && (
        <ExportSage dossierId={dossier.id} apercu={apercuExport} lots={lotsExport} />
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="text-sm text-muted">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Fournisseur</th>
              <th className="px-3 py-3 font-medium">Catégorie</th>
              <th className="px-3 py-3 text-right font-medium">Montant TTC</th>
              <th className="px-3 py-3 font-medium">Statut</th>
              <th className="px-5 py-3"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-5 py-4">{new Date(p.date).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</td>
                <td className="px-3 py-4 font-medium">{p.fournisseur ?? "Non précisé"}</td>
                <td className="px-3 py-4">{p.categorie}</td>
                <td className="px-3 py-4 text-right tabular-nums">{formatMontant.format(p.montantTtc)} FCFA</td>
                <td className="px-3 py-4">
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${LIBELLES[p.statut].classes}`}>
                    {LIBELLES[p.statut].texte}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {peutGerer && (
                    <Link href={`/pieces/${p.id}`} className="font-bold text-heading underline">
                      {p.statut === "RECUE" ? "Valider" : "Voir"}
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PageDossier({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<p className="text-muted">Chargement du dossier…</p>}>
        <ContenuDossier params={params} />
      </Suspense>
    </main>
  );
}