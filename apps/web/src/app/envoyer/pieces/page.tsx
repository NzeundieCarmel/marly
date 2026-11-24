import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireProfil, listerPieces, type Piece } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { cleMois, resumerMois } from "@/lib/resume-mois";
import { statutsPiece } from "@/lib/statuts-piece";
import { CadreTelephone } from "@/components/cadre-telephone";
import { Pastille } from "@/components/pastille";
import { PiecesEnAttente } from "./en-attente";
import { FiltresPieces } from "./filtres-pieces";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

function lireTexte(valeur: string | string[] | undefined): string {
  return (Array.isArray(valeur) ? valeur[0] : (valeur ?? "")).trim().slice(0, 60);
}

// Recherche sans accents ni majuscules : « electricite » trouve « Électricité, eau »
function simplifier(texte: string): string {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function libelleMois(cle: string): string {
  const [annee, mois] = cle.split("-").map(Number);
  const texte = new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// Total des dépenses : les ventes émises avec Marly n'y entrent pas
function totalDe(pieces: Piece[]): number {
  return pieces
    .filter((p) => p.statut !== "REMPLACEE" && !p.factureId)
    .reduce((somme, p) => somme + p.montantTtc, 0);
}

function Chiffre({ valeur, libelle, ton }: { valeur: number; libelle: string; ton: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-3">
      <strong className={`text-[22px] tabular-nums ${ton}`}>{valeur}</strong>
      <span className="text-xs text-muted">{libelle}</span>
    </div>
  );
}

async function ContenuPieces({ recherche }: { recherche: Recherche }) {
  // Page calculée à chaque visite : à placer avant toute lecture de la date
  await connection();

  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const autonome = profil.autonome;
  const statuts = statutsPiece(autonome);
  const pieces = (await listerPieces(profil.dossier.id)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const ceMois = resumerMois(pieces, new Date());

  // Critères de recherche lus dans l'adresse
  const parametres = await recherche;
  const moisChoisi = lireTexte(parametres.mois);
  const choix = {
    mois: /^\d{4}-\d{2}$/.test(moisChoisi) ? moisChoisi : "",
    categorie: lireTexte(parametres.categorie),
    q: lireTexte(parametres.q),
  };
  const filtreActif = Boolean(choix.mois || choix.categorie || choix.q);
  const motCle = simplifier(choix.q);

  const optionsMois = [...new Set(pieces.map((p) => cleMois(new Date(p.date), "UTC")))]
    .sort()
    .reverse()
    .map((cle) => ({ valeur: cle, libelle: libelleMois(cle) }));
  const categories = [...new Set(pieces.map((p) => p.categorie))].sort((a, b) => a.localeCompare(b, "fr"));

  const trouvees = pieces.filter(
    (p) =>
      (!choix.mois || cleMois(new Date(p.date), "UTC") === choix.mois) &&
      (!choix.categorie || p.categorie === choix.categorie) &&
      (!motCle || simplifier(`${p.fournisseur ?? ""} ${p.categorie}`).includes(motCle)),
  );

  const envoyees = pieces.filter((p) => p.statut !== "REMPLACEE").length;
  const traitees = pieces.filter((p) => p.statut === "TRAITEE").length;
  const aReprendre = pieces.filter((p) => p.statut === "A_COMPLETER").length;

  // Regroupement par mois, du plus récent au plus ancien
  const groupes: { cle: string; pieces: Piece[] }[] = [];
  for (const p of trouvees) {
    const cle = cleMois(new Date(p.date), "UTC");
    const groupe = groupes.find((g) => g.cle === cle);
    if (groupe) groupe.pieces.push(p);
    else groupes.push({ cle, pieces: [p] });
  }

  const nbTrouvees = trouvees.filter((p) => p.statut !== "REMPLACEE").length;

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="pieces">
      <h1 className="text-[26px] font-bold leading-8 text-heading">Mes pièces</h1>

      {autonome ? (
        <div className="grid grid-cols-2 gap-2">
          <Chiffre valeur={envoyees} libelle="pièces rangées" ton="text-heading" />
          <Chiffre valeur={ceMois.nombre} libelle={`dépenses en ${ceMois.libelle}`} ton="text-heading" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Chiffre valeur={envoyees} libelle="envoyées" ton="text-heading" />
          <Chiffre valeur={traitees} libelle="traitées" ton="text-success-ink" />
          <Chiffre valeur={aReprendre} libelle="à reprendre" ton="text-warning-ink" />
        </div>
      )}

      <PiecesEnAttente />

      {pieces.length > 0 && <FiltresPieces mois={optionsMois} categories={categories} choix={choix} />}

      {filtreActif && trouvees.length > 0 && (
        <p role="status" className="text-sm text-muted">
          <strong className="text-ink">
            {nbTrouvees} pièce{nbTrouvees > 1 ? "s" : ""}
          </strong>{" "}
          · <span className="tabular-nums">{formatMontant(totalDe(trouvees))} FCFA de dépenses</span>
        </p>
      )}

      {pieces.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-5 text-muted">
          Aucune pièce pour l&apos;instant. Touchez « Envoyer » en bas de l&apos;écran pour commencer.
        </p>
      ) : trouvees.length === 0 ? (
        <p role="status" className="rounded-2xl border border-line bg-surface p-5 text-muted">
          Aucune pièce ne correspond à votre recherche.
        </p>
      ) : (
        groupes.map((g) => (
          <section key={g.cle} aria-label={libelleMois(g.cle)} className="overflow-hidden rounded-2xl border border-line bg-surface">
                        <div className="flex items-center justify-between gap-2 bg-sunken px-3.5 py-2.5 text-[13px] font-medium text-muted">
              <span>{libelleMois(g.cle)}</span>
              <span className="tabular-nums">{formatMontant(totalDe(g.pieces))} FCFA</span>
            </div>
            {g.pieces.map((p) => {
              const statut = statuts[p.statut];
              return (
                <Link
                  key={p.id}
                  href={
                    p.factureId
                      ? `/envoyer/factures/${encodeURIComponent(p.factureId)}`
                      : `/envoyer/pieces/${encodeURIComponent(p.id)}`
                  }
                  className="flex items-center gap-3 border-t border-line px-3.5 py-3 hover:bg-survol"
                >
                  <span className="flex min-w-0 flex-grow flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium">{p.fournisseur ?? p.categorie}</span>
                    <span className={`text-[13px] tabular-nums ${p.statut === "A_COMPLETER" ? "text-warning-ink" : "text-muted"}`}>
                      {p.statut === "A_COMPLETER"
                        ? "À reprendre : voir l'accueil"
                        : `${new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })} · ${p.factureId ? `${p.categorie} · ` : ""}${formatMontant(p.montantTtc)} FCFA`}
                    </span>
                  </span>
                  <Pastille ton={statut.ton}>{statut.texte}</Pastille>
                </Link>
              );
            })}
          </section>
        ))
      )}
    </CadreTelephone>
  );
}

export default function PageMesPieces({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuPieces recherche={searchParams} />
    </Suspense>
  );
}