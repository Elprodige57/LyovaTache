// Personnalisation locale (stockage interne, sans base) : fond d'écran + sons de notification.

// ───────────────────── Fond d'écran ─────────────────────
// On stocke la valeur CSS `background` à appliquer derrière l'app (vide = thème par défaut).
const BG_KEY = 'lyova_bg';

export interface BgPreset { id: string; label: string; value: string; swatch: string; }

export const BG_PRESETS: BgPreset[] = [
  { id: 'default', label: 'Défaut', value: '', swatch: 'var(--bg)' },
  { id: 'indigo', label: 'Indigo', value: 'linear-gradient(135deg,#1e1b4b,#4338ca)', swatch: 'linear-gradient(135deg,#1e1b4b,#4338ca)' },
  { id: 'ocean', label: 'Océan', value: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)', swatch: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)' },
  { id: 'sunset', label: 'Coucher', value: 'linear-gradient(135deg,#7c2d12,#f59e0b)', swatch: 'linear-gradient(135deg,#7c2d12,#f59e0b)' },
  { id: 'forest', label: 'Forêt', value: 'linear-gradient(135deg,#064e3b,#10b981)', swatch: 'linear-gradient(135deg,#064e3b,#10b981)' },
  { id: 'slate', label: 'Ardoise', value: 'linear-gradient(160deg,#0f172a,#334155)', swatch: 'linear-gradient(160deg,#0f172a,#334155)' },
  { id: 'rose', label: 'Rose', value: 'linear-gradient(135deg,#831843,#ec4899)', swatch: 'linear-gradient(135deg,#831843,#ec4899)' },
];

export function loadBg(): string {
  try { return localStorage.getItem(BG_KEY) || ''; } catch { return ''; }
}

// Applique le fond (vide = retour au thème) et le mémorise.
export function applyBg(value: string) {
  try { localStorage.setItem(BG_KEY, value); } catch { /* ignore */ }
  if (value) document.documentElement.style.setProperty('--lyova-bg', value);
  else document.documentElement.style.removeProperty('--lyova-bg');
}

// À appeler au démarrage pour restaurer le fond choisi.
export function initBg() {
  const v = loadBg();
  if (v) document.documentElement.style.setProperty('--lyova-bg', v);
}

export function bgFromImageUrl(url: string): string {
  return `url("${url.replace(/"/g, '')}") center / cover no-repeat fixed`;
}

// ───────────────────── Sons de notification ─────────────────────
const SND_KEY = 'lyova_sound';
export type SoundId = 'off' | 'soft' | 'bell' | 'pop' | 'custom';
export interface SoundPreset { id: SoundId; label: string; }

export const SOUND_PRESETS: SoundPreset[] = [
  { id: 'off', label: 'Aucun' },
  { id: 'soft', label: 'Doux' },
  { id: 'bell', label: 'Cloche' },
  { id: 'pop', label: 'Pop' },
  { id: 'custom', label: 'Fichier (URL)' },
];

export function loadSound(): { id: SoundId; url: string } {
  try {
    const raw = localStorage.getItem(SND_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { id: 'soft', url: '' };
}

export function saveSound(id: SoundId, url = '') {
  try { localStorage.setItem(SND_KEY, JSON.stringify({ id, url })); } catch { /* ignore */ }
}

// Joue le son choisi. Les presets sont synthétisés (Web Audio) → aucun fichier requis.
export function playSound(id: SoundId, url = '') {
  try {
    if (id === 'off') return;
    if (id === 'custom') { if (url) void new Audio(url).play().catch(() => {}); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = id === 'bell' ? 880 : id === 'pop' ? 520 : 660;
    osc.type = id === 'pop' ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (id === 'bell' ? 0.5 : 0.25));
    osc.start(t);
    osc.stop(t + (id === 'bell' ? 0.55 : 0.3));
    osc.onended = () => ctx.close();
  } catch { /* audio indisponible / bloqué */ }
}

export function playCurrentSound() {
  const s = loadSound();
  playSound(s.id, s.url);
}
