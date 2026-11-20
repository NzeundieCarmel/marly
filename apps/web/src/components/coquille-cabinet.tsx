import Link from "next/link";
import type { ReactNode } from "react";
import type { Profil } from "@/lib/api";
import { initiales } from "@/lib/format";
import { seDeconnecter } from "@/app/connexion/actions";
import {
  IconeDossiers,
  IconeEquipe,
  IconeExport,
  IconeSortie,
  IconeTableau,
  IconeValider,
  Monogramme,
} from "./icones";

export type Rubrique = "tableau" | "valider" | "dossiers" | "exports" | "equipe";

const BASE = "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px]";
const ACTIF = `${BASE} bg-nav-active font-bold text-white`;
const INACTIF = `${BASE} text-nav-ink hover:bg-nav-active hover:text-white`;

export function CoquilleCabinet({
  profil,
  aValider,
  lienAValider,
  actif,
  children,
}: {
  profil: Profil;
  aValider: number;
  lienAValider: string;
  actif: Rubrique;
  children: ReactNode;
}) {
  const liens: { cle: Rubrique; href: string; libelle: string; Icone: typeof IconeTableau }[] = [
    { cle: "tableau", href: "/dossiers", libelle: "Tableau de bord", Icone: IconeTableau },
    { cle: "valider", href: lienAValider, libelle: "Pièces à valider", Icone: IconeValider },
    { cle: "dossiers", href: "/dossiers#dossiers", libelle: "Dossiers clients", Icone: IconeDossiers },
    { cle: "exports", href: "/dossiers?filtre=exporter#dossiers", libelle: "Exports Sage", Icone: IconeExport },
    { cle: "equipe", href: "/equipe", libelle: "Équipe", Icone: IconeEquipe },
  ];

  return (
    <div className="flex min-h-screen flex-wrap bg-page text-ink">
      <aside className="flex w-full flex-col gap-8 bg-nav px-4 py-6 text-white md:w-auto md:max-w-[260px] md:flex-[1_1_240px]">
        <Link href="/dossiers" className="flex items-center gap-2.5 px-2 text-white">
          <Monogramme inverse />
          <span className="text-[22px] font-bold tracking-tight">Marly</span>
        </Link>

        <nav aria-label="Menu du cabinet" className="flex flex-col gap-1">
          {liens.map(({ cle, href, libelle, Icone }) => (
            <Link
              key={cle}
              href={href}
              aria-current={actif === cle ? "page" : undefined}
              className={actif === cle ? ACTIF : INACTIF}
            >
              <Icone />
              <span className="flex-grow">{libelle}</span>
              {cle === "valider" && aValider > 0 && (
                <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-brand-900">
                  {aValider}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 border-t border-nav-line px-3 pt-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-800">
            {initiales(profil.nom)}
          </span>
          <span className="flex min-w-0 flex-grow flex-col">
            <span className="truncate text-sm font-bold">{profil.nom}</span>
            <span className="truncate text-[13px] text-nav-ink">{profil.cabinet}</span>
          </span>
          <form action={seDeconnecter}>
            <button
              type="submit"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-nav-ink hover:bg-nav-active hover:text-white"
            >
              <IconeSortie />
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-[999_1_560px] px-5 pb-12 pt-8 md:px-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}