import Link from "next/link";
import { Suspense } from "react";
import { lireAcces, lireProfil } from "@/lib/api";
import { GestionAcces } from "@/components/gestion-acces";

async function ContenuEquipe() {
  const [profil, acces] = await Promise.all([lireProfil(), lireAcces()]);

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted">
        <Link href="/dossiers" className="underline">← Dossiers du cabinet</Link>
      </nav>
      <h1 className="mb-6 text-3xl font-bold text-heading">Équipe de {profil.cabinet}</h1>
      <GestionAcces
        titre="Collaborateurs"
        role="COMPTABLE"
        dossierId={null}
        nomCabinet={profil.cabinet}
        membres={acces.membres}
        invitations={acces.invitations}
        peutInviter={profil.role === "RESPONSABLE"}
      />
    </>
  );
}

export default function PageEquipe() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p className="text-muted">Chargement de l&apos;équipe…</p>}>
        <ContenuEquipe />
      </Suspense>
    </main>
  );
}