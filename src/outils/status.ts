// Catégorie de statut d'une colonne (À faire / En cours / Terminé).
// La colonne est la source de vérité du statut dans un Kanban.
// Stockée côté navigateur aujourd'hui ; passera en base demain (champ sur `columns`).
export type Status = 'todo' | 'progress' | 'done';

const KEY = 'lyova_colcat';

export function loadColCats(): Record<string, Status> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function setColCat(colId: string, s: Status) {
  const m = loadColCats();
  m[colId] = s;
  localStorage.setItem(KEY, JSON.stringify(m));
}

// Repli heuristique sur le nom, tant qu'une colonne n'a pas été catégorisée manuellement.
function guess(name: string): Status {
  const n = (name || '').toLowerCase();
  if (/ferm|termin|done|fini|livr/.test(n)) return 'done';
  if (/cours|revue|progress|review|doing|test|valid/.test(n)) return 'progress';
  return 'todo';
}

export function columnStatus(col: { id: string; name: string }, cats: Record<string, Status> = loadColCats()): Status {
  return cats[col.id] ?? guess(col.name);
}

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  todo: { label: 'À faire', color: '#94a3b8' },
  progress: { label: 'En cours', color: '#f59e0b' },
  done: { label: 'Terminé', color: '#10b981' },
};

export const STATUS_ORDER: Status[] = ['todo', 'progress', 'done'];
