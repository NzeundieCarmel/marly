import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireBalance, lireProfil, listerPieces, type LigneBalance } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { BoutonToutComptabiliser } from "./boutons-compta";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const TRESORERIE = [
  { prefixe: "571", nom: "Caisse" },
  { prefixe: "521", nom: "Banque" },
  { prefixe: "552", nom: "Mobile Money" },
];
const BOUTON_SECONDAIRE =
  "flex h-11 items-center justify-center rounded-xl border border-line-strong bg-surface px-4 text-[15px] font-bold text-ink hover:bg-survol";

function solde(lignes: LigneBalance[], prefixe: string): number {
  return lignes.filter((l) => l.compte.startsWith(prefixe)).reduce((s, l) => s + l.debit - l.credit, 0);
}

function Montant({ valeur }: { valeur: number }) {
  return (
    <span className={`tabular-nums ${valeur < 0 ? "text-danger-ink" : ""}`}>
      {valeur < 0 ? "− " : ""}
      {formatMontant(Math.abs(valeur))} FCFA
    </span>
  );
}

async function ContenuCompta({ recherche }: { recherche: Recherche }) {
  const [profil, parametres] = await Promise.all([lireProfil(), recherche]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const dossier = profil.dossier;
  await connection();
  const annee = new Date().getFullYear();
  const [balance, exercice, pieces] = await Promise.all([
    lireBalance(dossier.id),
    lireBalance(dossier.id, `${annee}-01-01`, `${annee}-12-31`),
    listerPieces(dossier.id),
  ]);

  const aComptabiliser = pieces.filter((p) => p.statut === "RECUE").length;
  const produits = exercice.lignes.filter((l) => l.compte.startsWith("7")).reduce((s, l) => s + l.credit - l.debit, 0);
  const charges = exercice.lignes.filter((l) => l.compte.startsWith("6")).reduce((s, l) => s + l.debit - l.credit, 0);
  const comptabilisees = typeof parametres.comptabilisees === "string" ? Number(parametres.comptabilisees) : null;
  const ignorees = typeof parametres.ignorees === "string" ? Number(parametres.ignorees) : 0;

  return (
    <CadreTelephone nomDossier={dossier.raisonSociale} actif="compta">
      <h1 className="text-[26px] font-bold leading-8 text-heading">Comptabilité</h1>

      {comptabilisees !== null && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          {comptabilisees} pièce{comptabilisees > 1 ? "s" : ""} comptabilisée{comptabilisees > 1 ? "s" : ""}.
          {ignorees > 0 && ` ${ignorees} pièce${ignorees > 1 ? "s" : ""} à vérifier une par une dans Mes pièces.`}
        </p>
      )}
      {parametres.saisie === "1" && (
        <p role="status" className="rounded-xl bg-success-bg p-3 text-sm text-success-ink">
          Opération enregistrée.
        </p>
      )}

      {!profil.autonome && (
        <p className="rounded-xl bg-info-bg p-3 text-sm leading-5 text-info-ink">
          Votre comptabilité est tenue par votre cabinet. Vous pouvez la consulter ici.
        </p>
      )}

      {profil.autonome && aComptabiliser > 0 && (
        <section aria-labelledby="titre-attente" className="flex flex-col gap-3 rounded-2xl border border-warning-line bg-warning-bg p-4 text-warning-ink">
          <h2 id="titre-attente" className="text-base font-bold">
            {aComptabiliser} pièce{aComptabiliser > 1 ? "s" : ""} à comptabiliser
          </h2>
          <p className="text-sm leading-5">
            Marly passe chaque pièce avec l&apos;écriture qu&apos;elle propose. Vous pouvez aussi les vérifier une par une dans Mes pièces.
          </p>
          <BoutonToutComptabiliser dossierId={dossier.id} nombre={aComptabiliser} />
        </section>
      )}

      <section aria-labelledby="titre-tresorerie" className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <h2 id="titre-tresorerie" className="px-4 pt-4 text-base font-bold text-heading">Trésorerie</h2>
        <ul className="pb-1">
          {TRESORERIE.map((t, i) => (
            <li key={t.prefixe} className={i > 0 ? "border-t border-line" : ""}>
              <Link href={`/envoyer/compta/compte/${t.prefixe}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-survol">
                <span className="text-[15px]">{t.nom}</span>
                <strong className="text-[15px]">
                  <Montant valeur={solde(balance.lignes, t.prefixe)} />
                </strong>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titre-resultat" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
        <h2 id="titre-resultat" className="text-base font-bold text-heading">Résultat {annee}</h2>
        <dl className="flex flex-col gap-1.5 text-[15px]">
          <div className="flex justify-between gap-3"><dt className="text-muted">Produits</dt><dd><Montant valeur={produits} /></dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Charges</dt><dd><Montant valeur={charges} /></dd></div>
          <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-bold">
            <dt>{produits - charges >= 0 ? "Bénéfice" : "Perte"}</dt>
            <dd><Montant valeur={produits - charges} /></dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-2">
        {profil.autonome && (
          <Link href="/envoyer/compta/saisie" className="col-span-2 flex h-[52px] items-center justify-center rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover">
            Saisir une opération
          </Link>
        )}
        <Link href="/envoyer/compta/journal" className={`${BOUTON_SECONDAIRE} col-span-2`}>Voir les journaux</Link>
      </div>

      <section aria-labelledby="titre-balance" className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
          <h2 id="titre-balance" className="text-base font-bold text-heading">Balance des comptes</h2>
          {balance.lignes.length > 0 && (
            <span className={`text-[13px] ${balance.equilibree ? "text-success-ink" : "text-danger-ink"}`}>
              {balance.equilibree ? "Équilibrée" : "Déséquilibrée"}
            </span>
          )}
        </div>
        {balance.lignes.length === 0 ? (
          <p className="px-4 pb-4 pt-2 text-sm text-muted">
            Aucune écriture pour l&apos;instant. Comptabilisez vos pièces ou saisissez une opération.
          </p>
        ) : (
          <ul className="pb-1 pt-2">
            {balance.lignes.map((l) => (
              <li key={l.compte} className="border-t border-line">
                <Link href={`/envoyer/compta/compte/${l.compte}`} className="flex items-center gap-3 px-4 py-3 hover:bg-survol">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px]">{l.intitule}</span>
                    <span className="text-[13px] text-muted tabular-nums">{l.compte}</span>
                  </span>
                  <span className="text-right text-[15px] font-medium tabular-nums">
                    {formatMontant(l.soldeDebiteur || l.soldeCrediteur)}
                    <span className="block text-[12px] font-normal text-muted">
                      {l.soldeDebiteur > 0 ? "débiteur" : l.soldeCrediteur > 0 ? "créditeur" : "soldé"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </CadreTelephone>
  );
}

export default function PageCompta({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuCompta recherche={searchParams} />
    </Suspense>
  );
}