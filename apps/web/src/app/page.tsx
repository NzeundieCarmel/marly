import Link from "next/link";

export default function Accueil() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <svg width="96" height="96" viewBox="0 0 64 64" role="img" aria-label="Logo Marly">
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
        <h1 className="text-4xl font-bold text-marly-bleu">Marly</h1>
        <p className="text-lg text-marly-gris">Comptabilité connectée</p>
        <Link
          href="/dossiers"
          className="mt-2 flex h-12 items-center rounded-xl bg-marly-bleu px-6 font-bold text-white"
        >
          Voir les dossiers du cabinet
        </Link>
      </div>
    </main>
  );
}