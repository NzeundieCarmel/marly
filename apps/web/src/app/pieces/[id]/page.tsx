import Link from "next/link";
import { Suspense } from "react";
import { lirePiece, listerPieces } from "@/lib/api";
import { EditeurEcriture } from "./editeur-ecriture";

const formatMontant = new Intl.NumberFormat("fr-FR");

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

async function ContenuPiece({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await lirePiece(id);
  const { piece, dossier, ecriture } = detail;

  // Pièces encore à valider dans ce dossier, pour enchaîner sans revenir en arrière
  const aValider = (await listerPieces(dossier.id)).filter((p) => p.statut === "RECUE");
  const position = aValider.findIndex((p) => p.id === piece.id);
  const suivanteId = aValider.find((p) => p.id !== piece.id)?.id ?? null;
  const urlFichier = `/api/pieces/${piece.id}/fichier`;

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-4 flex flex-wrap gap-2 text-sm text-marly-gris">
        <Link href="/dossiers" className="underline">Dossiers</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/dossiers/${dossier.id}`} className="underline">{dossier.raisonSociale}</Link>
        <span aria-hidden="true">›</span>
        <span className="font-medium text-marly-texte">
          {position >= 0 ? `Pièce ${position + 1} sur ${aValider.length} à valider` : "Pièce"}
        </span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-marly-bleu">
          {piece.fournisseur ?? piece.categorie} · {formatMontant.format(piece.montantTtc)} FCFA
        </h1>
        <span className="rounded-full bg-[#E6EEF9] px-3 py-1 text-sm font-medium text-[#1D4F91]">
          {dossier.regime === "REEL" ? `Régime réel · TVA ${dossier.tauxTva} %` : "IGS · sans TVA récupérable"}
        </span>
      </div>

      {piece.statut === "TRAITEE" && (
        <p role="status" className="mb-4 rounded-xl bg-[#E3F5EC] p-3 text-sm text-[#11734B]">
          Pièce validée{piece.valideLe ? ` le ${formatDate(piece.valideLe)}` : ""}.
        </p>
      )}
      {piece.statut === "A_COMPLETER" && (
        <p role="status" className="mb-4 rounded-xl bg-[#FFF2DB] p-3 text-sm text-[#7A4A00]">
          Pièce à compléter par l&apos;entreprise avant validation.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-label="Pièce reçue" className="flex flex-col gap-3 rounded-2xl border border-marly-bord bg-white p-4">
          {piece.aUnFichier ? (
            <>
              <iframe
                src={urlFichier}
                title="Pièce justificative"
                className="h-[480px] w-full rounded-lg border border-marly-bord bg-[#E9EDF3]"
              />
              <a href={urlFichier} target="_blank" rel="noreferrer" className="text-sm text-marly-bleu underline">
                Ouvrir la pièce dans un nouvel onglet
              </a>
            </>
          ) : (
            <div className="flex h-[480px] items-center justify-center rounded-lg bg-[#E9EDF3] p-6 text-center text-marly-gris">
              Aucun fichier joint (pièce de démonstration).
            </div>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <section aria-label="Saisi par l'entreprise" className="grid grid-cols-2 gap-4 rounded-2xl border border-marly-bord bg-white p-5 text-sm sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-marly-gris">Date</span>
              <span>{formatDate(piece.date)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-marly-gris">Fournisseur</span>
              <span>{piece.fournisseur ?? "Non précisé"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-marly-gris">Montant TTC</span>
              <span>{formatMontant.format(piece.montantTtc)} FCFA</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-marly-gris">Catégorie</span>
              <span>{piece.categorie}</span>
            </div>
          </section>

          <EditeurEcriture
            key={piece.id}
            pieceId={piece.id}
            dossierId={dossier.id}
            statut={piece.statut}
            journal={ecriture.journal}
            lignesInitiales={ecriture.lignes}
            suivanteId={suivanteId}
          />
        </div>
      </div>
    </>
  );
}

export default function PagePiece({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <Suspense fallback={<p className="text-marly-gris">Chargement de la pièce…</p>}>
        <ContenuPiece params={params} />
      </Suspense>
    </main>
  );
}