-- ============================================================
--  LYOVA TÂCHES — Équipes · Accès · Invitations · Mentions
--  Migration additive (idempotente). RLS ouverte anon+authenticated (mode démo).
-- ============================================================

-- ---------- 1) TABLES ----------

-- Équipes (services) : Dev, Design, Support…
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  service text,
  color text NOT NULL DEFAULT '#5b50e8',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, member_id)
);

-- Accès d'un membre à l'espace : périmètre + rôle
CREATE TABLE IF NOT EXISTS member_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'full' CHECK (scope IN ('full','folders','boards')),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, member_id)
);

CREATE TABLE IF NOT EXISTS member_folder_access (
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, folder_id)
);

CREATE TABLE IF NOT EXISTS member_board_access (
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, board_id)
);

-- Invitations par email (personnes pas encore dans la base)
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','editor','viewer')),
  scope text NOT NULL DEFAULT 'full' CHECK (scope IN ('full','folders','boards')),
  folder_ids uuid[] NOT NULL DEFAULT '{}',
  board_ids uuid[] NOT NULL DEFAULT '{}',
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  invited_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mentions sur tâche (tag + notification)
CREATE TABLE IF NOT EXISTS task_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 2) RLS (ouverte, mode démo — comme setup_full.sql) ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['teams','team_members','member_access','member_folder_access','member_board_access','invitations','task_mentions']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS sel_%1$s ON %1$I', t);
    EXECUTE format('CREATE POLICY sel_%1$s ON %1$I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS ins_%1$s ON %1$I', t);
    EXECUTE format('CREATE POLICY ins_%1$s ON %1$I FOR INSERT TO anon, authenticated WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS upd_%1$s ON %1$I', t);
    EXECUTE format('CREATE POLICY upd_%1$s ON %1$I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS del_%1$s ON %1$I', t);
    EXECUTE format('CREATE POLICY del_%1$s ON %1$I FOR DELETE TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;
