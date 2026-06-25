import * as api from '../modele/donnees';

// File d'attente des écritures faites hors-ligne, rejouées au retour du réseau.
// Stratégie v1 : « dernier écrit gagne », rejeu dans l'ordre.
export interface QueuedOp {
  id: string;
  fn: string;
  args: unknown[];
  at: number;
}

const KEY = 'lyova_sync_queue';
type Listener = (size: number) => void;
const listeners = new Set<Listener>();

// Registre des écritures rejouables (nom → fonction de useData).
/* eslint-disable @typescript-eslint/no-explicit-any */
const REGISTRY: Record<string, (...args: any[]) => Promise<unknown>> = {
  createTask: (p) => api.createTask(p),
  updateTask: (id, u) => api.updateTask(id, u),
  deleteTask: (id) => api.deleteTask(id),
  moveTaskToColumn: (id, c) => api.moveTaskToColumn(id, c),
  moveTaskOrder: (id, c, p) => api.moveTaskOrder(id, c, p),
  createColumn: (b, n, c, p) => api.createColumn(b, n, c, p),
  addComment: (t, m, c) => api.addComment(t, m, c),
  updateChecklistItem: (i, u) => api.updateChecklistItem(i, u),
  // Édition de structure / contenu — rejouée au retour du réseau (offline élargi)
  updateColumn: (id, u) => api.updateColumn(id, u),
  deleteColumn: (id) => api.deleteColumn(id),
  updateBoard: (id, u) => api.updateBoard(id, u),
  updateFolder: (id, u) => api.updateFolder(id, u),
  updateDocument: (id, u) => api.updateDocument(id, u),
  deleteDocument: (id) => api.deleteDocument(id),
  updateAutomation: (id, u) => api.updateAutomation(id, u),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function load(): QueuedOp[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as QueuedOp[]; } catch { return []; }
}
function save(q: QueuedOp[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* quota */ }
  listeners.forEach((l) => l(q.length));
}

export function getQueueSize(): number { return load().length; }

export function subscribeQueue(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function enqueue(fn: string, args: unknown[]): void {
  const q = load();
  q.push({ id: Math.random().toString(36).slice(2), fn, args, at: Date.now() });
  save(q);
}

// Exécute en ligne, sinon (hors-ligne ou échec réseau) met en file.
export async function runOrQueue(fn: string, args: unknown[]): Promise<{ queued: boolean }> {
  const run = REGISTRY[fn];
  if (!run) throw new Error('Opération inconnue: ' + fn);
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueue(fn, args);
    return { queued: true };
  }
  try {
    await run(...args);
    return { queued: false };
  } catch {
    enqueue(fn, args);
    return { queued: true };
  }
}

// Rejoue la file dans l'ordre ; s'arrête au 1er échec (réseau encore KO). Renvoie le nb rejoué.
export async function flushQueue(): Promise<number> {
  let q = load();
  let flushed = 0;
  while (q.length) {
    const op = q[0];
    const run = REGISTRY[op.fn];
    try {
      if (run) await run(...op.args);
      flushed++;
      q = q.slice(1);
      save(q);
    } catch {
      break;
    }
  }
  return flushed;
}
