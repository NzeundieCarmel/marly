import type { ReactNode } from "react";
import { Monogramme } from "./icones";
import { BoutonTheme } from "./bouton-theme";

// Bandeau bleu Marly avec le motif des points verts, puis le contenu :
// invitation, inscription, connexion
export function CadreAccueil({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <div className="bg-identity">
        <div className="relative mx-auto h-[210px] max-w-md overflow-hidden">
          <svg
            width="390"
            height="210"
            viewBox="0 0 390 210"
            aria-hidden="true"
            className="absolute right-0 top-0"
          >
            <circle cx="258" cy="36" r="5" fill="#2BB673" />
            <circle cx="298" cy="36" r="5" fill="#2BB673" />
            <circle cx="338" cy="36" r="5" fill="#2BB673" />
            <circle cx="298" cy="76" r="5" fill="#2BB673" />
            <circle cx="338" cy="76" r="5" fill="#2BB673" />
            <circle cx="338" cy="116" r="5" fill="#2BB673" />
            <rect x="300" y="150" width="140" height="96" rx="16" fill="#2BB673" />
          </svg>
          <div className="absolute right-3 top-3 z-10">
            <BoutonTheme variante="bandeau" />
          </div>
          <div className="absolute bottom-6 left-5 flex flex-col gap-3.5 pr-28">
            <Monogramme taille={48} inverse />
            <h1 className="text-[28px] font-bold leading-[34px] text-white">{titre}</h1>
          </div>
        </div>
      </div>
      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-[18px] px-5 py-6">
        {children}
      </main>
    </div>
  );
}