import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import {
  lireProfil,
  lireSessionCaisse,
  lireTicket,
  listerArticles,
  listerVentesCaisse,
  type ModeCaisse,
  type TicketCaisse,
} from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { OuvrirCaisse, PointDeVente } from "./formulaires";

type Recherche = Promise<Record<string, string | string[] | undefined>>;

const MODES_LIBELLES: Record<ModeCaisse, string> = {
  ESPECES: "Espèces",
  MTN_MOMO: "MTN MoMo",
  ORANGE_MONEY: "Orange Money",
};

function heure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });
}

async function ticketOuRien(dossierId: string, id: string): Promise<TicketCaisse | null> {
  try {
    return await lireTicket(dossierId, id);
  } catch (erreur) {
    unstable_rethrow(erreur);
    return null;
  }
}

function nombre(valeur: string | string[] | undefined): number | null {
  return typeof valeur === "string" && /^-?\d+$/.test(valeur) ? Number(valeur) : null;
}

async function ContenuCaisse({ recherche }: { recherche: Recherche }) {
  const [profil, p] = await Promise.all([lireProfil(), recherche]);
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const dossier = profil.dossier;
  const { session } = await lireSessionCaisse(dossier.id);

  if (!session) {
    const ecart = nombre(p.ecart);
    return (
      <CadreTelephone nomDossier={dossier.raisonSociale} actif="stock">
        <h1 className="text-[26px] font-bold leading-8 text-heading">Caisse</h1>
        {p.cloture === "1" && ecart !== null && (
          <section role="status" className={`flex flex-col gap-1 rounded-2xl p-4 ${ecart === 0 ? "bg-success-bg text-success-ink" : "bg-warning-bg text-warning-ink"}`}>
            <h2 className="text-base font-bold">Caisse clôturée</h2>
            <p className="text-sm tabular-nums">
              Espèces attendues {formatMontant(nombre(p.attendu) ?? 0)} FCFA, comptées {formatMontant(nombre(p.compte) ?? 0)} FCFA.
            </p>
            <p className="text-sm font-bold tabular-nums">
              {ecart === 0 ? "La caisse est juste." : ecart < 0 ? `Il manque ${formatMontant(-ecart)} FCFA.` : `Il y a ${formatMontant(ecart)} FCFA en trop.`}
            </p>
          </section>
        )}
        <OuvrirCaisse dossierId={dossier.id} />
      </CadreTelephone>
    );
  }

  const idTicket = typeof p.ticket === "string" ? p.ticket : null;
  const [articles, ventes, ticket] = await Promise.all([
    listerArticles(dossier.id),
    listerVentesCaisse(dossier.id),
    idTicket ? ticketOuRien(dossier.id, idTicket) : Promise.resolve(null),
  ]);

  return (
    <CadreTelephone nomDossier={dossier.raisonSociale} actif="stock">
      <div className="flex flex-col">
        <h1 className="text-[26px] font-bold leading-8 text-heading">Caisse</h1>
        <p className="text-sm text-muted tabular-nums">
          Ouverte à {heure(session.ouverteLe)} · fond de caisse {formatMontant(session.fondInitial)} FCFA
        </p>
      </div>

      {ticket && (
        <section role="status" className="flex flex-col gap-1 rounded-2xl bg-success-bg p-4 text-success-ink">
          <h2 className="text-base font-bold">
            Ticket n°{ticket.numero} encaissé : {formatMontant(ticket.totalTtc)} FCFA
          </h2>
          <p className="text-sm">
            {MODES_LIBELLES[ticket.mode]}
            {ticket.monnaie !== null && ticket.monnaie > 0 && (
              <>
                {" · "}
                <strong className="tabular-nums">Monnaie à rendre : {formatMontant(ticket.monnaie)} FCFA</strong>
              </>
            )}
          </p>
        </section>
      )}

      <PointDeVente
        key={idTicket ?? "nouveau"}
        dossierId={dossier.id}
        articles={articles.map((a) => ({
          id: a.id,
          nom: a.nom,
          reference: a.reference,
          categorie: a.categorie,
          prixVente: a.prixVente,
          suiviStock: a.suiviStock,
          quantite: a.quantite,
          unite: a.unite,
        }))}
      />

      <section aria-labelledby="titre-journee" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titre-journee" className="text-base font-bold text-heading">Depuis l&apos;ouverture</h2>
          <span className="text-sm text-muted">{session.ventes} vente{session.ventes > 1 ? "s" : ""}</span>
        </div>
        <dl className="flex flex-col divide-y divide-line text-[15px]">
          {(Object.keys(MODES_LIBELLES) as ModeCaisse[]).map((m) => (
            <div key={m} className="flex justify-between py-2">
              <dt className="text-muted">{MODES_LIBELLES[m]}</dt>
              <dd className="tabular-nums">{formatMontant(session.parMode[m])} FCFA</dd>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold text-heading">
            <dt>Total encaissé</dt>
            <dd className="tabular-nums">{formatMontant(session.totalTtc)} FCFA</dd>
          </div>
        </dl>
        {ventes.length > 0 && (
          <ul aria-label="Derniers tickets" className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
            {ventes.slice(0, 8).map((v) => (
              <li key={v.id} className="flex justify-between gap-3">
                <span className="text-muted tabular-nums">
                  {heure(v.date)} · n°{v.numero} · {MODES_LIBELLES[v.mode]}
                </span>
                <span className="tabular-nums">{formatMontant(v.totalTtc)} FCFA</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/envoyer/caisse/cloture"
          className="flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface text-[15px] font-bold text-ink hover:bg-survol"
        >
          Clôturer la caisse
        </Link>
      </section>
    </CadreTelephone>
  );
}

export default function PageCaisse({ searchParams }: { searchParams: Recherche }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuCaisse recherche={searchParams} />
    </Suspense>
  );
}