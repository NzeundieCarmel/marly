// File d'attente des pièces envoyées sans réseau, gardée dans le navigateur (IndexedDB)

const NOM_BASE = "marly-hors-ligne";
const NOM_TABLE = "pieces";

export interface PieceEnAttente {
  id: string;
  dossierId: string;
  date: string;
  montantTtc: string;
  fournisseur: string;
  categorie: string;
  fichier: Blob;
  nomFichier: string;
  creeLe: number;
}

export interface ResultatSynchro {
  envoyees: number;
  refusees: number;
  restantes: number;
  sessionExpiree: boolean;
}

function ouvrirBase(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(NOM_BASE, 1);
    demande.onupgradeneeded = () => {
      demande.result.createObjectStore(NOM_TABLE, { keyPath: "id" });
    };
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
}

async function executer<T>(
  mode: IDBTransactionMode,
  action: (table: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const base = await ouvrirBase();
  return new Promise((resoudre, rejeter) => {
    const transaction = base.transaction(NOM_TABLE, mode);
    const demande = action(transaction.objectStore(NOM_TABLE));
    transaction.oncomplete = () => {
      base.close();
      resoudre(demande.result);
    };
    transaction.onerror = () => {
      base.close();
      rejeter(transaction.error);
    };
  });
}

export function listerEnAttente(): Promise<PieceEnAttente[]> {
  return executer("readonly", (table) => table.getAll() as IDBRequest<PieceEnAttente[]>);
}

function retirerEnAttente(id: string): Promise<undefined> {
  return executer("readwrite", (table) => table.delete(id));
}

// Garde sur le téléphone une pièce qui n'a pas pu partir
export async function mettreEnAttente(donnees: FormData): Promise<void> {
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    throw new Error("Fichier manquant");
  }
  const piece: PieceEnAttente = {
    id: crypto.randomUUID(),
    dossierId: String(donnees.get("dossierId") ?? ""),
    date: String(donnees.get("date") ?? ""),
    montantTtc: String(donnees.get("montantTtc") ?? ""),
    fournisseur: String(donnees.get("fournisseur") ?? ""),
    categorie: String(donnees.get("categorie") ?? ""),
    fichier,
    nomFichier: fichier.name,
    creeLe: Date.now(),
  };
  await executer("readwrite", (table) => table.put(piece));
}

function versFormData(piece: PieceEnAttente): FormData {
  const donnees = new FormData();
  donnees.set("dossierId", piece.dossierId);
  donnees.set("date", piece.date);
  donnees.set("montantTtc", piece.montantTtc);
  if (piece.fournisseur) donnees.set("fournisseur", piece.fournisseur);
  donnees.set("categorie", piece.categorie);
  donnees.set("fichier", piece.fichier, piece.nomFichier);
  return donnees;
}

let synchroEnCours = false;

// Renvoie les pièces en attente, de la plus ancienne à la plus récente
export async function synchroniser(): Promise<ResultatSynchro> {
  const resultat: ResultatSynchro = {
    envoyees: 0,
    refusees: 0,
    restantes: 0,
    sessionExpiree: false,
  };

  if (synchroEnCours) {
    resultat.restantes = (await listerEnAttente()).length;
    return resultat;
  }
  synchroEnCours = true;

  try {
    const pieces = (await listerEnAttente()).sort((a, b) => a.creeLe - b.creeLe);

    for (const piece of pieces) {
      let statut: number;
      try {
        const reponse = await fetch("/api/pieces", {
          method: "POST",
          body: versFormData(piece),
        });
        statut = reponse.status;
      } catch {
        break; // Toujours pas de réseau : on réessaiera plus tard
      }

      if (statut === 401) {
        resultat.sessionExpiree = true;
        break;
      }
      if (statut === 201 || statut === 409) {
        // 409 : déjà arrivée au cabinet lors d'un essai précédent
        await retirerEnAttente(piece.id);
        resultat.envoyees += 1;
        continue;
      }
      if (statut === 400 || statut === 404 || statut === 413) {
        // Refus définitif (format, taille, dossier) : inutile de réessayer
        await retirerEnAttente(piece.id);
        resultat.refusees += 1;
        continue;
      }
      break; // Serveur indisponible (503…) : on réessaiera plus tard
    }

    resultat.restantes = (await listerEnAttente()).length;
    return resultat;
  } finally {
    synchroEnCours = false;
  }
}