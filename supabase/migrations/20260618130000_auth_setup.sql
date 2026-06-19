-- ============================================================
--  Authentification : lier les membres aux comptes Supabase Auth
-- ============================================================

-- 1) Colonnes de liaison sur les membres
ALTER TABLE members ADD COLUMN IF NOT EXISTS email   text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS auth_id uuid;

-- 2) (optionnel) Rattacher le membre de démo « Camille Royer » à son email connu,
--    pour pouvoir se connecter en tant que propriétaire et retrouver ses tâches.
UPDATE members SET email = 'camille@lyova.tech' WHERE initials = 'CR' AND email IS NULL;

-- 3) IMPORTANT — autoriser les utilisateurs AUTHENTIFIÉS sur toutes les policies.
--    Les policies existantes ne ciblaient que le rôle « anon » ; une fois connecté,
--    l'app utilise le rôle « authenticated » et serait sinon bloquée par la RLS.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO anon, authenticated', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
