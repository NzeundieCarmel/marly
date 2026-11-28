"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { mettreEnAttente, synchroniser, type ResultatSynchro } from "@/lib/file-attente";
import { compresserImage, formatTaille } from "@/lib/compresser-image";
import { creerVenteLue } from "./actions-lecture";
import {
  IconeAppareil,
  IconeCheck,
  IconeEnvoyer,
  IconeHorloge,
  IconeHorsLigne,
  IconeRetour,
} from "@/components/icones";

const CATEGORIES = ["Électricité, eau", "Achats", "Transport", "Télécommunications", "Fournitures", "Autre"];
const INTERVALLE_SYNCHRO_MS = 30_000;

export interface DemandeOuverte {
  id: string;
  description: string;
  aReprendre: boolean;
}

export interface DernierEnvoi {
  titre: string;
  detail: string;
  reussi: boolean;
}

type Message = { type: "succes" | "erreur"; texte: string } | null;

type ChampLu = "montantTtc" | "montantHt" | "tva" | "date" | "tiers" | "niuTiers";

// Ce que Marly a lu sur la photo (voir l'API : dossiers/:id/lecture)
interface ResultatLecture {
  nature: "ACHAT" | "VENTE";
  montantTtc: number | null;
  montantHt: number | null;
  tva: number | null;
  tvaCalculee: boolean;
  date: string | null;
  tiers: string | null;
  niuTiers: string | null;
  champsLus: ChampLu[];
}

type EtatLecture =
  | { etat: "aucune" }
  | { etat: "encours" }
  | { etat: "faite"; lus: ChampLu[]; tvaCalculee: boolean }
  | { etat: "echec"; texte: string };

const CHAMP = "h-12 rounded-xl border bg-surface px-3 text-base";
// Un champ que Marly n'a pas trouvé sur la photo est signalé en orange
function bordure(lecture: EtatLecture, champ: ChampLu): string {
  return lecture.etat === "faite" && !lecture.lus.includes(champ) ? "border-warning-line bg-warning-bg" : "border-line-strong";
}

// État du réseau, lu sans effet : le navigateur prévient à chaque changement
function abonnerReseau(rappel: () => void) {
  window.addEventListener("online", rappel);
  window.addEventListener("offline", rappel);
  return () => {
    window.removeEventListener("online", rappel);
    window.removeEventListener("offline", rappel);
  };
}

function aujourdhui(): string {
  return new Date().toLocaleDateString("fr-CA");
}

function pluriel(nombre: number, mot: string): string {
  return `${nombre} ${mot}${nombre > 1 ? "s" : ""}`;
}

function messageErreur(statut: number, corps: unknown): string {
  const message = (corps as { message?: string | string[] } | null)?.message;
  const texte = Array.isArray(message) ? message[0] : message;
  if (statut === 409 && texte && /demande/i.test(texte)) {
    return "Cette demande est déjà close. Retirez-la puis envoyez la pièce.";
  }
  if (statut === 409) return "Cette pièce a déjà été envoyée.";
  if (statut === 413) return "Fichier trop lourd : 10 Mo maximum.";
  return texte ?? "L'envoi a échoué. Réessayez.";
}

// Un vrai champ fichier, invisible, posé sur toute la zone : le doigt le touche directement
function ChampPhoto({
  libelle,
  onChange,
}: {
  libelle: string;
  onChange: (evenement: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="file"
      accept="image/jpeg,image/png,application/pdf"
      aria-label={libelle}
      onChange={onChange}
      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
    />
  );
}

export function EcranEnvoi({
  dossierId,
  prenom,
  nomDossier,
  demandes,
  echeanceTexte,
  dernier,
  autonome,
  resume,
  clients,
}: {
  dossierId: string;
  prenom: string;
  nomDossier: string;
  demandes: DemandeOuverte[];
  echeanceTexte: string | null;
  dernier: DernierEnvoi | null;
  autonome: boolean;
  resume?: React.ReactNode;
  clients: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const urlApercu = useRef<string | null>(null);
  const enLigne = useSyncExternalStore(abonnerReseau, () => navigator.onLine, () => true);

  const [vue, setVue] = useState<"accueil" | "formulaire">("accueil");
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [demande, setDemande] = useState<DemandeOuverte | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [enAttente, setEnAttente] = useState(0);
  // Taille avant et après optimisation ; « apres » vaut null pendant la compression
  const [optimisation, setOptimisation] = useState<{ avant: number; apres: number | null } | null>(null);
  // Numéro de la dernière photo choisie : une compression plus ancienne qui finit en retard est ignorée
  const selection = useRef(0);
  const enOptimisation = optimisation !== null && optimisation.apres === null;

  // Champs du formulaire, pré-remplis par la lecture automatique
  const [date, setDate] = useState(aujourdhui());
  const [montant, setMontant] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [montantHt, setMontantHt] = useState("");
  const [tva, setTva] = useState("");
  const [niuTiers, setNiuTiers] = useState("");
  const [nature, setNature] = useState<"ACHAT" | "VENTE">("ACHAT");
  const [lecture, setLecture] = useState<EtatLecture>({ etat: "aucune" });
  const [clientId, setClientId] = useState("");
  const [nouveauClient, setNouveauClient] = useState("");
  const [designation, setDesignation] = useState("Vente selon bon");

  const appliquerResultat = useCallback(
    (resultat: ResultatSynchro) => {
      setEnAttente(resultat.restantes);
      if (resultat.sessionExpiree) {
        router.push("/connexion?expiree=1");
        return;
      }
      if (resultat.refusees > 0) {
        setMessage({
          type: "erreur",
          texte: `${pluriel(resultat.refusees, "pièce")} en attente refusée${resultat.refusees > 1 ? "s" : ""} par le serveur. Renvoyez-la avec une nouvelle photo.`,
        });
      } else if (resultat.envoyees > 0) {
        const accord = resultat.envoyees > 1 ? "s" : "";
        setMessage({
          type: "succes",
          texte: autonome
            ? `${pluriel(resultat.envoyees, "pièce")} en attente enregistrée${accord}.`
            : `${pluriel(resultat.envoyees, "pièce")} en attente envoyée${accord} au cabinet.`,
        });
      }
      if (resultat.envoyees > 0) router.refresh();
    },
    [router, autonome],
  );

  // Synchronise à l'ouverture, au retour du réseau, puis toutes les 30 secondes
  useEffect(() => {
    let actif = true;
    const lancer = () => {
      void synchroniser().then((resultat) => {
        if (actif) appliquerResultat(resultat);
      });
    };
    lancer();
    window.addEventListener("online", lancer);
    const minuteur = window.setInterval(lancer, INTERVALLE_SYNCHRO_MS);
    return () => {
      actif = false;
      window.removeEventListener("online", lancer);
      window.clearInterval(minuteur);
    };
  }, [appliquerResultat]);

  useEffect(() => {
    return () => {
      if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    };
  }, []);

  // demandeChoisie : une demande, null (aucune), ou absent (garder celle en cours)
  function choisirFichier(evenement: React.ChangeEvent<HTMLInputElement>, demandeChoisie?: DemandeOuverte | null) {
    const choisi = evenement.target.files?.[0];
    evenement.target.value = "";
    if (!choisi) return;
    if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    urlApercu.current = choisi.type.startsWith("image/") ? URL.createObjectURL(choisi) : null;
    setApercu(urlApercu.current);
    setFichier(null);
    setOptimisation({ avant: choisi.size, apres: null });
    if (demandeChoisie !== undefined) setDemande(demandeChoisie);
    setMessage(null);
    setVue("formulaire");

    const numero = ++selection.current;
    setLecture({ etat: "aucune" });
    void compresserImage(choisi).then((resultat) => {
      if (selection.current !== numero) return;
      setFichier(resultat);
      setOptimisation({ avant: choisi.size, apres: resultat.size });
      // Lecture automatique : une photo, et du réseau ; sinon le gérant remplit à la main
      if (choisi.type.startsWith("image/") && navigator.onLine) {
        void lire(resultat, numero, demandeChoisie === undefined ? demande : demandeChoisie);
      }
    });
  }

  async function lire(photo: File, numero: number, demandeEnCours: DemandeOuverte | null) {
    setLecture({ etat: "encours" });
    const donnees = new FormData();
    donnees.set("dossierId", dossierId);
    donnees.set("fichier", photo, photo.name);
    let reponse: Response | null = null;
    try {
      reponse = await fetch("/api/lecture", { method: "POST", body: donnees });
    } catch {
      reponse = null;
    }
    if (selection.current !== numero) return;
    if (!reponse || !reponse.ok) {
      const corps = (await reponse?.json().catch(() => null)) as { message?: string | string[] } | null;
      const texte = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
      setLecture({ etat: "echec", texte: texte ?? "Lecture automatique indisponible : remplissez les champs à la main." });
      return;
    }
    const r = (await reponse.json()) as ResultatLecture;
    if (selection.current !== numero) return;
    if (r.date) setDate(r.date);
    setMontant(r.montantTtc !== null ? String(r.montantTtc) : "");
    setMontantHt(r.montantHt !== null ? String(r.montantHt) : "");
    setTva(r.tva !== null ? String(r.tva) : "");
    setNiuTiers(r.niuTiers ?? "");
    // Une pièce demandée par le cabinet reste un achat ; sinon on suit ce que Marly a reconnu
    const natureLue = demandeEnCours ? "ACHAT" : r.nature;
    setNature(natureLue);
    if (natureLue === "VENTE") {
      const tiers = (r.tiers ?? "").toLowerCase();
      const trouve = tiers
        ? clients.find((c) => c.nom.toLowerCase().includes(tiers) || tiers.includes(c.nom.toLowerCase()))
        : undefined;
      setClientId(trouve?.id ?? "");
      setNouveauClient(trouve ? "" : (r.tiers ?? ""));
    } else {
      setFournisseur(r.tiers ?? "");
    }
    setLecture({ etat: "faite", lus: r.champsLus, tvaCalculee: r.tvaCalculee });
  }

  function revenir() {
    if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    urlApercu.current = null;
    setApercu(null);
    setFichier(null);
    setDemande(null);
    setCategorie(CATEGORIES[0]);
    setOptimisation(null);
    setDate(aujourdhui());
    setMontant("");
    setFournisseur("");
    setMontantHt("");
    setTva("");
    setNiuTiers("");
    setNature("ACHAT");
    setLecture({ etat: "aucune" });
    setClientId("");
    setNouveauClient("");
    setDesignation("Vente selon bon");
    selection.current += 1;
    setVue("accueil");
  }

  // Vente lue sur la photo : un brouillon de facture, numéroté FAC-… seulement à l'émission
  async function envoyerVente() {
    if (!navigator.onLine) {
      setMessage({ type: "erreur", texte: "Il faut du réseau pour créer une facture." });
      return;
    }
    const donnees = new FormData();
    donnees.set("clientId", clientId);
    donnees.set("nouveauClient", nouveauClient);
    donnees.set("designation", designation);
    donnees.set("montantTtc", montant);
    setMessage(null);
    setEnvoiEnCours(true);
    try {
      const resultat = await creerVenteLue(donnees);
      if (resultat?.erreur) setMessage({ type: "erreur", texte: resultat.erreur });
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (nature === "VENTE") {
      await envoyerVente();
      return;
    }
    if (!fichier) {
      setMessage({ type: "erreur", texte: "Prenez d'abord la pièce en photo." });
      return;
    }
    setMessage(null);
    setEnvoiEnCours(true);

    const donnees = new FormData(evenement.currentTarget);
    donnees.set("dossierId", dossierId);
    donnees.set("categorie", categorie);
    donnees.set("fichier", fichier, fichier.name);
    if (demande) donnees.set("demandeId", demande.id);
    // Champs facultatifs : envoyés seulement s'ils sont remplis
    for (const champ of ["montantHt", "tva", "niuFournisseur"]) {
      if (!String(donnees.get(champ) ?? "").trim()) donnees.delete(champ);
    }
    if (lecture.etat === "faite") donnees.set("lectureAuto", "oui");

    try {
      let reponse: Response | null = null;
      if (navigator.onLine) {
        try {
          reponse = await fetch("/api/pieces", { method: "POST", body: donnees });
        } catch {
          reponse = null;
        }
      }

      // Pas de réseau, ou serveur indisponible : la pièce reste sur le téléphone
      if (!reponse || reponse.status === 503) {
        await mettreEnAttente(donnees);
        setEnAttente((n) => n + 1);
        revenir();
        setMessage({
          type: "succes",
          texte: "Pas de réseau : pièce gardée sur le téléphone. Elle partira automatiquement.",
        });
        return;
      }
      if (reponse.status === 401) {
        router.push("/connexion?expiree=1");
        return;
      }
      const corps: unknown = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setMessage({ type: "erreur", texte: messageErreur(reponse.status, corps) });
        return;
      }
      revenir();
        setMessage({ type: "succes", texte: autonome ? "Pièce enregistrée." : "Pièce envoyée au cabinet." });
      router.refresh();
    } catch {
      setMessage({ type: "erreur", texte: "Impossible d'enregistrer la pièce sur le téléphone. Réessayez." });
    } finally {
      setEnvoiEnCours(false);
    }
  }

  const bandeaux = (
    <>
      {!enLigne && (
        <div role="status" className="flex items-start gap-2.5 rounded-xl bg-warning-bg px-3 py-2.5 text-sm text-warning-ink">
          <IconeHorsLigne width={18} height={18} className="mt-px shrink-0" />
          <span>Hors ligne : vos pièces seront envoyées dès le retour du réseau.</span>
        </div>
      )}
      {enAttente > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-bg p-3 text-sm text-warning-ink">
          <span>
            <strong>{pluriel(enAttente, "pièce")} en attente d&apos;envoi.</strong>
          </span>
          <button
            type="button"
            onClick={() => void synchroniser().then(appliquerResultat)}
            className="h-10 rounded-lg bg-warning-ink px-3 font-bold text-warning-bg"
          >
            Envoyer maintenant
          </button>
        </div>
      )}
      {message && (
        <p
          role={message.type === "erreur" ? "alert" : "status"}
          className={`rounded-xl p-3 text-sm ${
            message.type === "erreur" ? "bg-danger-bg text-danger-ink" : "bg-success-bg text-success-ink"
          }`}
        >
          {message.texte}
        </p>
      )}
    </>
  );

  if (vue === "formulaire") {
    return (
      <form onSubmit={envoyer} className="flex flex-col gap-3.5">
        <div className="-ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={revenir}
            aria-label="Retour"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-survol"
          >
            <IconeRetour width={22} height={22} />
          </button>
          <h1 className="text-xl font-bold text-heading">Nouvelle pièce</h1>
        </div>

        {bandeaux}

        {demande && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-info-bg py-2 pl-3 pr-2 text-sm text-info-ink">
            <span>
              En réponse à : <strong>{demande.description}</strong>
            </span>
            <button type="button" onClick={() => setDemande(null)} className="h-9 shrink-0 rounded-lg px-2.5 font-medium underline">
              Retirer
            </button>
          </div>
        )}

        <div className="relative flex h-[200px] items-center justify-center overflow-hidden rounded-2xl bg-sunken">
          {apercu ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apercu} alt="Aperçu de la pièce" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="px-6 text-center text-sm text-muted">{fichier?.name ?? "Aucune photo"}</span>
          )}
          <label className="absolute bottom-2.5 right-2.5 flex h-10 items-center rounded-full border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink focus-within:outline focus-within:outline-3 focus-within:outline-focus">
            Reprendre la photo
            <ChampPhoto libelle="Reprendre la photo" onChange={(e) => choisirFichier(e)} />
          </label>
        </div>

        {enOptimisation && (
          <p role="status" className="text-[13px] text-muted">Optimisation de la photo…</p>
        )}
        {optimisation?.apres != null && optimisation.apres < optimisation.avant && (
          <p role="status" className="text-[13px] text-muted">
            Photo optimisée : {formatTaille(optimisation.avant)} →{" "}
            <strong className="text-ink">{formatTaille(optimisation.apres)}</strong>
          </p>
        )}

        {lecture.etat === "encours" && (
          <p role="status" className="rounded-xl bg-info-bg p-3 text-sm text-info-ink">
            Marly lit la pièce… Vous pouvez déjà vérifier la photo.
          </p>
        )}
        {lecture.etat === "faite" && (
          <p role="status" className="rounded-xl bg-success-bg p-3 text-sm leading-5 text-success-ink">
            Marly a lu la pièce. Vérifiez les champs, puis enregistrez.
            {lecture.lus.length < 4 && " Les champs en orange n'ont pas été trouvés sur la photo."}
            {lecture.tvaCalculee && " La TVA a été calculée à partir des montants lus."}
          </p>
        )}
        {lecture.etat === "echec" && (
          <p role="status" className="rounded-xl bg-warning-bg p-3 text-sm text-warning-ink">{lecture.texte}</p>
        )}

        {!demande && (
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-2 text-sm font-medium text-muted">Cette pièce est</legend>
            {(
              [
                ["ACHAT", "Un achat, une dépense"],
                ["VENTE", "Une vente à facturer"],
              ] as const
            ).map(([valeur, libelle]) => (
              <button
                key={valeur}
                type="button"
                aria-pressed={nature === valeur}
                onClick={() => setNature(valeur)}
                className={
                  nature === valeur
                    ? "h-12 rounded-xl border border-action bg-action px-2 text-sm font-bold text-white"
                    : "h-12 rounded-xl border border-line-strong bg-surface px-2 text-sm text-ink"
                }
              >
                {libelle}
              </button>
            ))}
          </fieldset>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-sm font-medium text-muted">Date</label>
            <input id="date" name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${CHAMP} ${bordure(lecture, "date")}`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="montantTtc" className="text-sm font-medium text-muted">Montant TTC (FCFA)</label>
            <input id="montantTtc" name="montantTtc" type="text" inputMode="numeric" pattern="[0-9]*" required value={montant} onChange={(e) => setMontant(e.target.value)} className={`${CHAMP} tabular-nums ${bordure(lecture, "montantTtc")}`} />
          </div>
        </div>

        {nature === "VENTE" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="clientId" className="text-sm font-medium text-muted">Client</label>
              <select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} className={`${CHAMP} border-line-strong`}>
                <option value="">Nouveau client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            {!clientId && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nouveauClient" className="text-sm font-medium text-muted">Nom du nouveau client</label>
                <input id="nouveauClient" type="text" required minLength={2} maxLength={120} value={nouveauClient} onChange={(e) => setNouveauClient(e.target.value)} className={`${CHAMP} ${bordure(lecture, "tiers")}`} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="designation" className="text-sm font-medium text-muted">Désignation sur la facture</label>
              <input id="designation" type="text" required maxLength={200} value={designation} onChange={(e) => setDesignation(e.target.value)} className={`${CHAMP} border-line-strong`} />
            </div>
            <p className="text-[13px] leading-[19px] text-muted">
              Marly prépare un brouillon de facture au montant lu. Vous pourrez détailler les lignes, puis l&apos;émettre : elle
              recevra alors son numéro FAC-….
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fournisseur" className="text-sm font-medium text-muted">Fournisseur (facultatif)</label>
              <input id="fournisseur" name="fournisseur" type="text" maxLength={120} value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} className={`${CHAMP} ${bordure(lecture, "tiers")}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="montantHt" className="text-sm font-medium text-muted">Montant HT (facultatif)</label>
                <input id="montantHt" name="montantHt" type="text" inputMode="numeric" pattern="[0-9]*" value={montantHt} onChange={(e) => setMontantHt(e.target.value)} className={`${CHAMP} tabular-nums ${lecture.etat === "faite" && montantHt === "" ? "border-warning-line bg-warning-bg" : "border-line-strong"}`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tva" className="text-sm font-medium text-muted">TVA (facultatif)</label>
                <input id="tva" name="tva" type="text" inputMode="numeric" pattern="[0-9]*" value={tva} onChange={(e) => setTva(e.target.value)} className={`${CHAMP} tabular-nums ${lecture.etat === "faite" && tva === "" ? "border-warning-line bg-warning-bg" : "border-line-strong"}`} />
              </div>
            </div>
            {niuTiers && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="niuFournisseur" className="text-sm font-medium text-muted">NIU du fournisseur</label>
                <input id="niuFournisseur" name="niuFournisseur" type="text" maxLength={20} value={niuTiers} onChange={(e) => setNiuTiers(e.target.value)} className={`${CHAMP} border-line-strong uppercase`} />
              </div>
            )}
          </>
        )}

        <fieldset className={nature === "VENTE" ? "hidden" : "flex flex-col gap-2"}>
          <legend className="mb-2 text-sm font-medium text-muted">Catégorie</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={categorie === c}
                onClick={() => setCategorie(c)}
                className={
                  categorie === c
                    ? "h-10 rounded-full border border-action bg-action px-3.5 text-sm font-medium text-white"
                    : "h-10 rounded-full border border-line-strong bg-surface px-3.5 text-sm text-ink"
                }
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={envoiEnCours || enOptimisation || lecture.etat === "encours"}
          className="mt-2 flex h-13 items-center justify-center gap-2.5 rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60"
        >
          <IconeEnvoyer width={20} height={20} />
           {enOptimisation
            ? "Optimisation de la photo…"
            : lecture.etat === "encours"
            ? "Lecture de la pièce…"
            : nature === "VENTE"
            ? envoiEnCours
              ? "Création du brouillon…"
              : "Créer le brouillon de facture"
            : envoiEnCours
            ? "Envoi en cours…"
            : !enLigne
              ? "Garder et envoyer plus tard"
              : autonome
                ? "Enregistrer la pièce"
                : "Envoyer au cabinet"}
        </button>
      </form>
    );
  }

  return (
    <>
      {bandeaux}

      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">{nomDossier}</span>
                <h1 className="text-[26px] font-bold leading-8 text-heading">Bonjour {prenom}</h1>
      </div>

      {resume}

      {demandes.length > 0 && (
        <section aria-labelledby="titre-attente" className="overflow-hidden rounded-2xl border border-warning-line bg-surface">
          <div className="flex items-center gap-3 bg-warning-bg px-4 py-3.5 text-warning-ink">
            <IconeHorloge width={22} height={22} className="shrink-0" />
            <div className="flex flex-col">
              <h2 id="titre-attente" className="text-base font-bold">
                Votre cabinet attend {pluriel(demandes.length, "pièce")}
              </h2>
              {echeanceTexte && <span className="text-[13px]">{echeanceTexte}</span>}
            </div>
          </div>
          {demandes.map((d, i) => (
            <div key={d.id} className={`flex items-center justify-between gap-2.5 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-medium">{d.description}</span>
                <span className={`text-[13px] ${d.aReprendre ? "text-warning-ink" : "text-muted"}`}>
                  {d.aReprendre ? "Pièce à reprendre" : "Demandée par votre cabinet"}
                </span>
              </span>
              <label className="relative flex h-10 shrink-0 items-center rounded-full bg-action px-4 text-sm font-bold text-white focus-within:outline focus-within:outline-3 focus-within:outline-focus">
                Envoyer
                <ChampPhoto libelle={`Envoyer : ${d.description}`} onChange={(e) => choisirFichier(e, d)} />
              </label>
            </div>
          ))}
        </section>
      )}

      <label className="relative flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3.5 overflow-hidden rounded-[20px] bg-identity text-white focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus">
        <span aria-hidden="true" className="absolute right-[18px] top-[18px] h-3 w-3 rounded-full bg-accent-500" />
        <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-white/50 bg-white/10">
          <IconeAppareil width={34} height={34} />
        </span>
        <span className="text-xl font-bold">Prendre une pièce en photo</span>
        <span className="text-sm text-[#D6DEEA]">Facture, reçu, relevé · ou un PDF</span>
        <ChampPhoto libelle="Prendre une pièce en photo" onChange={(e) => choisirFichier(e, null)} />
      </label>

      {dernier && (
        <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
              dernier.reussi ? "bg-success-bg text-success-ink" : "bg-info-bg text-info-ink"
            }`}
          >
            <IconeCheck width={18} height={18} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">Dernier envoi : {dernier.titre}</span>
            <span className="text-[13px] text-muted">{dernier.detail}</span>
          </span>
        </div>
      )}
    </>
  );
}