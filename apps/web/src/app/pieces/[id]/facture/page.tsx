import Link from "next/link";
import { Suspense } from "react";
import { lireFactureDePiece } from "@/lib/api";
import { BoutonImprimer } from "@/components/boutons-document";
import { DocumentFacture } from "@/components/document-facture";

async function ContenuFacturePiece({ parametres }: { parametres: Promise<{ id: string }> }) {
  const { id } = await parametres;
  const document = await lireFactureDePiece(id);

  return (
    <div className="min-h-dvh bg-page pb-10 pt-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3 px-3 print:hidden">
        <Link href={`/pieces/${id}`} className="py-2 text-sm font-bold text-link underline">
          Retour à la validation
        </Link>
        <BoutonImprimer className="flex h-11 items-center justify-center rounded-xl bg-action px-4 text-[15px] font-bold text-white hover:bg-action-hover" />
      </div>
      <DocumentFacture document={document} />
    </div>
  );
}

export default function PageFacturePiece({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement de la facture…</p>}>
      <ContenuFacturePiece parametres={params} />
    </Suspense>
  );
}