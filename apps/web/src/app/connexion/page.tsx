import { Suspense } from "react";
import { FormulaireConnexion } from "./formulaire";

export default function PageConnexion() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-marly-bord bg-white p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="16" fill="#10294A" />
            <path
              d="M16 46V31a8 8 0 0 1 16 0v15M32 31a8 8 0 0 1 16 0v15"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="15" r="5" fill="#2BB673" />
          </svg>
          <h1 className="text-2xl font-bold text-marly-bleu">Connexion à Marly</h1>
          <p className="text-sm text-marly-gris">Comptabilité connectée</p>
        </div>

        <Suspense fallback={null}>
          <FormulaireConnexion />
        </Suspense>
      </div>
    </main>
  );
}