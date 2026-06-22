-- ============================================================
--  Lyova Tâches — installation COMPLÈTE sur une base Supabase neuve
--  À coller en une fois dans : Supabase → SQL Editor → New query → Run
--  (idempotent : ré-exécutable sans casse)
-- ============================================================

-- ---------- 1) SCHÉMA ----------
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'Plan Équipe',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  initials text NOT NULL,
  color text NOT NULL DEFAULT '#5b50e8',
  role text NOT NULL DEFAULT 'Membre',
  email text,
  auth_id uuid,
  preferred_board_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#5b50e8',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_members (
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (board_id, member_id)
);

CREATE TABLE IF NOT EXISTS columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  position integer NOT NULL DEFAULT 0,
  wip_limit integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#5b50e8',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid REFERENCES columns(id) ON DELETE CASCADE,
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent','high','medium','low')),
  due_date date,
  estimated_hours integer NOT NULL DEFAULT 0,
  spent_hours integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  is_done boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  comments_count integer NOT NULL DEFAULT 0,
  files_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_labels (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  label_id uuid REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, member_id)
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  trigger_desc text NOT NULL,
  action_desc text NOT NULL,
  runs_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '📄',
  content jsonb NOT NULL DEFAULT '[]',
  author_id uuid REFERENCES members(id),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  icon text NOT NULL DEFAULT '🔔',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ---------- 2) SÉCURITÉ (RLS ouverte à anon + authenticated) ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['workspaces','members','folders','boards','board_members','columns','labels','tasks','task_labels','task_assignees','checklist_items','comments','automations','documents','notifications']
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

-- ---------- 3) DONNÉES DE DÉMO (identifiants fixes attendus par l'app) ----------
INSERT INTO workspaces (id, name, plan) VALUES
  ('00000000-0000-0000-0000-000000000001','Lyova Tech','Plan Équipe')
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, workspace_id, name, initials, color, role, email) VALUES
  ('00000000-0000-0000-0001-000000000001','00000000-0000-0000-0000-000000000001','Camille Royer','CR','#5b50e8','Propriétaire','camille@lyova.tech'),
  ('00000000-0000-0000-0001-000000000002','00000000-0000-0000-0000-000000000001','Hugo Berthier','HB','#0ea5e9','Membre','hugo@lyova.tech'),
  ('00000000-0000-0000-0001-000000000003','00000000-0000-0000-0000-000000000001','Naïma Lefèvre','NL','#f43f5e','Membre','naima@lyova.tech'),
  ('00000000-0000-0000-0001-000000000004','00000000-0000-0000-0000-000000000001','Tomas Costa','TC','#10b981','Membre','tomas@lyova.tech'),
  ('00000000-0000-0000-0001-000000000005','00000000-0000-0000-0000-000000000001','Élise Marchand','EM','#f59e0b','Membre','elise@lyova.tech')
ON CONFLICT (id) DO NOTHING;

INSERT INTO folders (id, workspace_id, name, position) VALUES
  ('00000000-0000-0000-0002-000000000001','00000000-0000-0000-0000-000000000001','Lyova Tech',0)
ON CONFLICT (id) DO NOTHING;

-- Le board MAIN attendu par l'app (mode démo y atterrit directement)
INSERT INTO boards (id, folder_id, name, description, color, position) VALUES
  ('00000000-0000-0000-0003-000000000001','00000000-0000-0000-0002-000000000001','Refonte Plateforme','Refonte du produit — du schéma à la PWA.','#5b50e8',0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO board_members (board_id, member_id) VALUES
  ('00000000-0000-0000-0003-000000000001','00000000-0000-0000-0001-000000000001'),
  ('00000000-0000-0000-0003-000000000001','00000000-0000-0000-0001-000000000002'),
  ('00000000-0000-0000-0003-000000000001','00000000-0000-0000-0001-000000000003'),
  ('00000000-0000-0000-0003-000000000001','00000000-0000-0000-0001-000000000004')
ON CONFLICT DO NOTHING;

INSERT INTO columns (id, board_id, name, color, position, wip_limit) VALUES
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0003-000000000001','À faire','#5b50e8',0,0),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0003-000000000001','En cours','#0ea5e9',1,4),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0003-000000000001','En revue','#8b5cf6',2,3),
  ('00000000-0000-0000-0005-000000000004','00000000-0000-0000-0003-000000000001','Terminé','#10b981',3,0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO labels (id, workspace_id, name, color) VALUES
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0000-000000000001','Urgent','#ef4444'),
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0000-000000000001','Design','#8b5cf6'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0000-000000000001','Backend','#0ea5e9'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0000-000000000001','Frontend','#10b981'),
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0000-000000000001','Infra','#f59e0b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (id, column_id, board_id, title, priority, due_date, estimated_hours, spent_hours, position, is_done) VALUES
  ('00000000-0000-0000-0007-000000000001','00000000-0000-0000-0005-000000000001','00000000-0000-0000-0003-000000000001','Configurer le monorepo','medium','2026-06-26',5,1,0,false),
  ('00000000-0000-0000-0007-000000000002','00000000-0000-0000-0005-000000000001','00000000-0000-0000-0003-000000000001','Maquettes Figma du Kanban','high','2026-06-24',6,2,1,false),
  ('00000000-0000-0000-0007-000000000003','00000000-0000-0000-0005-000000000002','00000000-0000-0000-0003-000000000001','Authentification Argon2id + sessions','urgent','2026-06-23',16,11,0,false),
  ('00000000-0000-0000-0007-000000000004','00000000-0000-0000-0005-000000000002','00000000-0000-0000-0003-000000000001','Drag & drop des cartes','high','2026-06-25',8,5,1,false),
  ('00000000-0000-0000-0007-000000000005','00000000-0000-0000-0005-000000000003','00000000-0000-0000-0003-000000000001','Vue Agenda (calendrier)','medium','2026-06-27',7,2,0,false),
  ('00000000-0000-0000-0007-000000000006','00000000-0000-0000-0005-000000000004','00000000-0000-0000-0003-000000000001','Migration PostgreSQL','low',NULL,4,4,0,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO task_labels (task_id, label_id) VALUES
  ('00000000-0000-0000-0007-000000000001','00000000-0000-0000-0006-000000000003'),
  ('00000000-0000-0000-0007-000000000002','00000000-0000-0000-0006-000000000002'),
  ('00000000-0000-0000-0007-000000000003','00000000-0000-0000-0006-000000000003'),
  ('00000000-0000-0000-0007-000000000003','00000000-0000-0000-0006-000000000001'),
  ('00000000-0000-0000-0007-000000000004','00000000-0000-0000-0006-000000000004'),
  ('00000000-0000-0000-0007-000000000005','00000000-0000-0000-0006-000000000004')
ON CONFLICT DO NOTHING;

INSERT INTO task_assignees (task_id, member_id) VALUES
  ('00000000-0000-0000-0007-000000000003','00000000-0000-0000-0001-000000000001'),
  ('00000000-0000-0000-0007-000000000003','00000000-0000-0000-0001-000000000002'),
  ('00000000-0000-0000-0007-000000000002','00000000-0000-0000-0001-000000000003'),
  ('00000000-0000-0000-0007-000000000004','00000000-0000-0000-0001-000000000002'),
  ('00000000-0000-0000-0007-000000000001','00000000-0000-0000-0001-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO automations (id, workspace_id, title, trigger_desc, action_desc, runs_count, is_active) VALUES
  ('00000000-0000-0000-0008-000000000001','00000000-0000-0000-0000-000000000001','Escalade urgences','Priorité = Urgente','Notifier les assignés',12,true)
ON CONFLICT (id) DO NOTHING;
