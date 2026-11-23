import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { lireFacture, lireProfilEmetteur, type EmetteurFige } from "@/lib/api";
import { BoutonCopier, BoutonImprimer } from "@/components/boutons-document";
import { DocumentFacture } from "@/components/document-facture";
import { activerPartage, desactiverPartage } from "../../actions-facture";

const NOMBRE = new Intl.NumberFormat("fr-FR");
const PRINCIPAL = "flex h-12 items-center justify-center rounded-xl bg-action px-4 text-[15px] font-bold text-white hover:bg-action-hover";
const SECONDAIRE = "flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface px-4 text-[15px] font-medium text-ink hover:bg-survol";

// Numéro WhatsApp international : 6XX XX XX XX devient 2376XXXXXXXX
function numeroWhatsApp(telephone: string | null): string {
  const chiffres = (telephone ?? "").replace(/\D/g, "");
  if (/^237\d{9}$/.test(chiffres)) return chiffres;
  if (/^6\d{8}$/.test(chiffres)) return `237${chiffres}`;
  return "";
}

async function ContenuDocument({ parametres }: { parametres: Promise<{ id: string }> }) {
  const { id } = await parametres;
  const [facture, profil] = await Promise.all([lireFacture(id), lireProfilEmetteur()]);

  // Une facture émise montre sa copie figée ; un brouillon, la fiche actuelle
  const emetteur: EmetteurFige = facture.emetteur ?? {
    raisonSociale: profil.raisonSociale,
    niu: profil.niu,
    rccm: profil.rccm,
    regime: profil.regime,
    ...profil.fiche,
  };

  const entetes = await headers();
  const origine =
    process.env.MARLY_URL_PUBLIQUE ??
    `${entetes.get("x-forwarded-proto") ?? "http"}://${entetes.get("host") ?? "localhost:3001"}`;
  const lien = facture.jetonPartage ? `${origine}/facture/${facture.jetonPartage}` : null;
  const libelle = facture.type === "AVOIR" ? "l'avoir" : "la facture";
  const message = lien
    ? `Bonjour, voici ${libelle} ${facture.numero} de ${emetteur.raisonSociale}, d'un montant de ${NOMBRE.format(facture.totalTtc)} FCFA : ${lien}`
    : "";
  const whatsapp = `https://wa.me/${numeroWhatsApp(facture.clientDetail.telephone)}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-dvh bg-page pb-10 pt-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] flex-col gap-3 px-3 print:hidden">
        <Link href={`/envoyer/factures/${id}`} className="self-start py-2 text-sm font-bold text-link underline">
          Retour à la facture
        </Link>
        <BoutonImprimer className={facture.statut === "BROUILLON" ? SECONDAIRE : PRINCIPAL} />

        {facture.statut !== "BROUILLON" &&
          (lien ? (
            <section aria-labelledby="titre-partage" className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
              <h2 id="titre-partage" className="text-base font-bold text-heading">Lien pour votre client</h2>
              <p className="break-all rounded-lg bg-sunken px-3 py-2 text-[13px] text-muted">{lien}</p>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center rounded-xl bg-whatsapp px-4 text-[15px] font-bold text-white">
                Envoyer par WhatsApp
              </a>
              <BoutonCopier texte={lien} className={SECONDAIRE} />
              <form action={desactiverPartage}>
                <input type="hidden" name="id" value={facture.id} />
                <button type="submit" className="h-10 w-full text-sm font-medium text-danger-ink underline">
                  Désactiver ce lien
                </button>
              </form>
            </section>
          ) : (
            <form action={activerPartage}>
              <input type="hidden" name="id" value={facture.id} />
              <button type="submit" className={`${SECONDAIRE} w-full`}>
                Créer un lien à envoyer au client
              </button>
            </form>
          ))}
      </div>

      <DocumentFacture document={{ ...facture, client: facture.clientDetail, emetteur }} />
    </div>
  );
}

export default function PageDocumentFacture({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement du document…</p>}>
      <ContenuDocument parametres={params} />
    </Suspense>
  );
}