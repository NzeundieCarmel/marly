import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  lireProfil,
  lireProfilEmetteur,
  listerClientsFacture,
  listerFactures,
  listerPaiements,
  type EtatPaiement,
  type FactureResume,
} from "@/lib/api";
import { formatJour } from "@/lib/calcul-facture";
import { CadreTelephone } from "@/components/cadre-telephone";
import { Pastille, type Ton } from "@/components/pastille";
import { EnTeteCompta } from "@/app/envoyer/compta/en-tete";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const NOMBRE = new Intl.NumberFormat("fr-FR");
const CARTE = "flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4";
const BOUTON = "flex h-11 items-center justify-center rounded-xl px-4 text-[15px] font-bold";

function statut(f: FactureResume, paiement?: EtatPaiement | null): { ton: Ton; texte: string } {
  if (f.type === "AVOIR") return { ton: "neutral", texte: "Avoir" };
  if (f.statut === "BROUILLON") return { ton: "neutral", texte: "Brouillon" };
  if (f.statut === "ANNULEE") return { ton: "neutral", texte: "Annulée" };
  if (paiement === "PAYEE") return { ton: "success", texte: "Payée" };
  if (paiement === "EN_RETARD") return { ton: "danger", texte: "En retard" };
  if (paiement === "PARTIELLE") return { ton: "info", texte: "Partielle" };
  return { ton: "warning", texte: "À payer" };
}

function Ligne({ terme, valeur }: { terme: string; valeur: string | null }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted">{terme}</dt>
      <dd className={`text-right ${valeur ? "font-medium" : "text-warning-ink"}`}>{valeur ?? "À compléter"}</dd>
    </div>
  );
}

async function ContenuFactures({ recherche }: { recherche: Recherche }) {
  const [profil, emetteur, clients, factures, paiements, parametres] = await Promise.all([
    lireProfil(),
    lireProfilEmetteur(),
    listerClientsFacture(),
    listerFactures(),
    listerPaiements(),
    recherche,
  ]);
  const etats = new Map(paiements.map((p) => [p.factureId, p.etat]));
  const aEncaisser = paiements.filter((p) => p.etat && p.etat !== "PAYEE").reduce((s, p) => s + p.reste, 0);
  const enRetard = paiements.filter((p) => p.etat === "EN_RETARD").reduce((s, p) => s + p.reste, 0);
  if (!profil.dossier) {
    redirect("/dossiers");
  }

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="factures">
      <EnTeteCompta titre="Factures" retour="/envoyer/accueil" />

      {aEncaisser > 0 && (
        <section aria-label="À encaisser" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
          <span className="text-sm text-muted">À encaisser</span>
          <strong className="text-[26px] leading-8 text-heading tabular-nums">{NOMBRE.format(aEncaisser)} FCFA</strong>
          {enRetard > 0 && (
            <span className="text-sm font-medium text-danger-ink">dont {NOMBRE.format(enRetard)} FCFA en retard</span>
          )}
        </section>
      )}

      {parametres.fiche === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Fiche enregistrée. Elle figurera en tête de chacune de vos factures.
        </p>
      )}
      {parametres.supprimee === "1" && (
        <p role="status" className="rounded-xl bg-neutral-bg p-3 text-sm text-neutral-ink">Brouillon supprimé.</p>
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

      <Link href="/envoyer/factures/nouvelle" className="flex h-[52px] items-center justify-center rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover">
        Nouvelle facture
      </Link>
      <Link href="/envoyer/factures/devis" className="flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-survol">
        Mes devis
      </Link>

      {factures.length > 0 && (
        <ul aria-label="Vos factures" className="overflow-hidden rounded-2xl border border-line bg-surface">
          {factures.map((f, i) => {
            const s = statut(f, etats.get(f.id));
            return (
              <li key={f.id} className={i > 0 ? "border-t border-line" : ""}>
                <Link href={`/envoyer/factures/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-survol">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium">
                      {f.numero ? `${f.numero} · ` : ""}{f.client}
                    </span>
                    <span className="text-[13px] text-muted tabular-nums">
                      {f.dateEmission ? formatJour(f.dateEmission) : `Créé le ${formatJour(f.creeLe)}`} ·{" "}
                      {f.type === "AVOIR" ? "− " : ""}{NOMBRE.format(f.totalTtc)} FCFA
                    </span>
                  </span>
                  <Pastille ton={s.ton}>{s.texte}</Pastille>
                </Link>
              </li>
            );
          })}
        </ul>
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
          <Link href="/envoyer/factures/clients/nouveau" className={`${BOUTON} border border-line-strong bg-surface text-ink hover:bg-survol`}>
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