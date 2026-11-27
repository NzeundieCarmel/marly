import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireJournalComptable, lireProfil } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { EnTeteCompta, formatJourCourt } from "../en-tete";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const JOURNAUX = [
  { code: "", nom: "Tous" },
  { code: "CA", nom: "Caisse" },
  { code: "BQ", nom: "Banque" },
  { code: "MM", nom: "Mobile Money" },
  { code: "AC", nom: "Achats" },
  { code: "VE", nom: "Ventes" },
  { code: "OD", nom: "Divers" },
];

async function ContenuJournal({ recherche }: { recherche: Recherche }) {
  const [profil, parametres] = await Promise.all([lireProfil(), recherche]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const code = typeof parametres.j === "string" && JOURNAUX.some((j) => j.code === parametres.j) ? parametres.j : "";
  const ecritures = (await lireJournalComptable(profil.dossier.id, code || undefined)).reverse();

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="compta">
      <EnTeteCompta titre="Journaux" />

      <nav aria-label="Choix du journal" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {JOURNAUX.map((j) => (
          <Link
            key={j.code || "tous"}
            href={j.code ? `/envoyer/compta/journal?j=${j.code}` : "/envoyer/compta/journal"}
            aria-current={code === j.code ? "page" : undefined}
            className={`flex h-10 shrink-0 items-center rounded-full border px-4 text-sm ${
              code === j.code ? "border-action bg-action font-bold text-white" : "border-line-strong bg-surface text-ink hover:bg-survol"
            }`}
          >
            {j.nom}
          </Link>
        ))}
      </nav>

      {ecritures.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">Aucune écriture dans ce journal.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ecritures.map((e) => (
            <li key={e.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
                <span className="min-w-0 truncate text-[15px] font-bold text-heading">{e.libelle}</span>
                <span className="shrink-0 text-[13px] text-muted tabular-nums">
                  {e.journal} n°{e.numero} · {formatJourCourt(e.date)}
                </span>
              </div>
              <table className="mt-2 w-full text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="px-4 pb-1 font-medium">Compte</th>
                    <th className="pb-1 text-right font-medium">Débit</th>
                    <th className="px-4 pb-1 text-right font-medium">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {e.mouvements.map((m, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-4 py-2">
                        <span className="block">{m.intitule}</span>
                        <span className="text-[12px] text-muted tabular-nums">{m.compte}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{m.debit ? formatMontant(m.debit) : ""}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{m.credit ? formatMontant(m.credit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
    </CadreTelephone>
  );
}

export default function PageJournal({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuJournal recherche={searchParams} />
    </Suspense>
  );
}