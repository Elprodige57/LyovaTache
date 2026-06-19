import { z } from 'zod';

// Schémas de validation (repris/adaptés du projet de l'ami) alignés sur notre écran de connexion Supabase.
export const loginSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(6, 'Mot de passe : 6 caractères minimum').max(72),
});

export const signupSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(80),
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(6, 'Mot de passe : 6 caractères minimum').max(72),
});
