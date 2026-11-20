import type { ReactNode, SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function Trait({ children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconeTableau(props: Props) {
  return (
    <Trait {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Trait>
  );
}

export function IconeValider(props: Props) {
  return (
    <Trait {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 15l2 2 4-4" />
    </Trait>
  );
}

export function IconeDossiers(props: Props) {
  return (
    <Trait {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Trait>
  );
}

export function IconeExport(props: Props) {
  return (
    <Trait {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </Trait>
  );
}

export function IconeEquipe(props: Props) {
  return (
    <Trait {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </Trait>
  );
}

export function IconePlus(props: Props) {
  return (
    <Trait strokeWidth={2.4} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Trait>
  );
}

export function IconeSortie(props: Props) {
  return (
    <Trait {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Trait>
  );
}

// Le monogramme Marly ; « inverse » le cercle d'un filet blanc pour les fonds bleu nuit
export function Monogramme({ taille = 36, inverse = false }: { taille?: number; inverse?: boolean }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 64 64" aria-hidden="true">
      {inverse ? (
        <rect x="1" y="1" width="62" height="62" rx="16" fill="#10294A" stroke="#FFFFFF" strokeWidth="2" />
      ) : (
        <rect width="64" height="64" rx="16" fill="#10294A" />
      )}
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
  );
}


export function IconeAppareil(props: Props) {
  return (
    <Trait {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Trait>
  );
}

export function IconePiece(props: Props) {
  return (
    <Trait {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </Trait>
  );
}

export function IconeProfil(props: Props) {
  return (
    <Trait {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Trait>
  );
}

export function IconeHorloge(props: Props) {
  return (
    <Trait {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </Trait>
  );
}

export function IconeCheck(props: Props) {
  return (
    <Trait strokeWidth={2.4} {...props}>
      <path d="M20 6L9 17l-5-5" />
    </Trait>
  );
}

export function IconeHorsLigne(props: Props) {
  return (
    <Trait {...props}>
      <path d="M2 8.8a15 15 0 0 1 20 0" />
      <path d="M5 12.5a10 10 0 0 1 14 0" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <path d="M3 3l18 18" />
    </Trait>
  );
}

export function IconeRetour(props: Props) {
  return (
    <Trait {...props}>
      <path d="M15 18l-6-6 6-6" />
    </Trait>
  );
}

export function IconeEnvoyer(props: Props) {
  return (
    <Trait {...props}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4z" />
    </Trait>
  );
}