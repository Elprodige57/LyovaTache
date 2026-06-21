import { describe, it, expect } from 'vitest';
import { cleanInput } from './sanitizer';

describe('cleanInput', () => {
  it('retire les balises HTML (anti-XSS)', () => {
    expect(cleanInput('<b>hello</b>')).toBe('hello');
    expect(cleanInput('<script>alert(1)</script>x')).toBe('alert(1)x');
    expect(cleanInput('<img src=x onerror=alert(1)>texte')).toBe('texte');
  });
  it('supprime les espaces de début/fin', () => {
    expect(cleanInput('  salut  ')).toBe('salut');
  });
  it('gère null / undefined / vide', () => {
    expect(cleanInput(null)).toBe('');
    expect(cleanInput(undefined)).toBe('');
    expect(cleanInput('')).toBe('');
  });
  it('conserve le texte normal (accents, chiffres)', () => {
    expect(cleanInput('Tâche n°123 — prête')).toBe('Tâche n°123 — prête');
  });
});
