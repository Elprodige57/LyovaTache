// Cache local (localStorage) des données serveur, pour la lecture hors-ligne.
// On lit le cache au démarrage / changement d'id, puis on rafraîchit depuis le réseau.
// Hors-ligne, la requête échoue → on conserve les dernières données connues.
const PREFIX = 'lyova_cache_';

export function loadCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota dépassé ou sérialisation impossible : on ignore */
  }
}
