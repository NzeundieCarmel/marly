// Réduit une photo sur le téléphone, avant l'envoi : moins de données mobiles, envoi plus rapide.
// En cas de doute (PDF, image déjà légère, navigateur incapable), le fichier d'origine est renvoyé tel quel.

const COTE_MAX = 1800;
const QUALITE = 0.8;
const SEUIL_OCTETS = 400 * 1024;

export async function compresserImage(fichier: File): Promise<File> {
  if (!/^image\/(jpeg|png)$/.test(fichier.type) || fichier.size <= SEUIL_OCTETS) return fichier;
  if (typeof createImageBitmap !== "function") return fichier;

  try {
    // « from-image » respecte l'orientation enregistrée par l'appareil photo
    const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
    const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
    const largeur = Math.round(image.width * echelle);
    const hauteur = Math.round(image.height * echelle);

    const toile = document.createElement("canvas");
    toile.width = largeur;
    toile.height = hauteur;
    const contexte = toile.getContext("2d");
    if (!contexte) {
      image.close();
      return fichier;
    }
    // Fond blanc : une capture PNG transparente reste lisible une fois en JPEG
    contexte.fillStyle = "#ffffff";
    contexte.fillRect(0, 0, largeur, hauteur);
    contexte.drawImage(image, 0, 0, largeur, hauteur);
    image.close();

    const blob = await new Promise<Blob | null>((resoudre) => toile.toBlob(resoudre, "image/jpeg", QUALITE));
    if (!blob || blob.size >= fichier.size) return fichier;

    const nom = `${fichier.name.replace(/\.[^.]+$/, "") || "piece"}.jpg`;
    return new File([blob], nom, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return fichier;
  }
}

export function formatTaille(octets: number): string {
  if (octets >= 1024 * 1024) return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(octets / 1024))} Ko`;
}