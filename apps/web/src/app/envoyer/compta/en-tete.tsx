import Link from "next/link";
import { IconeRetour } from "@/components/icones";

export function EnTeteCompta({ titre, retour = "/envoyer/compta" }: { titre: string; retour?: string }) {
  return (
    <div className="-ml-2 flex items-center gap-1">
      <Link
        href={retour}
        aria-label="Retour"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-survol"
      >
        <IconeRetour width={22} height={22} />
      </Link>
      <h1 className="min-w-0 truncate text-xl font-bold text-heading">{titre}</h1>
    </div>
  );
}

export function formatJourCourt(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}