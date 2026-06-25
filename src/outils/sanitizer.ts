// Nettoyage des entrées texte (anti-XSS) — repris du projet de l'ami.
// Retire les balises HTML et les espaces superflus.
export function cleanInput(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/<[^>]*>/g, '').trim();
}
