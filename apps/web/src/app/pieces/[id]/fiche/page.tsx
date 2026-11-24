import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lirePiece } from "@/lib/api";
import { statutsPiece } from "@/lib/statuts-piece";
import { BoutonImprimer } from "@/components/boutons-document";
import { FichePiece } from "@/components/fiche-piece";

async function ContenuFicheCabinet({ parametres }: { parametres: Promise<{ id: string }> }) {
  const { id } = await parametres;
  const { piece, dossier, ecriture } = await lirePiece(id);
  if (piece.factureId) {
    redirect(`/pieces/${encodeURIComponent(id)}/facture`);
  }

  return (
    <div className="min-h-dvh bg-page pb-10 pt-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3 px-3 print:hidden">
        <Link href={`/pieces/${encodeURIComponent(id)}`} className="py-2 text-sm font-bold text-link underline">
          Retour à la validation
        </Link>
        <BoutonImprimer className="flex h-11 items-center justify-center rounded-xl bg-action px-4 text-[15px] font-bold text-white hover:bg-action-hover" />
      </div>
      <FichePiece
        donnees={{
          entreprise: { nom: dossier.raisonSociale, niu: dossier.niu, regime: dossier.regime },
          piece: {
            id: piece.id,
            date: piece.date,
            montantTtc: piece.montantTtc,
            fournisseur: piece.fournisseur,
            categorie: piece.categorie,
            statut: statutsPiece(false)[piece.statut].texte,
            recueLe: piece.recueLe,
            empreinte: piece.empreinte,
          },
          srcFichier: piece.aUnFichier ? `/api/pieces/${encodeURIComponent(piece.id)}/fichier` : null,
          // L'écriture ne figure sur la fiche qu'une fois validée
          ecriture: piece.statut === "TRAITEE" && !ecriture.proposee ? { journal: ecriture.journal, lignes: ecriture.lignes } : null,
        }}
      />
    </div>
  );
}

export default function PageFichePieceCabinet({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement de la fiche…</p>}>
      <ContenuFicheCabinet parametres={params} />
    </Suspense>
  );
}