import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  lireProfil,
  listerDemandes,
  listerDossiers,
  listerPieces,
  type StatutPiece,
} from "@/lib/api";
import { prochaineEcheance, versIsoJour } from "@/lib/echeances";
import { DemandesDossier } from "./demandes-dossier";

const LIBELLES: Record<StatutPiece, { texte: string; classes: string }> = {
  EN_ATTENTE: { texte: "En attente", classes: "bg-[#EEF1F5] text-marly-gris" },
  RECUE: { texte: "À valider", classes: "bg-[#E6EEF9] text-[#1D4F91]" },
  A_COMPLETER: { texte: "À compléter", classes: "bg-[#FFF2DB] text-[#7A4A00]" },
  TRAITEE: { texte: "Validée", classes: "bg-[#E3F5EC] text-[#11734B]" },
  REMPLACEE: { texte: "Remplacée", classes: "bg-[#EEF1F5] text-marly-gris" },
};

const formatMontant = new Intl.NumberFormat("fr-FR");

async function ContenuDossier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profil, dossiers, pieces, demandes] = await Promise.all([
    lireProfil(),
    listerDossiers(),
    listerPieces(id),
    listerDemandes(id),
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
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-marly-gris">
        <Link href="/dossiers" className="underline">← Dossiers du cabinet</Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-marly-bleu">{dossier.raisonSociale}</h1>
          <span className="text-sm text-marly-gris">
            {dossier.regime === "REEL" ? "Régime réel" : "IGS"} · {dossier.piecesRecues} pièces ·{" "}
            {dossier.aValider} à valider
          </span>
        </div>
        {premiereAValider && peutGerer && (
          <Link
            href={`/pieces/${premiereAValider.id}`}
            className="flex h-11 items-center rounded-xl bg-marly-bleu px-5 font-bold text-white"
          >
            Valider les pièces ({dossier.aValider})
          </Link>
        )}
      </header>

      <DemandesDossier
        dossierId={dossier.id}
        demandes={demandes}
        echeanceParDefaut={echeanceParDefaut}
        peutGerer={peutGerer}
      />

      <div className="overflow-x-auto rounded-2xl border border-marly-bord bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="text-sm text-marly-gris">
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
              <tr key={p.id} className="border-t border-marly-bord">
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
                    <Link href={`/pieces/${p.id}`} className="font-bold text-marly-bleu underline">
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
      <Suspense fallback={<p className="text-marly-gris">Chargement du dossier…</p>}>
        <ContenuDossier params={params} />
      </Suspense>
    </main>
  );
}