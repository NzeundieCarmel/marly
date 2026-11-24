import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, listerPieces } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { statutsPiece } from "@/lib/statuts-piece";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";
import { Pastille } from "@/components/pastille";
import { ApercuPiece } from "./apercu-piece";

function Ligne({ terme, children, premiere = false }: { terme: string; children: React.ReactNode; premiere?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 ${premiere ? "" : "border-t border-line"}`}>
      <dt className="text-[13px] text-muted">{terme}</dt>
      <dd className="text-right text-[15px] font-medium">{children}</dd>
    </div>
  );
}

async function ContenuFiche({ parametres }: { parametres: Promise<{ id: string }> }) {
  const { id } = await parametres;
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  // Seules les pièces de son propre dossier sont cherchées : une autre pièce donne 404
  const piece = (await listerPieces(profil.dossier.id)).find((p) => p.id === id);
    if (!piece) {
    notFound();
  }
  // Une pièce de vente se consulte sur sa facture
  if (piece.factureId) {
    redirect(`/envoyer/factures/${encodeURIComponent(piece.factureId)}`);
  }

  const statut = statutsPiece(profil.autonome)[piece.statut];
  const titre = piece.fournisseur ?? piece.categorie;
  const src = piece.fichier ? `/api/pieces/${encodeURIComponent(piece.id)}/fichier` : null;
  const estPdf = piece.fichier?.toLowerCase().endsWith(".pdf") ?? false;
  const date = new Date(piece.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="pieces">
      <div className="-ml-2 flex items-center gap-1">
        <Link
          href="/envoyer/pieces"
          aria-label="Retour à mes pièces"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol"
        >
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="min-w-0 truncate text-xl font-bold text-heading">{titre}</h1>
      </div>

      <ApercuPiece src={src} pdf={estPdf} nom={titre} />

      <dl className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <Ligne terme="Date" premiere>{date}</Ligne>
        <Ligne terme="Montant">
          <span className="tabular-nums">{formatMontant(piece.montantTtc)} FCFA</span>
        </Ligne>
        <Ligne terme="Catégorie">{piece.categorie}</Ligne>
        <Ligne terme="Fournisseur">{piece.fournisseur ?? "Non renseigné"}</Ligne>
        <Ligne terme="Statut">
          <Pastille ton={statut.ton}>{statut.texte}</Pastille>
        </Ligne>
      </dl>

      {src && (
        <a
          href={`${src}?telecharger=1`}
          className="flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface text-[15px] font-medium text-ink hover:bg-survol"
        >
          Télécharger l&apos;original
        </a>
      )}

      <p className="text-[13px] leading-[19px] text-muted">
        En cas de contrôle, montrez la pièce depuis cette page ou téléchargez l&apos;original.
      </p>
    </CadreTelephone>
  );
}

export default function PageFichePiece({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuFiche parametres={params} />
    </Suspense>
  );
}