import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from './auth';

describe('loginSchema', () => {
  it('valide un login correct', () => {
    expect(loginSchema.safeParse({ email: 'a@b.fr', password: 'secret1' }).success).toBe(true);
  });
  it('rejette un email invalide', () => {
    expect(loginSchema.safeParse({ email: 'pasunemail', password: 'secret1' }).success).toBe(false);
  });
  it('rejette un mot de passe trop court (< 6)', () => {
    expect(loginSchema.safeParse({ email: 'a@b.fr', password: '123' }).success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('valide une inscription correcte', () => {
    expect(signupSchema.safeParse({ name: 'Léa', email: 'a@b.fr', password: 'secret1' }).success).toBe(true);
  });
  it('rejette un nom vide', () => {
    expect(signupSchema.safeParse({ name: '', email: 'a@b.fr', password: 'secret1' }).success).toBe(false);
  });
});
