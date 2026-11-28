import Link from "next/link";
import type { ReactNode } from "react";
import { initiales } from "@/lib/format";
import { BoutonTheme } from "./bouton-theme";
import {
  IconeAccueil,
  IconeAchats,
  IconeAppareil,
  IconeCaisse,
  IconeCompta,
  IconeProfil,
  IconeStock,
  Monogramme,
} from "./icones";
import { IconeFacture } from "./icone-facture";

export type Onglet =
  | "accueil"
  | "envoyer"
  | "pieces"
  | "factures"
  | "caisse"
  | "achats"
  | "compta"
  | "stock"
  | "profil";

interface Entree {
  href: string;
  libelle: string;
  Icone: typeof IconeAppareil;
  // Pages pour lesquelles l'entrée est mise en avant
  pour: Onglet[];
}

// Barre du bas du téléphone : les cinq gestes du quotidien
const ONGLETS: Entree[] = [
  { href: "/envoyer/accueil", libelle: "Accueil", Icone: IconeAccueil, pour: ["accueil", "envoyer", "pieces", "profil"] },
  { href: "/envoyer/caisse", libelle: "Caisse", Icone: IconeCaisse, pour: ["caisse"] },
  { href: "/envoyer/factures", libelle: "Ventes", Icone: IconeFacture, pour: ["factures"] },
  { href: "/envoyer/stock", libelle: "Stock", Icone: IconeStock, pour: ["stock", "achats"] },
  { href: "/envoyer/compta", libelle: "Compta", Icone: IconeCompta, pour: ["compta"] },
];

// Menu latéral de l'ordinateur : toutes les rubriques
const MENU: Entree[] = [
  { href: "/envoyer/accueil", libelle: "Accueil", Icone: IconeAccueil, pour: ["accueil"] },
  { href: "/envoyer/caisse", libelle: "Caisse", Icone: IconeCaisse, pour: ["caisse"] },
  { href: "/envoyer/factures", libelle: "Ventes et factures", Icone: IconeFacture, pour: ["factures"] },
  { href: "/envoyer/stock/achats", libelle: "Achats", Icone: IconeAchats, pour: ["achats"] },
  { href: "/envoyer/stock", libelle: "Stock", Icone: IconeStock, pour: ["stock"] },
  { href: "/envoyer/compta", libelle: "Comptabilité", Icone: IconeCompta, pour: ["compta"] },
  { href: "/envoyer", libelle: "Pièces", Icone: IconeAppareil, pour: ["envoyer", "pieces"] },
  { href: "/envoyer/profil", libelle: "Profil", Icone: IconeProfil, pour: ["profil"] },
];

export function CadreTelephone({
  nomDossier,
  actif,
  large = false,
  children,
}: {
  nomDossier: string;
  actif: Onglet;
  // Pages riches (accueil, caisse) : plus de largeur sur ordinateur
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-page text-ink lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-1 bg-[#10294A] px-3.5 py-5 text-[#D6DEEA] lg:flex">
        <Link href="/envoyer/accueil" className="mb-5 flex items-center gap-2.5 px-2 text-xl font-bold text-white">
          <Monogramme taille={34} />
          Marly
        </Link>
        <nav aria-label="Menu principal" className="flex flex-col gap-1">
          {MENU.map(({ href, libelle, Icone, pour }) => {
            const courant = pour.includes(actif);
            return (
              <Link
                key={href}
                href={href}
                aria-current={courant ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] ${
                  courant ? "bg-[#1F3D66] font-bold text-white" : "hover:bg-[#1F3D66] hover:text-white"
                }`}
              >
                <Icone width={20} height={20} />
                {libelle}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#2A4A75] px-2 pt-3.5 text-[13px] leading-[18px]">
          <strong className="block text-sm text-white">{nomDossier}</strong>
        </div>
      </aside>

      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col lg:mx-0 lg:max-w-none lg:flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-5 py-3 lg:px-8">
          <Link href="/envoyer/accueil" aria-label="Accueil" className="flex items-center gap-2.5 lg:hidden">
            <Monogramme taille={32} />
            <span className="text-xl font-bold text-heading">Marly</span>
          </Link>
          <span className="hidden truncate text-base font-bold text-heading lg:block">{nomDossier}</span>
          <div className="flex items-center gap-1">
            <BoutonTheme />
            <Link
              href="/envoyer/profil"
              title={nomDossier}
              aria-label={`Profil de ${nomDossier}`}
              className="flex h-11 w-11 items-center justify-center rounded-full"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-info-bg text-[13px] font-bold text-info-ink">
                {initiales(nomDossier)}
              </span>
            </Link>
          </div>
        </header>

        <main
          className={`flex flex-1 flex-col gap-[18px] px-5 py-5 lg:mx-auto lg:w-full lg:px-8 lg:py-7 ${
            large ? "lg:max-w-[1180px]" : "lg:max-w-[760px]"
          }`}
        >
          {children}
        </main>

        <nav
          aria-label="Navigation principale"
          className="sticky bottom-0 z-20 flex justify-around border-t border-line bg-surface px-2 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 lg:hidden"
        >
          {ONGLETS.map(({ href, libelle, Icone, pour }) => {
            const courant = pour.includes(actif);
            return (
              <Link
                key={href}
                href={href}
                aria-current={courant ? "page" : undefined}
                className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs ${
                  courant ? "font-bold text-heading" : "font-medium text-muted"
                }`}
              >
                <Icone width={22} height={22} />
                {libelle}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}