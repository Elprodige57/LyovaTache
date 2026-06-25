import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCache, saveCache } from './cache';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  });
});

describe('cache local', () => {
  it('round-trip save → load', () => {
    saveCache('x', { a: 1, b: [2, 3] });
    expect(loadCache('x', null)).toEqual({ a: 1, b: [2, 3] });
  });
  it('retourne le fallback si la clé est absente', () => {
    expect(loadCache('absent', 'def')).toBe('def');
  });
  it('retourne le fallback si le JSON est corrompu', () => {
    store.set('lyova_cache_bad', '{pas du json');
    expect(loadCache('bad', [])).toEqual([]);
  });
});
