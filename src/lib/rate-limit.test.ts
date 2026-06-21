import { describe, it, expect, beforeEach } from 'vitest';
import { isRateLimited, resetRateLimit } from './rate-limit';

describe('isRateLimited', () => {
  beforeEach(() => { resetRateLimit('k'); resetRateLimit('a'); resetRateLimit('b'); });

  it('autorise 5 tentatives puis bloque la 6e', () => {
    for (let i = 0; i < 5; i++) expect(isRateLimited('k')).toBe(false);
    expect(isRateLimited('k')).toBe(true);
  });

  it('resetRateLimit débloque la clé', () => {
    for (let i = 0; i < 6; i++) isRateLimited('k');
    resetRateLimit('k');
    expect(isRateLimited('k')).toBe(false);
  });

  it('les clés sont indépendantes', () => {
    for (let i = 0; i < 6; i++) isRateLimited('a');
    expect(isRateLimited('b')).toBe(false);
  });
});
