import Link from "next/link";
import { Suspense } from "react";
import { lireJournal, lireProfil, listerDossiers } from "@/lib/api";
import { LIBELLES_ROLES, libelleAction } from "@/lib/libelles-audit";
import { CadreCabinet } from "@/components/cadre-cabinet";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

function quand(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Douala" });
}

async function ContenuJournal({ recherche }: { recherche: Recherche }) {
  const parametres = await recherche;
  const brut = Array.isArray(parametres.dossier) ? parametres.dossier[0] : parametres.dossier;
  const dossierId = brut && /^[a-z0-9]{10,40}$/.test(brut) ? brut : undefined;
  const [profil, dossiers, entrees] = await Promise.all([lireProfil(), listerDossiers(), lireJournal(dossierId)]);

  return (
    <CadreCabinet actif="equipe">
      <div className="flex flex-col gap-1">
        <Link href="/equipe" className="self-start text-sm text-muted underline">{profil.cabinet}</Link>
        <h1 className="text-[28px] font-bold leading-[34px] text-heading">Journal d&apos;activité</h1>
        <p className="max-w-2xl text-[15px] text-muted">
          Les 300 dernières actions faites par ton équipe et par les entreprises de tes dossiers : qui, quand, quoi.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="dossier" className="text-sm font-medium text-muted">Dossier</label>
          <select id="dossier" name="dossier" defaultValue={dossierId ?? ""} className="h-11 min-w-[240px] rounded-xl border border-line-strong bg-surface px-3 text-[15px]">
            <option value="">Tous les dossiers</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>{d.raisonSociale}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-11 rounded-xl border border-line-strong bg-surface px-4 text-[15px] font-medium text-ink hover:bg-survol">
          Filtrer
        </button>
      </form>

      <section aria-label="Actions récentes" className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[15px]">
            <thead>
              <tr className="text-[13px] text-muted">
                <th scope="col" className="px-5 py-3 font-medium">Quand</th>
                <th scope="col" className="px-3 py-3 font-medium">Qui</th>
                <th scope="col" className="px-3 py-3 font-medium">Action</th>
                <th scope="col" className="px-3 py-3 font-medium">Dossier</th>
                <th scope="col" className="px-5 py-3 font-medium">Adresse IP</th>
              </tr>
            </thead>
            <tbody>
              {entrees.length === 0 && (
                <tr className="border-t border-line">
                  <td colSpan={5} className="px-5 py-6 text-muted">Aucune action enregistrée pour l&apos;instant.</td>
                </tr>
              )}
              {entrees.map((e) => (
                <tr key={e.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted">{quand(e.creeLe)}</td>
                  <td className="px-3 py-3">
                    <span className="flex flex-col">
                      <span className="font-medium">{e.nomUtilisateur}</span>
                      <span className="text-[13px] text-muted">{LIBELLES_ROLES[e.role] ?? e.role}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3">{libelleAction(e.action)}</td>
                  <td className="px-3 py-3">
                    {e.dossierId && e.dossier ? (
                      <Link href={`/dossiers/${e.dossierId}`} className="text-link underline">{e.dossier}</Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-[13px] text-muted">{e.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </CadreCabinet>
  );
}

export default function PageJournal({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement du journal…</p>}>
      <ContenuJournal recherche={searchParams} />
    </Suspense>
  );
}