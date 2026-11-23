import Link from "next/link";
import type { ReactNode } from "react";
import { initiales } from "@/lib/format";
import { BoutonTheme } from "./bouton-theme";
import { IconeAppareil, IconePiece, IconeProfil, Monogramme } from "./icones";
import { IconeFacture } from "./icone-facture";

export type Onglet = "envoyer" | "pieces" | "factures" | "profil";

const ONGLETS: { cle: Onglet; href: string; libelle: string; Icone: typeof IconeAppareil }[] = [
  { cle: "envoyer", href: "/envoyer", libelle: "Envoyer", Icone: IconeAppareil },
  { cle: "pieces", href: "/envoyer/pieces", libelle: "Mes pièces", Icone: IconePiece },
  { cle: "factures", href: "/envoyer/factures", libelle: "Factures", Icone: IconeFacture },
  { cle: "profil", href: "/envoyer/profil", libelle: "Profil", Icone: IconeProfil },
];

export function CadreTelephone({
  nomDossier,
  actif,
  children,
}: {
  nomDossier: string;
  actif: Onglet;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-page text-ink">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
        <Link href="/envoyer" className="flex items-center gap-2.5">
          <Monogramme taille={32} />
          <span className="text-xl font-bold text-heading">Marly</span>
        </Link>
        <div className="flex items-center gap-1">
          <BoutonTheme />
          <span
            title={nomDossier}
            aria-label={nomDossier}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-info-bg text-[13px] font-bold text-info-ink"
          >
            {initiales(nomDossier)}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-[18px] px-5 py-5">{children}</main>

      <nav
        aria-label="Navigation principale"
        className="sticky bottom-0 z-20 flex justify-around border-t border-line bg-surface px-2 pb-[max(14px,env(safe-area-inset-bottom))] pt-2"
      >
        {ONGLETS.map(({ cle, href, libelle, Icone }) => (
          <Link
            key={cle}
            href={href}
            aria-current={actif === cle ? "page" : undefined}
            className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs ${
              actif === cle ? "font-bold text-heading" : "font-medium text-muted"
            }`}
          >
            <Icone width={22} height={22} />
            {libelle}
          </Link>
        ))}
      </nav>
    </div>
  );
}