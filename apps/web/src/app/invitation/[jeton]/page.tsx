import Link from "next/link";
import { Suspense } from "react";
import { API_URL } from "@/lib/api";
import { accepterInvitation } from "./actions";
import { FormulaireInvitation } from "./formulaire";

interface InfosInvitation {
  nom: string;
  email: string | null;
  role: "PME" | "COMPTABLE";
  cabinet: string;
  dossier: string | null;
  expireLe: string;
}

async function lireInvitation(jeton: string): Promise<InfosInvitation | null> {
  try {
    const reponse = await fetch(`${API_URL}/invitations/lien/${encodeURIComponent(jeton)}`, {
      cache: "no-store",
    });
    return reponse.ok ? ((await reponse.json()) as InfosInvitation) : null;
  } catch {
    return null;
  }
}

async function ContenuInvitation({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const infos = await lireInvitation(jeton);

  if (!infos) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-marly-bleu">Ce lien n&apos;est plus valable</h1>
        <p className="text-marly-gris">
          Il a peut-être expiré, été annulé ou déjà été utilisé. Demandez un nouveau lien à votre
          cabinet comptable.
        </p>
        <Link href="/connexion" className="font-bold text-marly-bleu underline">
          J&apos;ai déjà un accès : me connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-marly-bleu">Bienvenue, {infos.nom}</h1>
        <p className="text-marly-gris">
          <strong className="text-marly-texte">{infos.cabinet}</strong>{" "}
          {infos.role === "PME" && infos.dossier
            ? `vous invite à envoyer les pièces comptables de ${infos.dossier} depuis votre téléphone.`
            : "vous invite à rejoindre son équipe sur Marly."}
        </p>
      </div>
      <FormulaireInvitation
        action={accepterInvitation.bind(null, jeton)}
        emailInitial={infos.email ?? ""}
      />
      <p className="text-center text-xs text-marly-gris">
        Lien valable jusqu&apos;au{" "}
        {new Date(infos.expireLe).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          timeZone: "Africa/Douala",
        })}
        .
      </p>
    </div>
  );
}

export default function PageInvitation({ params }: { params: Promise<{ jeton: string }> }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Suspense fallback={<p className="text-marly-gris">Vérification du lien…</p>}>
        <ContenuInvitation params={params} />
      </Suspense>
    </main>
  );
}