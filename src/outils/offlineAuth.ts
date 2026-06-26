// Déverrouillage HORS-LIGNE (sécurisé).
// Au login en ligne réussi, on mémorise un *vérificateur* du mot de passe (PBKDF2-SHA256,
// salé, 150 000 itérations) — JAMAIS le mot de passe en clair. Hors-ligne, on compare le
// code saisi à ce vérificateur pour autoriser l'accès aux données en cache.
// Supabase reste l'autorité quand le réseau est là ; ceci n'est qu'un sas local.

const KEY = 'lyova_offline';
const ITER = 150_000;

export interface OfflineCredential { email: string; name: string; authId: string; salt: string; verifier: string; }

function b64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
function unb64(s: string): Uint8Array { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

async function derive(password: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(saltB64), iterations: ITER, hash: 'SHA-256' }, keyMat, 256);
  return b64(new Uint8Array(bits));
}

export async function saveOfflineCredential(email: string, name: string, authId: string, password: string) {
  try {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const verifier = await derive(password, salt);
    localStorage.setItem(KEY, JSON.stringify({ email: email.trim().toLowerCase(), name, authId, salt, verifier }));
  } catch { /* crypto indisponible : on ignore (pas de déverrouillage hors-ligne) */ }
}

export function loadOfflineCredential(): OfflineCredential | null {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) as OfflineCredential : null; } catch { return null; }
}

export function clearOfflineCredential() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Renvoie la crédential si l'email + mot de passe correspondent au vérificateur local, sinon null.
export async function verifyOffline(email: string, password: string): Promise<OfflineCredential | null> {
  const c = loadOfflineCredential();
  if (!c || c.email !== email.trim().toLowerCase()) return null;
  try {
    const v = await derive(password, c.salt);
    return v === c.verifier ? c : null;
  } catch { return null; }
}
