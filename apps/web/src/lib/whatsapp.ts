// Numéro WhatsApp international : 6XX XX XX XX devient 2376XXXXXXXX ; inconnu → chaîne vide
export function numeroWhatsApp(telephone: string | null): string {
  const chiffres = (telephone ?? "").replace(/\D/g, "");
  if (/^237\d{9}$/.test(chiffres)) return chiffres;
  if (/^6\d{8}$/.test(chiffres)) return `237${chiffres}`;
  return "";
}

// Sans numéro, WhatsApp propose de choisir le contact
export function lienWhatsApp(telephone: string | null, message: string): string {
  return `https://wa.me/${numeroWhatsApp(telephone)}?text=${encodeURIComponent(message)}`;
}