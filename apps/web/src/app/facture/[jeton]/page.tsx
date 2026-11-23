import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { lireFacturePublique } from "@/lib/api";
import { BoutonImprimer } from "@/components/boutons-document";
import { DocumentFacture } from "@/components/document-facture";

// Page publique : jamais indexée, et l'adresse (qui contient le jeton) n'est transmise à aucun autre site
export const metadata: Metadata = {
  title: "Facture · Marly",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function ContenuPublic({ parametres }: { parametres: Promise<{ jeton: string }> }) {
  const { jeton } = await parametres;
  const document = await lireFacturePublique(jeton);
  if (!document) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-page pb-10 pt-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] justify-end px-3 print:hidden">
        <BoutonImprimer className="flex h-12 items-center justify-center rounded-xl bg-action px-4 text-[15px] font-bold text-white hover:bg-action-hover" />
      </div>
      <DocumentFacture document={document} />
    </div>
  );
}

export default function PageFacturePublique({ params }: { params: Promise<{ jeton: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement de la facture…</p>}>
      <ContenuPublic parametres={params} />
    </Suspense>
  );
}