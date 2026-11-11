"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  mettreEnAttente,
  synchroniser,
  type ResultatSynchro,
} from "@/lib/file-attente";

const CATEGORIES = [
  "Électricité, eau",
  "Achats",
  "Transport",
  "Télécommunications",
  "Fournitures",
  "Autre",
];

const INTERVALLE_SYNCHRO_MS = 30_000;

export interface DemandeOuverte {
  id: string;
  description: string;
  echeance: string;
}

type Message = { type: "succes" | "erreur"; texte: string } | null;

function aujourdhui(): string {
  // Format AAAA-MM-JJ dans le fuseau du téléphone
  return new Date().toLocaleDateString("fr-CA");
}

function pluriel(nombre: number, mot: string): string {
  return `${nombre} ${mot}${nombre > 1 ? "s" : ""}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}

function messageErreur(statut: number, corps: unknown): string {
  const message = (corps as { message?: string | string[] } | null)?.message;
  const texte = Array.isArray(message) ? message[0] : message;
  if (statut === 409 && texte && /demande/i.test(texte)) {
    return "Cette demande est déjà close. Envoie la pièce sans la lier à une demande.";
  }
  if (statut === 409) return "Cette pièce a déjà été envoyée.";
  if (statut === 413) return "Fichier trop lourd : 10 Mo maximum.";
  return texte ?? "L'envoi a échoué. Réessaie.";
}

export function FormulaireEnvoi({
  dossierId,
  demandes,
}: {
  dossierId: string;
  demandes: DemandeOuverte[];
}) {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const urlApercu = useRef<string | null>(null);

  const [apercu, setApercu] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [demandeChoisie, setDemandeChoisie] = useState<DemandeOuverte | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [enAttente, setEnAttente] = useState(0);

  // Affiche le résultat d'une synchronisation de la file d'attente
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
          texte: `${pluriel(resultat.refusees, "pièce")} en attente refusée${resultat.refusees > 1 ? "s" : ""} par le serveur (format, taille ou montant). Renvoie-la avec une nouvelle photo.`,
        });
      } else if (resultat.envoyees > 0) {
        setMessage({
          type: "succes",
          texte: `${pluriel(resultat.envoyees, "pièce")} en attente envoyée${resultat.envoyees > 1 ? "s" : ""} au cabinet.`,
        });
      }
      if (resultat.envoyees > 0) router.refresh();
    },
    [router],
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

  // Libère l'aperçu de la photo quand on quitte l'écran
  useEffect(() => {
    return () => {
      if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    };
  }, []);

  function reinitialiser() {
    formulaire.current?.reset();
    if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    urlApercu.current = null;
    setApercu(null);
    setNomFichier(null);
    setCategorie(CATEGORIES[0]);
    setDemandeChoisie(null);
  }

  function repondreA(demande: DemandeOuverte) {
    setDemandeChoisie(demande);
    setMessage(null);
    formulaire.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function choisirFichier(evenement: React.ChangeEvent<HTMLInputElement>) {
    const fichier = evenement.target.files?.[0];
    if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    urlApercu.current = null;
    setMessage(null);

    if (!fichier) {
      setApercu(null);
      setNomFichier(null);
      return;
    }
    setNomFichier(fichier.name);
    if (fichier.type.startsWith("image/")) {
      urlApercu.current = URL.createObjectURL(fichier);
      setApercu(urlApercu.current);
    } else {
      setApercu(null);
    }
  }

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setMessage(null);
    setEnvoiEnCours(true);

    const donnees = new FormData(evenement.currentTarget);
    donnees.set("dossierId", dossierId);
    donnees.set("categorie", categorie);
    if (demandeChoisie) donnees.set("demandeId", demandeChoisie.id);

    try {
      // 1. Tentative d'envoi direct, si le téléphone pense avoir du réseau
      let reponse: Response | null = null;
      if (navigator.onLine) {
        try {
          reponse = await fetch("/api/pieces", { method: "POST", body: donnees });
        } catch {
          reponse = null;
        }
      }

      // 2. Pas de réseau, ou serveur indisponible : on garde la pièce sur le téléphone
      if (!reponse || reponse.status === 503) {
        await mettreEnAttente(donnees);
        setEnAttente((nombre) => nombre + 1);
        setMessage({
          type: "succes",
          texte: "Pas de réseau : pièce gardée sur le téléphone. Elle partira automatiquement.",
        });
        reinitialiser();
        return;
      }

      // 3. Réponse du serveur
      if (reponse.status === 401) {
        router.push("/connexion?expiree=1");
        return;
      }

      const corps: unknown = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setMessage({ type: "erreur", texte: messageErreur(reponse.status, corps) });
        return;
      }

      setMessage({ type: "succes", texte: "Pièce envoyée au cabinet." });
      reinitialiser();
      router.refresh();
    } catch {
      setMessage({
        type: "erreur",
        texte: "Impossible d'enregistrer la pièce sur le téléphone. Réessaie.",
      });
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function envoyerMaintenant() {
    void synchroniser().then(appliquerResultat);
  }

  return (
    <div className="flex flex-col gap-4">
      {demandes.length > 0 && (
        <section
          aria-labelledby="titre-attente-cabinet"
          className="flex flex-col gap-3 rounded-2xl border border-[#F0C97A] bg-white p-4"
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="titre-attente-cabinet" className="font-bold">
              Votre cabinet attend {pluriel(demandes.length, "pièce")}
            </h2>
            <span className="text-sm text-marly-gris">
              À envoyer avant le {formatDate(demandes[0].echeance)}
            </span>
          </div>
          <ul className="flex flex-col">
            {demandes.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 border-t border-[#F6F0E4] py-2 first:border-t-0"
              >
                <span className="text-sm">{d.description}</span>
                <button
                  type="button"
                  onClick={() => repondreA(d)}
                  className="h-10 shrink-0 rounded-full bg-marly-bleu px-4 text-sm font-bold text-white"
                >
                  Envoyer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form ref={formulaire} onSubmit={envoyer} className="flex scroll-mt-4 flex-col gap-4">
        {enAttente > 0 && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF2DB] p-3 text-sm text-[#7A4A00]"
          >
            <span>
              <strong>{pluriel(enAttente, "pièce")} en attente d&apos;envoi.</strong>{" "}
              {enAttente > 1 ? "Elles partiront" : "Elle partira"} automatiquement au retour du réseau.
            </span>
            <button
              type="button"
              onClick={envoyerMaintenant}
              className="h-10 rounded-lg bg-[#7A4A00] px-3 font-bold text-white"
            >
              Envoyer maintenant
            </button>
          </div>
        )}

        {message && (
          <p
            role={message.type === "erreur" ? "alert" : "status"}
            className={
              message.type === "erreur"
                ? "rounded-xl bg-[#FDECEC] p-3 text-sm text-[#A12A2A]"
                : "rounded-xl bg-[#E3F5EC] p-3 text-sm text-[#11734B]"
            }
          >
            {message.texte}
          </p>
        )}

        {demandeChoisie && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#E6EEF9] p-3 text-sm text-[#1D4F91]">
            <span>
              En réponse à : <strong>{demandeChoisie.description}</strong>
            </span>
            <button
              type="button"
              onClick={() => setDemandeChoisie(null)}
              className="h-9 shrink-0 rounded-lg px-2 underline"
            >
              Retirer
            </button>
          </div>
        )}

        {/* Le vrai champ fichier recouvre toute la zone : le doigt le touche directement */}
        <div className="relative flex min-h-48 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-marly-bord bg-white p-4 text-center focus-within:border-marly-bleu">
          {apercu ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apercu} alt="Aperçu de la pièce" className="max-h-56 rounded-lg object-contain" />
          ) : (
            <>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10294A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className="font-bold text-marly-bleu">
                {nomFichier ?? "Prendre une photo ou choisir un PDF"}
              </span>
              <span className="text-sm text-marly-gris">JPG, PNG ou PDF, 10 Mo maximum</span>
            </>
          )}
          <input
            name="fichier"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            required
            aria-label="Prendre une photo ou choisir un PDF"
            onChange={choisirFichier}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="date" className="text-sm font-medium text-marly-gris">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={aujourdhui()}
              className="h-12 rounded-xl border border-marly-bord bg-white px-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="montantTtc" className="text-sm font-medium text-marly-gris">
              Montant TTC (FCFA)
            </label>
            <input
              id="montantTtc"
              name="montantTtc"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              className="h-12 rounded-xl border border-marly-bord bg-white px-3"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="fournisseur" className="text-sm font-medium text-marly-gris">
            Fournisseur (facultatif)
          </label>
          <input
            id="fournisseur"
            name="fournisseur"
            type="text"
            maxLength={120}
            className="h-12 rounded-xl border border-marly-bord bg-white px-3"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-marly-gris">Catégorie</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={categorie === c}
                onClick={() => setCategorie(c)}
                className={
                  categorie === c
                    ? "h-10 rounded-full border border-marly-bleu bg-marly-bleu px-4 text-sm font-medium text-white"
                    : "h-10 rounded-full border border-marly-bord bg-white px-4 text-sm"
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
          className="mt-2 h-13 rounded-xl bg-marly-bleu text-base font-bold text-white disabled:opacity-60"
        >
          {envoiEnCours ? "Envoi en cours…" : "Envoyer au cabinet"}
        </button>
      </form>
    </div>
  );
}