import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireProfil, listerDossiers, type ResumeDossier } from "@/lib/api";
import { formatJourMois, joursAvant, prochaineEcheance } from "@/lib/echeances";
import { seDeconnecter } from "../connexion/actions";

function Carte({ titre, valeur }: { titre: string; valeur: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-5">
      <span className="text-sm text-muted">{titre}</span>
      <strong className="text-3xl text-heading">{valeur}</strong>
    </div>
  );
}

function aRelancer(dossier: ResumeDossier): boolean {
  return dossier.aCompleter > 0 || dossier.demandesOuvertes > 0;
}

function Statut({ dossier }: { dossier: ResumeDossier }) {
  if (aRelancer(dossier)) {
    return (
      <span className="rounded-full bg-warning-bg px-3 py-1 text-sm font-medium text-warning-ink">
        À relancer
      </span>
    );
  }
  if (dossier.aValider > 0) {
    return (
      <span className="rounded-full bg-info-bg px-3 py-1 text-sm font-medium text-info-ink">
        En cours
      </span>
    );
  }
  return (
    <span className="rounded-full bg-success-bg px-3 py-1 text-sm font-medium text-success-ink">
      À jour
    </span>
  );
}

function Chargement() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 text-muted">
      Chargement des dossiers…
    </div>
  );
}

const CLASSES_BOUTON =
  "flex h-11 items-center rounded-xl bg-action px-5 font-bold text-white";

function Accueil() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-8">
      <h2 className="text-2xl font-bold text-heading">Bienvenue sur Marly</h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-ink">
        <li>Crée un dossier pour chaque entreprise que tu suis.</li>
        <li>Invite son gérant : il enverra ses pièces depuis son téléphone.</li>
        <li>Valide les écritures proposées, puis exporte-les vers Sage.</li>
      </ol>
      <Link href="/dossiers/nouveau" className={CLASSES_BOUTON}>
        Créer mon premier dossier
      </Link>
    </section>
  );
}

// Tout ce qui dépend de l'utilisateur connecté est isolé dans <Suspense>
async function ContenuDossiers() {
  const [profil, dossiers] = await Promise.all([lireProfil(), listerDossiers()]);
  const totalAValider = dossiers.reduce((somme, d) => somme + d.aValider, 0);
  const totalDemandes = dossiers.reduce((somme, d) => somme + d.demandesOuvertes, 0);
  const dossiersARelancer = dossiers.filter(aRelancer).length;

  await connection();
  const maintenant = new Date();
  const echeance = prochaineEcheance(maintenant);
  const jours = joursAvant(echeance, maintenant);
  const urgent = jours <= 3;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">{profil.cabinet}</span>
          <h1 className="text-3xl font-bold text-heading">Bonjour, {profil.nom}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {profil.role === "RESPONSABLE" && (
            <Link
              href="/equipe"
              className="flex h-11 items-center rounded-xl border border-line-strong bg-surface px-4 font-medium"
            >
              Équipe
            </Link>
          )}
          {dossiers.length > 0 && (
            <Link href="/dossiers/nouveau" className={CLASSES_BOUTON}>
              Nouveau dossier
            </Link>
          )}
          <form action={seDeconnecter}>
            <button
              type="submit"
              className="h-11 rounded-xl border border-line-strong bg-surface px-4 font-medium text-ink"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </header>

      {dossiers.length === 0 ? (
        <Accueil />
      ) : (
        <>
          <div
            role="status"
            className={`mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl p-4 ${
              urgent ? "bg-danger-bg text-danger-ink" : "bg-warning-bg text-warning-ink"
            }`}
          >
            <strong className="text-2xl">J-{jours}</strong>
            <span>
              avant l&apos;échéance du <strong>{formatJourMois(echeance)}</strong>.{" "}
              {dossiersARelancer > 0
                ? `${dossiersARelancer} dossier${dossiersARelancer > 1 ? "s" : ""} attend${dossiersARelancer > 1 ? "ent" : ""} encore des pièces.`
                : "Tous les dossiers sont complets."}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Carte titre="Dossiers" valeur={dossiers.length} />
            <Carte titre="Pièces à valider" valeur={totalAValider} />
            <Carte titre="Pièces demandées" valeur={totalDemandes} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="text-sm text-muted">
                  <th className="px-5 py-3 font-medium">Dossier</th>
                  <th className="px-3 py-3 font-medium">Régime</th>
                  <th className="px-3 py-3 text-right font-medium">Reçues</th>
                  <th className="px-3 py-3 text-right font-medium">À valider</th>
                  <th className="px-3 py-3 text-right font-medium">Demandées</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d) => (
                  <tr key={d.id} className="border-t border-line">
                    <td className="px-5 py-4 font-bold">
                      <Link href={`/dossiers/${d.id}`} className="text-heading underline">
                        {d.raisonSociale}
                      </Link>
                    </td>
                    <td className="px-3 py-4">{d.regime === "REEL" ? "Réel" : "IGS"}</td>
                    <td className="px-3 py-4 text-right">{d.piecesRecues}</td>
                    <td className="px-3 py-4 text-right">{d.aValider}</td>
                    <td className="px-3 py-4 text-right">{d.demandesOuvertes}</td>
                    <td className="px-5 py-4">
                      <Statut dossier={d} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export default function PageDossiers() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<Chargement />}>
        <ContenuDossiers />
      </Suspense>
      <p className="mt-6 text-sm">
        <Link href="/" className="text-muted underline">
          Accueil
        </Link>
      </p>
    </main>
  );
}