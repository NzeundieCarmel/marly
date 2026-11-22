"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { mettreEnAttente, synchroniser, type ResultatSynchro } from "@/lib/file-attente";
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
}: {
  dossierId: string;
  prenom: string;
  nomDossier: string;
  demandes: DemandeOuverte[];
  echeanceTexte: string | null;
  dernier: DernierEnvoi | null;
  autonome: boolean;
  resume?: React.ReactNode;
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
    setFichier(choisi);
    if (demandeChoisie !== undefined) setDemande(demandeChoisie);
    setMessage(null);
    setVue("formulaire");
  }

  function revenir() {
    if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    urlApercu.current = null;
    setApercu(null);
    setFichier(null);
    setDemande(null);
    setCategorie(CATEGORIES[0]);
    setVue("accueil");
  }

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-sm font-medium text-muted">Date</label>
            <input id="date" name="date" type="date" required defaultValue={aujourdhui()} className="h-12 rounded-xl border border-line-strong bg-surface px-3 text-base" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="montantTtc" className="text-sm font-medium text-muted">Montant (FCFA)</label>
            <input id="montantTtc" name="montantTtc" type="text" inputMode="numeric" pattern="[0-9]*" required className="h-12 rounded-xl border border-line-strong bg-surface px-3 text-base tabular-nums" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fournisseur" className="text-sm font-medium text-muted">Fournisseur (facultatif)</label>
          <input id="fournisseur" name="fournisseur" type="text" maxLength={120} className="h-12 rounded-xl border border-line-strong bg-surface px-3 text-base" />
        </div>

        <fieldset className="flex flex-col gap-2">
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
          disabled={envoiEnCours}
          className="mt-2 flex h-13 items-center justify-center gap-2.5 rounded-xl bg-action text-base font-bold text-white hover:bg-action-hover disabled:opacity-60"
        >
          <IconeEnvoyer width={20} height={20} />
           {envoiEnCours
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