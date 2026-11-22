import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  lireProfil,
  lireTableauDeBord,
  listerRattachementsRecus,
  type Activite,
  type LigneTableau,
} from "@/lib/api";
import { formatJourMois, joursAvant, prochaineEcheance } from "@/lib/echeances";
import { formatDateHeure, formatDateLongue, formatMontant, ilYa, initiales, prenom } from "@/lib/format";
import { CoquilleCabinet } from "@/components/coquille-cabinet";
import { IconeExport, IconePlus } from "@/components/icones";
import { Pastille, type Ton } from "@/components/pastille";

type Filtre = "relancer" | "valider" | "exporter" | null;

function aRelancer(d: LigneTableau): boolean {
  return d.aCompleter > 0 || d.demandees > 0;
}

function statut(d: LigneTableau): { ton: Ton; texte: string } {
  if (aRelancer(d)) return { ton: "warning", texte: "À relancer" };
  if (d.aValider > 0) return { ton: "info", texte: "En cours" };
  return { ton: "success", texte: "À jour" };
}

const POINT_ACTIVITE: Record<Activite["type"], string> = {
  piece: "bg-info-ink",
  demande: "bg-warning-ink",
  acces: "bg-success-ink",
  export: "bg-neutral-ink",
};

const CARTE = "flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-5";
const BOUTON_PRINCIPAL =
  "inline-flex h-11 items-center gap-2 rounded-xl bg-action px-[18px] text-[15px] font-bold text-white hover:bg-action-hover";

function Chargement() {
  return <p className="text-muted">Chargement du tableau de bord…</p>;
}

function Accueil() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-8">
      <h2 className="text-2xl font-bold text-heading">Bienvenue sur Marly</h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>Crée un dossier pour chaque entreprise que tu suis.</li>
        <li>Invite son gérant : il enverra ses pièces depuis son téléphone.</li>
        <li>Valide les écritures proposées, puis exporte-les vers Sage.</li>
      </ol>
      <Link href="/dossiers/nouveau" className={BOUTON_PRINCIPAL}>
        Créer mon premier dossier
      </Link>
    </section>
  );
}

async function ContenuTableau({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
   const [{ filtre: brut }, profil, tableau, demandesEntreprises] = await Promise.all([
    searchParams,
    lireProfil(),
    lireTableauDeBord(),
    listerRattachementsRecus(),
  ]);
  const nbDemandes = demandesEntreprises.length;
  const filtre: Filtre =
    brut === "relancer" || brut === "valider" || brut === "exporter" ? brut : null;

  await connection();
  const maintenant = new Date();
  const echeance = prochaineEcheance(maintenant);
  const jours = joursAvant(echeance, maintenant);

  const { stats, dossiers } = tableau;
  const aRelancerListe = dossiers.filter(aRelancer);
  const totalRecues = dossiers.reduce((s, d) => s + d.recues, 0);
  const totalAttendues = dossiers.reduce((s, d) => s + d.attendues, 0);
  const avancement = totalAttendues > 0 ? Math.round((totalRecues / totalAttendues) * 100) : 100;
  const urgent = jours <= 3;

  const visibles = dossiers.filter((d) =>
    filtre === "relancer"
      ? aRelancer(d)
      : filtre === "valider"
        ? d.aValider > 0
        : filtre === "exporter"
          ? d.pretesExport > 0
          : true,
  );
  const filtres: { cle: Filtre; libelle: string; nombre: number }[] = [
    { cle: null, libelle: "Tous", nombre: dossiers.length },
    { cle: "relancer", libelle: "À relancer", nombre: aRelancerListe.length },
    { cle: "valider", libelle: "À valider", nombre: dossiers.filter((d) => d.aValider > 0).length },
    { cle: "exporter", libelle: "À exporter", nombre: dossiers.filter((d) => d.pretesExport > 0).length },
  ];
  const lienAValider = tableau.premiereAValiderId
    ? `/pieces/${tableau.premiereAValiderId}`
    : "/dossiers?filtre=valider#dossiers";

  return (
    <CoquilleCabinet
      profil={profil}
      aValider={stats.aValider}
      lienAValider={lienAValider}
      demandes={nbDemandes}
      actif={filtre === "exporter" ? "exports" : "tableau"}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">{formatDateLongue(maintenant)}</span>
          <h1 className="text-[34px] font-bold leading-10 tracking-tight text-heading">
            Bonjour, {prenom(profil.nom)}
          </h1>
        </div>
        <Link href="/dossiers/nouveau" className={BOUTON_PRINCIPAL}>
          <IconePlus width={18} height={18} />
          Nouveau dossier
          </Link>
      </header>

      {nbDemandes > 0 && (
        <Link
          href="/dossiers/demandes"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-info-bg px-6 py-4 text-info-ink hover:opacity-90"
        >
          <span>
            <strong>
              {nbDemandes} entreprise{nbDemandes > 1 ? "s demandent" : " demande"}
            </strong>{" "}
            à rejoindre votre cabinet.
          </span>
          <span className="font-bold underline">Voir les demandes</span>
        </Link>
      )}

      {dossiers.length === 0 ? (
        <Accueil />
      ) : (
        <>
          <section
            aria-label="Échéance"
            className={`flex flex-wrap items-center gap-6 rounded-2xl px-6 py-5 ${
              urgent ? "bg-danger-bg text-danger-ink" : "bg-warning-bg text-warning-ink"
            }`}
          >
            <strong className="text-[44px] font-bold leading-[44px] tracking-tight tabular-nums">
              J-{jours}
            </strong>
            <div className="flex min-w-[260px] flex-[1_1_320px] flex-col gap-2.5">
              <span className="text-base">
                <strong>Échéance des déclarations : {formatJourMois(echeance)}.</strong>{" "}
                {aRelancerListe.length > 0
                  ? `${aRelancerListe.length} dossier${aRelancerListe.length > 1 ? "s attendent" : " attend"} encore ${stats.demandees} pièce${stats.demandees > 1 ? "s" : ""}.`
                  : "Tous les dossiers sont complets."}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex h-2 flex-grow overflow-hidden rounded-full bg-warning-line">
                  <span className="rounded-full bg-current" style={{ width: `${avancement}%` }} />
                </span>
                <span className="whitespace-nowrap text-sm font-medium tabular-nums">
                  {totalRecues} / {totalAttendues} pièces reçues
                </span>
              </div>
            </div>
            {aRelancerListe.length > 0 && (
              <Link
                href="/dossiers?filtre=relancer#dossiers"
                className="inline-flex h-11 items-center rounded-xl border border-current px-[18px] text-[15px] font-bold"
              >
                Voir les {aRelancerListe.length} dossier{aRelancerListe.length > 1 ? "s" : ""} à relancer
              </Link>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className={CARTE}>
              <span className="text-sm text-muted">Pièces reçues</span>
              <strong className="text-[32px] leading-9 text-heading tabular-nums">{stats.recues}</strong>
              <span className="text-[13px] text-success-ink">+{stats.recuesSemaine} cette semaine</span>
            </div>
            <div className={CARTE}>
              <span className="text-sm text-muted">À valider</span>
              <strong className="text-[32px] leading-9 text-heading tabular-nums">{stats.aValider}</strong>
              <span className="text-[13px] text-muted">
                dans {stats.dossiersAValider} dossier{stats.dossiersAValider > 1 ? "s" : ""}
              </span>
            </div>
            <div className={CARTE}>
              <span className="text-sm text-muted">Pièces demandées</span>
              <strong className="text-[32px] leading-9 text-warning-ink tabular-nums">{stats.demandees}</strong>
              <span className="text-[13px] text-muted">
                dont {stats.aReprendre} à reprendre
              </span>
            </div>
            <div className={CARTE}>
              <span className="text-sm text-muted">Exportées vers Sage</span>
              <strong className="text-[32px] leading-9 text-heading tabular-nums">{stats.exportees}</strong>
              <span className="text-[13px] text-muted">
                {stats.dernierExport ? `dernier export ${formatDateHeure(stats.dernierExport)}` : "aucun export pour l'instant"}
              </span>
            </div>
          </div>

          <section
            id="dossiers"
            aria-labelledby="titre-dossiers"
            className="flex scroll-mt-6 flex-col overflow-hidden rounded-2xl border border-line bg-surface"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
              <h2 id="titre-dossiers" className="text-lg font-bold">
                Dossiers clients
              </h2>
              <nav aria-label="Filtrer les dossiers" className="flex flex-wrap gap-2">
                {filtres.map((f) => (
                  <Link
                    key={f.libelle}
                    href={f.cle ? `/dossiers?filtre=${f.cle}#dossiers` : "/dossiers#dossiers"}
                    aria-current={filtre === f.cle ? "page" : undefined}
                    className={
                      filtre === f.cle
                        ? "inline-flex h-9 items-center rounded-full border border-action bg-action px-3.5 text-sm font-medium text-white"
                        : "inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-3.5 text-sm text-ink hover:bg-survol"
                    }
                  >
                    {f.libelle} · {f.nombre}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="text-[13px] text-muted">
                    <th scope="col" className="px-6 py-3 font-medium">Dossier</th>
                    <th scope="col" className="w-[200px] px-3 py-3 font-medium">Pièces du mois</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">À valider</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Demandées</th>
                    <th scope="col" className="px-3 py-3 font-medium">Dernier envoi</th>
                    <th scope="col" className="px-6 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((d) => {
                    const s = statut(d);
                    const pct = d.attendues > 0 ? Math.round((d.recues / d.attendues) * 100) : 100;
                    return (
                      <tr key={d.id} className="border-t border-line hover:bg-survol">
                        <td className="px-6 py-3.5">
                          <Link href={`/dossiers/${d.id}`} className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold ${
                                d.regime === "REEL" ? "bg-info-bg text-info-ink" : "bg-neutral-bg text-neutral-ink"
                              }`}
                            >
                              {initiales(d.raisonSociale)}
                            </span>
                            <span className="flex flex-col">
                              <strong className="text-link underline underline-offset-[3px]">{d.raisonSociale}</strong>
                              <span className="text-[13px] text-muted">
                                {d.regime === "REEL" ? "Régime réel" : "IGS"}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col gap-1.5">
                            <span className="flex h-1.5 overflow-hidden rounded-full bg-sunken">
                              <span
                                className={`rounded-full ${pct === 100 ? "bg-success-ink" : "bg-warning-ink"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="text-[13px] text-muted tabular-nums">
                              {d.recues} reçue{d.recues > 1 ? "s" : ""} sur {d.attendues}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums">
                          {d.premiereAValiderId ? (
                            <Link href={`/pieces/${d.premiereAValiderId}`} className="font-bold text-link underline">
                              {d.aValider}
                            </Link>
                          ) : (
                            d.aValider
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums">{d.demandees}</td>
                        <td className="px-3 py-3.5 text-muted">{ilYa(d.derniereLe, maintenant)}</td>
                        <td className="px-6 py-3.5">
                          <Pastille ton={s.ton}>{s.texte}</Pastille>
                        </td>
                      </tr>
                    );
                  })}
                  {visibles.length === 0 && (
                    <tr className="border-t border-line">
                      <td colSpan={6} className="px-6 py-6 text-muted">
                        Aucun dossier dans cette catégorie.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section aria-labelledby="titre-activite" className="flex flex-col rounded-2xl border border-line bg-surface px-6 py-5">
              <h2 id="titre-activite" className="mb-2 text-lg font-bold">
                Activité récente
              </h2>
              {tableau.activite.length === 0 && (
                <p className="py-2 text-muted">Rien de nouveau pour l&apos;instant.</p>
              )}
              {tableau.activite.map((a, i) => (
                <div
                  key={`${a.type}-${a.le}-${i}`}
                  className={`flex gap-3 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${POINT_ACTIVITE[a.type]}`} />
                  <span className="flex flex-col gap-0.5">
                    <span>{a.titre}</span>
                    <span className="text-[13px] text-muted">
                      {a.dossier ? `${a.dossier} · ` : ""}
                      {ilYa(a.le, maintenant)}
                    </span>
                  </span>
                </div>
              ))}
            </section>

            <section aria-labelledby="titre-export" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface px-6 py-5">
              <div className="flex items-center justify-between gap-2">
                <h2 id="titre-export" className="text-lg font-bold">
                  Export vers Sage
                </h2>
                <span className="text-[13px] text-muted">CSV · séparateur « ; »</span>
              </div>
              {tableau.export.pieces === 0 ? (
                <p className="rounded-xl bg-sunken p-4 text-muted">Aucune nouvelle pièce validée à exporter.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5 rounded-xl bg-sunken p-4">
                    <strong className="text-base">
                      {tableau.export.pieces} pièce{tableau.export.pieces > 1 ? "s" : ""} validée
                      {tableau.export.pieces > 1 ? "s" : ""} prête{tableau.export.pieces > 1 ? "s" : ""} à exporter
                    </strong>
                    <span
                      className={`text-sm tabular-nums ${
                        tableau.export.debit === tableau.export.credit ? "text-success-ink" : "text-danger-ink"
                      }`}
                    >
                      Débit {formatMontant(tableau.export.debit)}{" "}
                      {tableau.export.debit === tableau.export.credit ? "=" : "≠"} Crédit{" "}
                      {formatMontant(tableau.export.credit)} FCFA
                    </span>
                  </div>
                  <ul className="flex flex-col">
                    {dossiers
                      .filter((d) => d.pretesExport > 0)
                      .map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0">
                          <span>
                            {d.raisonSociale}{" "}
                            <span className="text-muted">
                              · {d.pretesExport} pièce{d.pretesExport > 1 ? "s" : ""}
                            </span>
                          </span>
                          <Link
                            href={`/dossiers/${d.id}#titre-export`}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-action px-3.5 text-sm font-bold text-white hover:bg-action-hover"
                          >
                            <IconeExport width={16} height={16} />
                            Exporter
                          </Link>
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </CoquilleCabinet>
  );
}

export default function PageDossiers({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  return (
    <Suspense fallback={<Chargement />}>
      <ContenuTableau searchParams={searchParams} />
    </Suspense>
  );
}