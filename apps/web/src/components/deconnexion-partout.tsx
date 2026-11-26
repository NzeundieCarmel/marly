import { deconnecterPartout } from "@/app/connexion/actions-securite";

export function DeconnexionPartout({ retour, tutoiement = false }: { retour: string; tutoiement?: boolean }) {
  return (
    <form action={deconnecterPartout} className="flex flex-col gap-1.5">
      <input type="hidden" name="retour" value={retour} />
      <button
        type="submit"
        className="h-12 w-full rounded-xl border border-danger-ink bg-surface text-[15px] font-medium text-danger-ink hover:bg-danger-bg"
      >
        Se déconnecter de tous les appareils
      </button>
      <span className="text-[13px] leading-[19px] text-muted">
        {tutoiement
          ? "Utile si tu as perdu un téléphone ou utilisé un ordinateur partagé. Il faudra te reconnecter partout, ici aussi."
          : "Utile si vous avez perdu un téléphone ou utilisé un ordinateur partagé. Il faudra vous reconnecter partout, ici aussi."}
      </span>
    </form>
  );
}