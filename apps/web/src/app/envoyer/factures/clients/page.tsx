import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, listerClientsFacture } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeRetour } from "@/components/icones";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

function lire(valeur: string | string[] | undefined): string {
  return (Array.isArray(valeur) ? valeur[0] : (valeur ?? "")).trim().slice(0, 60);
}

async function ContenuClients({ recherche }: { recherche: Recherche }) {
  const parametres = await recherche;
  const q = lire(parametres.q);
  const [profil, clients] = await Promise.all([lireProfil(), listerClientsFacture(q)]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <div className="-ml-2 flex items-center gap-1">
        <Link href="/envoyer/factures" aria-label="Retour aux factures" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol">
          <IconeRetour width={22} height={22} />
        </Link>
        <h1 className="text-xl font-bold text-heading">Mes clients</h1>
      </div>

      {parametres.enregistre === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">Client enregistré.</p>
      )}
      {parametres.retire === "1" && (
        <p role="status" className="rounded-xl bg-neutral-bg p-3 text-sm text-neutral-ink">Client retiré de votre carnet.</p>
      )}

      <form method="get" role="search" aria-label="Rechercher un client" className="flex gap-2">
        <label htmlFor="q" className="sr-only">Nom, NIU ou téléphone</label>
        <input id="q" name="q" type="search" defaultValue={q} maxLength={60} placeholder="Nom, NIU ou téléphone" className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-base" />
        <button type="submit" className="h-11 shrink-0 rounded-xl border border-line-strong bg-surface px-4 text-sm font-bold text-ink hover:bg-survol">
          Chercher
        </button>
      </form>

      <Link href="/envoyer/factures/clients/nouveau" className="flex h-12 items-center justify-center rounded-xl bg-action text-[15px] font-bold text-white hover:bg-action-hover">
        Ajouter un client
      </Link>

      {clients.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-5 text-muted">
          {q ? "Aucun client ne correspond à votre recherche." : "Aucun client pour l'instant. Ajoutez ceux à qui vous facturez le plus souvent."}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {clients.map((c, i) => (
            <li key={c.id} className={i > 0 ? "border-t border-line" : ""}>
              <Link href={`/envoyer/factures/clients/${encodeURIComponent(c.id)}`} className="flex flex-col gap-0.5 px-4 py-3 hover:bg-survol">
                <span className="text-[15px] font-medium">{c.nom}</span>
                <span className="text-[13px] text-muted tabular-nums">
                  {c.niu ? `NIU ${c.niu}` : "Particulier"}
                  {c.telephone ? ` · ${c.telephone}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CadreTelephone>
  );
}

export default function PageClients({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuClients recherche={searchParams} />
    </Suspense>
  );
}