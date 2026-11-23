import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireProfil, lireProfilEmetteur, listerClientsFacture } from "@/lib/api";
import { CadreTelephone } from "@/components/cadre-telephone";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const CARTE = "flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4";
const BOUTON = "flex h-11 items-center justify-center rounded-xl px-4 text-[15px] font-bold";

function Ligne({ terme, valeur }: { terme: string; valeur: string | null }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted">{terme}</dt>
      <dd className={`text-right ${valeur ? "font-medium" : "text-warning-ink"}`}>{valeur ?? "À compléter"}</dd>
    </div>
  );
}

async function ContenuFactures({ recherche }: { recherche: Recherche }) {
  const [profil, emetteur, clients, parametres] = await Promise.all([
    lireProfil(),
    lireProfilEmetteur(),
    listerClientsFacture(),
    recherche,
  ]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <h1 className="text-[26px] font-bold leading-8 text-heading">Factures</h1>

      {parametres.fiche === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Fiche enregistrée. Elle figurera en tête de chacune de vos factures.
        </p>
      )}

      {emetteur.manquants.length > 0 && (
        <section aria-labelledby="titre-incomplet" className="flex flex-col gap-3 rounded-2xl border border-warning-line bg-warning-bg p-4 text-warning-ink">
          <h2 id="titre-incomplet" className="text-base font-bold">Complétez votre fiche</h2>
          <p className="text-sm leading-5">
            Il manque : {emetteur.manquants.join(", ")}. Ces mentions sont obligatoires sur une facture.
          </p>
          <Link href="/envoyer/factures/fiche" className={`${BOUTON} bg-action text-white hover:bg-action-hover`}>
            Compléter ma fiche
          </Link>
        </section>
      )}

      <section aria-labelledby="titre-fiche" className={CARTE}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="titre-fiche" className="text-base font-bold text-heading">Votre fiche</h2>
          <Link href="/envoyer/factures/fiche" className="py-2 text-sm font-bold text-link underline">Modifier</Link>
        </div>
        <dl className="flex flex-col gap-2">
          <Ligne terme="Entreprise" valeur={[emetteur.raisonSociale, emetteur.fiche.formeJuridique].filter(Boolean).join(" · ")} />
          <Ligne terme="NIU" valeur={emetteur.niu} />
          <Ligne terme="Régime" valeur={emetteur.regime === "REEL" ? "Régime du réel" : "IGS"} />
          <Ligne terme="Adresse" valeur={emetteur.fiche.adresse} />
          <Ligne terme="Téléphone" valeur={emetteur.fiche.telephone} />
        </dl>
      </section>

      <section aria-labelledby="titre-clients" className={CARTE}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titre-clients" className="text-base font-bold text-heading">Vos clients</h2>
          <span className="text-sm text-muted tabular-nums">
            {clients.length} client{clients.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/envoyer/factures/clients" className={`${BOUTON} border border-line-strong bg-surface text-ink hover:bg-survol`}>
            Voir mes clients
          </Link>
          <Link href="/envoyer/factures/clients/nouveau" className={`${BOUTON} bg-action text-white hover:bg-action-hover`}>
            Ajouter un client
          </Link>
        </div>
      </section>
    </CadreTelephone>
  );
}

export default function PageFactures({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuFactures recherche={searchParams} />
    </Suspense>
  );
}