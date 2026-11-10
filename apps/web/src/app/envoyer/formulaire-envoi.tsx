"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Électricité, eau",
  "Achats",
  "Transport",
  "Télécommunications",
  "Fournitures",
  "Autre",
];

type Message = { type: "succes" | "erreur"; texte: string } | null;

function aujourdhui(): string {
  // Format AAAA-MM-JJ dans le fuseau du téléphone
  return new Date().toLocaleDateString("fr-CA");
}

function messageErreur(statut: number, corps: unknown): string {
  if (statut === 409) return "Cette pièce a déjà été envoyée.";
  if (statut === 413) return "Fichier trop lourd : 10 Mo maximum.";
  if (statut === 503) return "Le serveur Marly est injoignable. Réessaie plus tard.";
  const message = (corps as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) return message[0] ?? "Vérifie les informations saisies.";
  return message ?? "L'envoi a échoué. Réessaie.";
}

export function FormulaireEnvoi({ dossierId }: { dossierId: string }) {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const urlApercu = useRef<string | null>(null);

  const [apercu, setApercu] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  // Libère l'aperçu de la photo quand on quitte l'écran
  useEffect(() => {
    return () => {
      if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    };
  }, []);

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

    try {
      const reponse = await fetch("/api/pieces", { method: "POST", body: donnees });

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
      formulaire.current?.reset();
      if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
      urlApercu.current = null;
      setApercu(null);
      setNomFichier(null);
      setCategorie(CATEGORIES[0]);
      router.refresh();
    } catch {
      setMessage({
        type: "erreur",
        texte: "Pas de connexion. Réessaie quand le réseau revient.",
      });
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <form ref={formulaire} onSubmit={envoyer} className="flex flex-col gap-4">
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
  );
}