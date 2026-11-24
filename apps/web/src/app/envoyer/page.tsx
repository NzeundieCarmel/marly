import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lireProfil, listerDemandes, listerPieces, type StatutPiece } from "@/lib/api";
import { formatJourMois, joursAvant } from "@/lib/echeances";
import { formatMontant, prenom } from "@/lib/format";
import { resumerMois } from "@/lib/resume-mois";
import { CadreTelephone } from "@/components/cadre-telephone";
import { CarteResumeMois } from "@/components/carte-resume-mois";
import { EcranEnvoi, type DernierEnvoi } from "./ecran-envoi";

type Etats = Record<StatutPiece, { texte: string; reussi: boolean }>;

const ETAT_CABINET: Etats = {
  EN_ATTENTE: { texte: "En attente", reussi: false },
  RECUE: { texte: "Reçue par le cabinet", reussi: false },
  A_COMPLETER: { texte: "Le cabinet demande une nouvelle photo", reussi: false },
  TRAITEE: { texte: "Traitée par le cabinet", reussi: true },
  REMPLACEE: { texte: "Remplacée", reussi: false },
};

const ETAT_AUTONOME: Etats = {
  EN_ATTENTE: { texte: "En attente", reussi: false },
  RECUE: { texte: "Rangée dans vos pièces", reussi: true },
  A_COMPLETER: { texte: "À reprendre", reussi: false },
  TRAITEE: { texte: "Rangée dans vos pièces", reussi: true },
  REMPLACEE: { texte: "Remplacée", reussi: false },
};

async function ContenuEnvoi() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const dossier = profil.dossier;
  const [pieces, demandes] = await Promise.all([listerPieces(dossier.id), listerDemandes(dossier.id)]);

  const ouvertes = demandes.filter((d) => d.statut === "OUVERTE");
  await connection();
  const maintenant = new Date();

  // La demande la plus urgente donne l'échéance affichée
  let echeanceTexte: string | null = null;
  if (ouvertes.length > 0) {
    const plusProche = ouvertes.reduce((a, b) => (new Date(a.echeance) < new Date(b.echeance) ? a : b));
    const jours = joursAvant(new Date(plusProche.echeance), maintenant);
    echeanceTexte = `À envoyer avant le ${formatJourMois(plusProche.echeance)} · ${
      jours === 0 ? "aujourd'hui" : `dans ${jours} jour${jours > 1 ? "s" : ""}`
    }`;
  }

  const etats = profil.autonome ? ETAT_AUTONOME : ETAT_CABINET;
  const recentes = pieces
    .filter((p) => p.statut !== "REMPLACEE" && !p.factureId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const derniere = recentes[0];
  const dernier: DernierEnvoi | null = derniere
    ? {
        titre: `${derniere.fournisseur ?? derniere.categorie} · ${formatMontant(derniere.montantTtc)} FCFA`,
        detail: etats[derniere.statut].texte,
        reussi: etats[derniere.statut].reussi,
      }
    : null;

  return (
    <CadreTelephone nomDossier={dossier.raisonSociale} actif="envoyer">
      <EcranEnvoi
        dossierId={dossier.id}
        prenom={prenom(profil.nom)}
        nomDossier={dossier.raisonSociale}
        demandes={ouvertes.map((d) => ({ id: d.id, description: d.description, aReprendre: d.pieceId !== null }))}
        echeanceTexte={echeanceTexte}
        dernier={dernier}
        autonome={profil.autonome}
        resume={profil.autonome ? <CarteResumeMois resume={resumerMois(pieces, maintenant)} /> : null}
      />
    </CadreTelephone>
  );
}

export default function PageEnvoyer() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuEnvoi />
    </Suspense>
  );
}