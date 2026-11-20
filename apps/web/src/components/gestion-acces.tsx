"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Membre, ResumeInvitation } from "@/lib/api";

interface LienCree {
  lien: string;
  nom: string;
  telephone: string | null;
}

interface ReponseInvitation {
  jeton?: string;
  nom?: string;
  telephone?: string | null;
  message?: string | string[];
}

// Format attendu par WhatsApp : indicatif sans « + » (237 pour le Cameroun)
function numeroWhatsApp(telephone: string | null): string {
  if (!telephone) return "";
  let chiffres = telephone.replace(/\D/g, "");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  if (chiffres.length === 9) chiffres = `237${chiffres}`;
  return chiffres;
}

function formatJour(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Africa/Douala",
  });
}

function messageErreur(corps: ReponseInvitation | null, parDefaut: string): string {
  const message = Array.isArray(corps?.message) ? corps.message[0] : corps?.message;
  return message ?? parDefaut;
}

export function GestionAcces({
  titre,
  role,
  dossierId,
  nomCabinet,
  nomDossier,
  membres,
  invitations,
  peutInviter,
}: {
  titre: string;
  role: "PME" | "COMPTABLE";
  dossierId: string | null;
  nomCabinet: string;
  nomDossier?: string;
  membres: Membre[];
  invitations: ResumeInvitation[];
  peutInviter: boolean;
}) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lienCree, setLienCree] = useState<LienCree | null>(null);
  const [copie, setCopie] = useState(false);

  const enAttente = invitations.filter((i) => i.statut === "EN_ATTENTE");

  function afficherLien(jeton: string, nomInvite: string, telephoneInvite: string | null) {
    setLienCree({
      lien: `${window.location.origin}/invitation/${jeton}`,
      nom: nomInvite,
      telephone: telephoneInvite,
    });
    setCopie(false);
  }

  async function inviter(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      const reponse = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, dossierId: dossierId ?? undefined, nom, telephone, email }),
      });
      const corps = (await reponse.json().catch(() => null)) as ReponseInvitation | null;
      if (!reponse.ok || !corps?.jeton) {
        setErreur(messageErreur(corps, "L'invitation n'a pas pu être créée."));
        return;
      }
      afficherLien(corps.jeton, corps.nom ?? nom, corps.telephone ?? null);
      setNom("");
      setTelephone("");
      setEmail("");
      router.refresh();
    } catch {
      setErreur("Le serveur Marly est injoignable. Réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function agir(invitation: ResumeInvitation, action: "annuler" | "renouveler") {
    setErreur(null);
    try {
      const reponse = await fetch(`/api/invitations/${invitation.id}/${action}`, { method: "POST" });
      const corps = (await reponse.json().catch(() => null)) as ReponseInvitation | null;
      if (!reponse.ok) {
        setErreur(messageErreur(corps, "L'action a échoué. Réessaie."));
        return;
      }
      if (action === "renouveler" && corps?.jeton) {
        afficherLien(corps.jeton, invitation.nom, invitation.telephone);
      } else {
        setLienCree(null);
      }
      router.refresh();
    } catch {
      setErreur("Le serveur Marly est injoignable. Réessaie.");
    }
  }

  async function copier() {
    if (!lienCree) return;
    try {
      await navigator.clipboard.writeText(lienCree.lien);
      setCopie(true);
    } catch {
      setErreur("Copie impossible : sélectionne le lien et copie-le à la main.");
    }
  }

  const message = lienCree
    ? role === "PME"
      ? `Bonjour ${lienCree.nom}, ${nomCabinet} vous invite sur Marly pour envoyer les pièces comptables de ${nomDossier ?? "votre entreprise"} depuis votre téléphone. Créez votre accès ici (lien valable 7 jours) : ${lienCree.lien}`
      : `Bonjour ${lienCree.nom}, ${nomCabinet} vous invite à rejoindre son équipe sur Marly. Créez votre accès ici (lien valable 7 jours) : ${lienCree.lien}`
    : "";

  return (
    <section
      aria-labelledby="titre-acces"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-marly-bord bg-white p-5"
    >
      <h2 id="titre-acces" className="text-lg font-bold">
        {titre}
      </h2>

      {erreur && (
        <p role="alert" className="rounded-xl bg-[#FDECEC] p-3 text-sm text-[#A12A2A]">
          {erreur}
        </p>
      )}

      {membres.length === 0 && enAttente.length === 0 ? (
        <p className="text-sm text-marly-gris">
          {role === "PME"
            ? "Personne n'a encore accès à ce dossier."
            : "Personne d'autre n'a encore rejoint le cabinet."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {membres.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-marly-bord py-3 first:border-t-0"
            >
              <span className="flex flex-col">
                <span className="font-medium">{m.nom}</span>
                <span className="text-sm text-marly-gris">{m.email}</span>
              </span>
              <span className="rounded-full bg-[#E3F5EC] px-3 py-1 text-sm font-medium text-[#11734B]">
                {m.role === "RESPONSABLE" ? "Responsable" : "Accès actif"}
              </span>
            </li>
          ))}
          {enAttente.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-marly-bord py-3 first:border-t-0"
            >
              <span className="flex flex-col">
                <span className="font-medium">{i.nom}</span>
                <span className={`text-sm ${i.expiree ? "text-[#A12A2A]" : "text-marly-gris"}`}>
                  {i.expiree
                    ? "Invitation expirée"
                    : `Invitation en attente, valable jusqu'au ${formatJour(i.expireLe)}`}
                </span>
              </span>
              {peutInviter && (
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => agir(i, "renouveler")}
                    className="h-10 rounded-lg border border-marly-bord px-3 text-sm font-medium"
                  >
                    Nouveau lien
                  </button>
                  <button
                    type="button"
                    onClick={() => agir(i, "annuler")}
                    className="h-10 rounded-lg px-3 text-sm text-marly-gris underline"
                  >
                    Annuler
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {lienCree && (
        <div className="flex flex-col gap-3 rounded-xl bg-[#E3F5EC] p-4" role="status">
          <strong className="text-[#11734B]">Lien prêt pour {lienCree.nom}</strong>
          <input
            readOnly
            value={lienCree.lien}
            aria-label="Lien d'invitation"
            onFocus={(e) => e.currentTarget.select()}
            className="h-11 rounded-lg border border-marly-bord bg-white px-3 text-sm"
          />
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${numeroWhatsApp(lienCree.telephone)}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center rounded-xl bg-[#1FA855] px-4 font-bold text-white"
            >
              Partager sur WhatsApp
            </a>
            <button
              type="button"
              onClick={copier}
              className="h-11 rounded-xl border border-marly-bord bg-white px-4 font-medium"
            >
              {copie ? "Lien copié" : "Copier le lien"}
            </button>
          </div>
          <span className="text-xs text-marly-gris">
            Ce lien ne sera plus affiché. En cas de perte, utilise « Nouveau lien ».
          </span>
        </div>
      )}

      {peutInviter && (
        <form onSubmit={inviter} className="flex flex-col gap-3 border-t border-marly-bord pt-4">
          <span className="text-sm font-medium text-marly-gris">
            {role === "PME" ? "Inviter le gérant ou un employé" : "Inviter un collaborateur comptable"}
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              placeholder="Nom"
              aria-label="Nom de la personne invitée"
              className="h-11 rounded-xl border border-marly-bord px-3"
            />
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              type="tel"
              inputMode="tel"
              maxLength={20}
              placeholder="WhatsApp (ex. 677 12 34 56)"
              aria-label="Numéro WhatsApp (facultatif)"
              className="h-11 rounded-xl border border-marly-bord px-3"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={254}
              placeholder="E-mail (facultatif)"
              aria-label="E-mail (facultatif)"
              className="h-11 rounded-xl border border-marly-bord px-3"
            />
          </div>
          <button
            type="submit"
            disabled={enCours}
            className="h-11 self-start rounded-xl bg-marly-bleu px-5 font-bold text-white disabled:opacity-60"
          >
            {enCours ? "Création…" : "Créer le lien d'invitation"}
          </button>
        </form>
      )}
    </section>
  );
}