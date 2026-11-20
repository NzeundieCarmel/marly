import { Suspense } from "react";
import { lireAcces, lireProfil } from "@/lib/api";
import { CadreCabinet } from "@/components/cadre-cabinet";
import { GestionAcces } from "@/components/gestion-acces";

async function ContenuEquipe() {
  const [profil, acces] = await Promise.all([lireProfil(), lireAcces()]);

  return (
    <CadreCabinet actif="equipe">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted">{profil.cabinet}</span>
        <h1 className="text-[28px] font-bold leading-[34px] text-heading">Équipe du cabinet</h1>
      </div>
      <div className="max-w-3xl">
        <GestionAcces
          titre="Collaborateurs"
          role="COMPTABLE"
          dossierId={null}
          nomCabinet={profil.cabinet}
          membres={acces.membres}
          invitations={acces.invitations}
          peutInviter={profil.role === "RESPONSABLE"}
        />
      </div>
    </CadreCabinet>
  );
}

export default function PageEquipe() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement de l&apos;équipe…</p>}>
      <ContenuEquipe />
    </Suspense>
  );
}