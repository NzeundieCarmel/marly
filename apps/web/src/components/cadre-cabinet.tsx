import type { ReactNode } from "react";
import { lireProfil, lireTableauDeBord } from "@/lib/api";
import { CoquilleCabinet, type Rubrique } from "./coquille-cabinet";

// Le cadre du cabinet, avec ses données : à placer dans un <Suspense>
export async function CadreCabinet({ actif, children }: { actif: Rubrique; children: ReactNode }) {
  const [profil, tableau] = await Promise.all([lireProfil(), lireTableauDeBord()]);
  const lienAValider = tableau.premiereAValiderId
    ? `/pieces/${tableau.premiereAValiderId}`
    : "/dossiers?filtre=valider#dossiers";

  return (
    <CoquilleCabinet
      profil={profil}
      aValider={tableau.stats.aValider}
      lienAValider={lienAValider}
      actif={actif}
    >
      {children}
    </CoquilleCabinet>
  );
}