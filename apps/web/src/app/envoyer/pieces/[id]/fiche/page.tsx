import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, lireProfilEmetteur, listerPieces } from "@/lib/api";
import { statutsPiece } from "@/lib/statuts-piece";
import { BoutonImprimer } from "@/components/boutons-document";
import { FichePiece } from "@/components/fiche-piece";

async function ContenuFiche({ parametres }: { parametres: Promise<{ id: string }> }) {
  const { id } = await parametres;
  const [profil, emetteur] = await Promise.all([lireProfil(), lireProfilEmetteur()]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  // Seules les pièces de son propre dossier sont cherchées : une autre pièce donne 404
  const piece = (await listerPieces(profil.dossier.id)).find((p) => p.id === id);
  if (!piece) {
    notFound();
  }
  // Une vente a déjà son document : la facture elle-même
  if (piece.factureId) {
    redirect(`/envoyer/factures/${encodeURIComponent(piece.factureId)}/document`);
  }

  return (
    <div className="min-h-dvh bg-page pb-10 pt-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3 px-3 print:hidden">
        <Link href={`/envoyer/pieces/${encodeURIComponent(id)}`} className="py-2 text-sm font-bold text-link underline">
          Retour à la pièce
        </Link>
        <BoutonImprimer className="flex h-11 items-center justify-center rounded-xl bg-action px-4 text-[15px] font-bold text-white hover:bg-action-hover" />
      </div>
      <FichePiece
        donnees={{
          entreprise: { nom: emetteur.raisonSociale, niu: emetteur.niu, regime: emetteur.regime },
          piece: {
            id: piece.id,
            date: piece.date,
            montantTtc: piece.montantTtc,
            fournisseur: piece.fournisseur,
            categorie: piece.categorie,
            statut: statutsPiece(profil.autonome)[piece.statut].texte,
            recueLe: piece.creeLe,
            empreinte: piece.empreinte,
          },
          srcFichier: piece.fichier ? `/api/pieces/${encodeURIComponent(piece.id)}/fichier` : null,
          ecriture: null,
        }}
      />
    </div>
  );
}

export default function PageFichePieceEntreprise({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement de la fiche…</p>}>
      <ContenuFiche parametres={params} />
    </Suspense>
  );
}