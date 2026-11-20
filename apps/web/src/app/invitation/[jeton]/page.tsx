import Link from "next/link";
import { Suspense } from "react";
import { API_URL } from "@/lib/api";
import { initiales } from "@/lib/format";
import { CadreAccueil } from "@/components/cadre-accueil";
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
      <CadreAccueil titre="Ce lien n'est plus valable">
        <p className="text-[15px] leading-[22px] text-muted">
          Il a peut-être expiré, été annulé ou déjà été utilisé. Demandez un nouveau lien à votre
          cabinet comptable : il peut le renouveler en un clic.
        </p>
        <Link
          href="/connexion"
          className="flex h-[52px] items-center justify-center rounded-xl border border-line-strong bg-surface text-base font-bold text-ink"
        >
          J&apos;ai déjà un accès : me connecter
        </Link>
      </CadreAccueil>
    );
  }

  const pme = infos.role === "PME" && infos.dossier;

  return (
    <CadreAccueil titre={`Bienvenue, ${infos.nom}`}>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info-bg text-sm font-bold text-info-ink">
          {initiales(pme ? (infos.dossier ?? infos.cabinet) : infos.cabinet)}
        </span>
        <span className="text-[15px] leading-[21px]">
          <strong>{infos.cabinet}</strong>{" "}
          {pme ? (
            <>
              vous invite à envoyer les pièces de <strong>{infos.dossier}</strong> depuis votre téléphone.
            </>
          ) : (
            "vous invite à rejoindre son équipe sur Marly."
          )}
        </span>
      </div>

      <FormulaireInvitation action={accepterInvitation.bind(null, jeton)} emailInitial={infos.email ?? ""} />

      <p className="mt-auto text-center text-[13px] leading-[19px] text-muted">
        Lien valable jusqu&apos;au{" "}
        {new Date(infos.expireLe).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          timeZone: "Africa/Douala",
        })}
        .{pme ? " Vos pièces ne sont visibles que par vous et votre cabinet." : ""}
      </p>
    </CadreAccueil>
  );
}

export default function PageInvitation({ params }: { params: Promise<{ jeton: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Vérification du lien…</p>}>
      <ContenuInvitation params={params} />
    </Suspense>
  );
}