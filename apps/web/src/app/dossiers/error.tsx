"use client";

export default function ErreurDossiers({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-marly-bleu">Dossiers indisponibles</h1>
      <p className="text-marly-gris">
        Marly n&apos;arrive pas à joindre l&apos;API. Vérifie que la fenêtre 2 (API NestJS)
        tourne bien, puis réessaie.
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-11 w-fit rounded-xl bg-marly-bleu px-5 font-bold text-white"
      >
        Réessayer
      </button>
    </main>
  );
}