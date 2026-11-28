import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lirePilotage, lireProfil, type ModeCaisse } from "@/lib/api";
import { formatMontant } from "@/lib/format";
import { CadreTelephone } from "@/components/cadre-telephone";
import { IconeAppareil, IconeCaisse, IconeStock } from "@/components/icones";
import { IconeFacture } from "@/components/icone-facture";

const MODES: Record<ModeCaisse, string> = { ESPECES: "Espèces", MTN_MOMO: "MTN MoMo", ORANGE_MONEY: "Orange Money" };

function heure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });
}

function Chiffre({ libelle, valeur, note, ton }: { libelle: string; valeur: number; note?: string; ton?: "danger" | "success" }) {
  return (
    <section className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-4">
      <span className="text-[13px] text-muted">{libelle}</span>
      <strong className="text-[20px] leading-7 text-heading tabular-nums">{formatMontant(valeur)}</strong>
      {note && (
        <span className={`text-[12px] leading-4 ${ton === "danger" ? "text-danger-ink" : ton === "success" ? "text-success-ink" : "text-muted"}`}>
          {note}
        </span>
      )}
    </section>
  );
}

function Action({ href, libelle, Icone, principale = false }: { href: string; libelle: string; Icone: typeof IconeAppareil; principale?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-[64px] items-center gap-3 rounded-2xl px-4 text-[15px] font-bold ${
        principale ? "bg-action text-white hover:bg-action-hover" : "border border-line-strong bg-surface text-ink hover:bg-survol"
      }`}
    >
      <Icone width={22} height={22} />
      {libelle}
    </Link>
  );
}

async function ContenuAccueil() {
  const profil = await lireProfil();
  if (!profil.dossier) {
    redirect("/dossiers");
  }
  const p = await lirePilotage(profil.dossier.id);
  await connection();
  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Douala" });
  const prenom = profil.nom.split(" ")[0];
  const ventesJour = p.ventesJour.caisse + p.ventesJour.factures;

  return (
    <CadreTelephone nomDossier={profil.dossier.raisonSociale} actif="envoyer">
      <div className="flex flex-col">
        <span className="text-sm capitalize text-muted">{date}</span>
        <h1 className="text-[26px] font-bold leading-8 text-heading">Bonjour {prenom}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Chiffre
          libelle="Ventes du jour"
          valeur={ventesJour}
          note={`${p.ventesJour.tickets} ticket${p.ventesJour.tickets > 1 ? "s" : ""}${p.ventesJour.nombreFactures ? ` · ${p.ventesJour.nombreFactures} facture${p.ventesJour.nombreFactures > 1 ? "s" : ""}` : ""}`}
        />
        <Chiffre libelle="Ventes du mois" valeur={p.ventesMois} note="Caisse et factures" />
        <Chiffre
          libelle="Clients : à encaisser"
          valeur={p.aEncaisser}
          note={p.enRetard > 0 ? `dont ${formatMontant(p.enRetard)} en retard` : "Aucun retard"}
          ton={p.enRetard > 0 ? "danger" : "success"}
        />
        <Chiffre libelle="Fournisseurs : à payer" valeur={p.aPayer} note="Achats à crédit" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Action href="/envoyer/caisse" libelle={p.caisseOuverte ? "Vendre" : "Ouvrir la caisse"} Icone={IconeCaisse} principale />
        <Action href="/envoyer" libelle="Photo d'une pièce" Icone={IconeAppareil} />
        <Action href="/envoyer/factures/nouvelle" libelle="Nouvelle facture" Icone={IconeFacture} />
        <Action href="/envoyer/stock/achats/nouveau" libelle="Recevoir une livraison" Icone={IconeStock} />
      </div>

      {p.piecesAComptabiliser > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-warning-line bg-warning-bg p-4 text-warning-ink">
          <h2 className="text-base font-bold">
            {p.piecesAComptabiliser} pièce{p.piecesAComptabiliser > 1 ? "s" : ""} à comptabiliser
          </h2>
          <p className="text-sm leading-5">Marly a préparé leurs écritures. Vérifiez-les ou comptabilisez-les d&apos;un coup.</p>
          <Link href="/envoyer/compta" className="flex h-11 items-center justify-center rounded-xl bg-action text-[15px] font-bold text-white hover:bg-action-hover">
            Comptabiliser
          </Link>
        </section>
      )}

      {p.tresorerie && (
        <section aria-labelledby="titre-tresorerie" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 id="titre-tresorerie" className="text-base font-bold text-heading">Trésorerie</h2>
            <strong className="tabular-nums text-heading">
              {formatMontant(p.tresorerie.caisse + p.tresorerie.banque + p.tresorerie.mobileMoney)} FCFA
            </strong>
          </div>
          <dl className="flex flex-col divide-y divide-line text-[15px]">
            {[
              ["Caisse", p.tresorerie.caisse],
              ["Banque", p.tresorerie.banque],
              ["Mobile Money", p.tresorerie.mobileMoney],
            ].map(([nom, valeur]) => (
              <div key={nom} className="flex justify-between py-2">
                <dt className="text-muted">{nom}</dt>
                <dd className="tabular-nums">{formatMontant(Number(valeur))} FCFA</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {p.stock.alertes.length > 0 && (
        <section aria-labelledby="titre-alertes" className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h2 id="titre-alertes" className="px-4 pb-2 pt-4 text-base font-bold text-heading">À réapprovisionner</h2>
          <ul>
            {p.stock.alertes.map((a) => (
              <li key={a.id} className="border-t border-line">
                <Link href={`/envoyer/stock/${encodeURIComponent(a.id)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-survol">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">{a.nom}</span>
                    <span className="text-[13px] text-muted tabular-nums">
                      {formatMontant(a.quantite)} {a.unite} · seuil {formatMontant(a.seuilAlerte)}
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${a.etat === "RUPTURE" ? "bg-danger-bg text-danger-ink" : "bg-warning-bg text-warning-ink"}`}>
                    {a.etat === "RUPTURE" ? "Rupture" : "Stock bas"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/envoyer/stock?filtre=alerte" className="block border-t border-line px-4 py-3 text-sm font-bold text-link">
            Voir le stock
          </Link>
        </section>
      )}

      {p.dernieresVentes.length > 0 && (
        <section aria-labelledby="titre-ventes" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <h2 id="titre-ventes" className="text-base font-bold text-heading">Dernières ventes du jour</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {p.dernieresVentes.map((v) => (
              <li key={v.id} className="flex justify-between gap-3">
                <span className="text-muted tabular-nums">
                  {heure(v.date)} · ticket n°{v.numero} · {MODES[v.mode]}
                </span>
                <span className="tabular-nums">{formatMontant(v.totalTtc)} FCFA</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </CadreTelephone>
  );
}

export default function PageAccueil() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <ContenuAccueil />
    </Suspense>
  );
}