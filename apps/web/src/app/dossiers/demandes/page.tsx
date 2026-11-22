import Link from "next/link";
import { Suspense } from "react";
import { lireProfil, listerRattachementsRecus } from "@/lib/api";
import { initiales } from "@/lib/format";
import { CadreCabinet } from "@/components/cadre-cabinet";
import { accepterDemande, refuserDemande } from "./actions";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const ERREURS: Record<string, string> = {
  "403": "Seul le responsable du cabinet peut accepter ou refuser une demande.",
  "404": "Cette demande n'existe plus.",
  "409": "Cette demande a déjà été traitée, ou l'entreprise a rejoint un autre cabinet.",
  "503": "Le serveur Marly est injoignable. Réessayez dans un instant.",
};

function dateDe(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Africa/Douala" });
}

function lire(parametres: Awaited<Recherche>, cle: string): string | null {
  const valeur = parametres[cle];
  return (Array.isArray(valeur) ? valeur[0] : valeur) ?? null;
}

async function ContenuDemandes({ recherche }: { recherche: Recherche }) {
  const [profil, demandes, parametres] = await Promise.all([lireProfil(), listerRattachementsRecus(), recherche]);
  const responsable = profil.role === "RESPONSABLE";

  // L'identifiant vient de l'adresse : il ne sert qu'à un lien, après contrôle de sa forme
  const acceptee = lire(parametres, "acceptee");
  const dossierAccepte = acceptee && /^[a-z0-9]{10,40}$/.test(acceptee) ? acceptee : null;
  const refusee = lire(parametres, "refusee") === "1";
  const erreur = lire(parametres, "erreur");
  const messageErreur = erreur ? (ERREURS[erreur] ?? "L'opération a échoué. Réessayez.") : null;

  return (
    <CadreCabinet actif="demandes">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted">{profil.cabinet}</span>
        <h1 className="text-[28px] font-bold leading-[34px] text-heading">Demandes d&apos;entreprises</h1>
        <p className="max-w-2xl text-[15px] text-muted">
          Ces entreprises utilisent Marly seules et vous demandent de devenir leur cabinet. Si vous
          acceptez, leur dossier rejoint votre cabinet avec toutes les pièces déjà rangées.
        </p>
      </div>

      {dossierAccepte && (
        <p role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-success-bg px-5 py-4 text-success-ink">
          <span>
            <strong>Le dossier a rejoint votre cabinet.</strong> Ses pièces arrivent dans « Pièces à valider ».
          </span>
          <Link href={`/dossiers/${dossierAccepte}`} className="font-bold underline">
            Ouvrir le dossier
          </Link>
        </p>
      )}
      {refusee && (
        <p role="status" className="rounded-2xl bg-neutral-bg px-5 py-4 text-neutral-ink">
          Demande refusée. L&apos;entreprise peut choisir un autre cabinet.
        </p>
      )}
      {messageErreur && (
        <p role="alert" className="rounded-2xl bg-danger-bg px-5 py-4 text-danger-ink">
          {messageErreur}
        </p>
      )}

      {demandes.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-muted">
          Aucune demande en attente pour l&apos;instant.
        </p>
      ) : (
        <div className="flex max-w-3xl flex-col gap-4">
          {demandes.map((d) => (
            <article
              key={d.id}
              aria-labelledby={`titre-${d.id}`}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info-bg text-[15px] font-bold text-info-ink">
                    {initiales(d.dossier.raisonSociale)}
                  </span>
                  <div className="flex flex-col">
                    <h2 id={`titre-${d.id}`} className="text-lg font-bold text-heading">
                      {d.dossier.raisonSociale}
                    </h2>
                    <span className="text-[13px] text-muted">
                      {d.dossier.regime === "REEL" ? "Régime réel" : "IGS"} · {d.dossier.nbPieces} pièce
                      {d.dossier.nbPieces > 1 ? "s" : ""} déjà rangée{d.dossier.nbPieces > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <span className="text-[13px] text-muted">Reçue le {dateDe(d.creeLe)}</span>
              </div>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] text-muted">Gérant</dt>
                  <dd className="text-[15px] font-medium">{d.gerant.nom}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] text-muted">E-mail</dt>
                  <dd className="text-[15px]">
                    {d.gerant.email ? (
                      <a href={`mailto:${d.gerant.email}`} className="text-link underline">
                        {d.gerant.email}
                      </a>
                    ) : (
                      "Non renseigné"
                    )}
                  </dd>
                </div>
              </dl>

              {d.message && (
                <blockquote className="rounded-xl bg-sunken p-3 text-[15px] leading-[22px]">« {d.message} »</blockquote>
              )}

              {responsable ? (
                <div className="flex flex-wrap gap-3">
                  <form action={accepterDemande}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="dossierId" value={d.dossier.id} />
                    <button
                      type="submit"
                      className="h-11 rounded-xl bg-action px-[18px] text-[15px] font-bold text-white hover:bg-action-hover"
                    >
                      Accepter et reprendre le dossier
                    </button>
                  </form>
                  <form action={refuserDemande}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="h-11 rounded-xl border border-line-strong bg-surface px-[18px] text-[15px] font-medium text-ink hover:bg-survol"
                    >
                      Refuser
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-sm text-muted">Seul le responsable du cabinet peut accepter ou refuser cette demande.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </CadreCabinet>
  );
}

export default function PageDemandesEntreprises({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement des demandes…</p>}>
      <ContenuDemandes recherche={searchParams} />
    </Suspense>
  );
}