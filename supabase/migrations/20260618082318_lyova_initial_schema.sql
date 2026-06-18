
-- Workspaces
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'Plan Équipe',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_workspaces" ON workspaces FOR SELECT TO anon USING (true);
CREATE POLICY "insert_workspaces" ON workspaces FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_workspaces" ON workspaces FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_workspaces" ON workspaces FOR DELETE TO anon USING (true);

-- Members
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  initials text NOT NULL,
  color text NOT NULL DEFAULT '#5b50e8',
  role text NOT NULL DEFAULT 'Membre',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_members" ON members FOR SELECT TO anon USING (true);
CREATE POLICY "insert_members" ON members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_members" ON members FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_members" ON members FOR DELETE TO anon USING (true);

-- Folders
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_folders" ON folders FOR SELECT TO anon USING (true);
CREATE POLICY "insert_folders" ON folders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_folders" ON folders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_folders" ON folders FOR DELETE TO anon USING (true);

-- Boards (Bureaux)
CREATE TABLE boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#5b50e8',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_boards" ON boards FOR SELECT TO anon USING (true);
CREATE POLICY "insert_boards" ON boards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_boards" ON boards FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_boards" ON boards FOR DELETE TO anon USING (true);

-- Board members (junction)
CREATE TABLE board_members (
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (board_id, member_id)
);
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_board_members" ON board_members FOR SELECT TO anon USING (true);
CREATE POLICY "insert_board_members" ON board_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_board_members" ON board_members FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_board_members" ON board_members FOR DELETE TO anon USING (true);

-- Columns
CREATE TABLE columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  position integer NOT NULL DEFAULT 0,
  wip_limit integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_columns" ON columns FOR SELECT TO anon USING (true);
CREATE POLICY "insert_columns" ON columns FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_columns" ON columns FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_columns" ON columns FOR DELETE TO anon USING (true);

-- Labels
CREATE TABLE labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#5b50e8',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_labels" ON labels FOR SELECT TO anon USING (true);
CREATE POLICY "insert_labels" ON labels FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_labels" ON labels FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_labels" ON labels FOR DELETE TO anon USING (true);

-- Tasks
CREATE TABLE tasks (
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
  comments_count integer NOT NULL DEFAULT 0,
  files_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_tasks" ON tasks FOR SELECT TO anon USING (true);
CREATE POLICY "insert_tasks" ON tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_tasks" ON tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_tasks" ON tasks FOR DELETE TO anon USING (true);

-- Task labels
CREATE TABLE task_labels (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  label_id uuid REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_task_labels" ON task_labels FOR SELECT TO anon USING (true);
CREATE POLICY "insert_task_labels" ON task_labels FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_task_labels" ON task_labels FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_task_labels" ON task_labels FOR DELETE TO anon USING (true);

-- Task assignees
CREATE TABLE task_assignees (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, member_id)
);
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_task_assignees" ON task_assignees FOR SELECT TO anon USING (true);
CREATE POLICY "insert_task_assignees" ON task_assignees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_task_assignees" ON task_assignees FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_task_assignees" ON task_assignees FOR DELETE TO anon USING (true);

-- Checklist items
CREATE TABLE checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_checklist_items" ON checklist_items FOR SELECT TO anon USING (true);
CREATE POLICY "insert_checklist_items" ON checklist_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_checklist_items" ON checklist_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_checklist_items" ON checklist_items FOR DELETE TO anon USING (true);

-- Comments
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_comments" ON comments FOR SELECT TO anon USING (true);
CREATE POLICY "insert_comments" ON comments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_comments" ON comments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_comments" ON comments FOR DELETE TO anon USING (true);

-- Automations
CREATE TABLE automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  trigger_desc text NOT NULL,
  action_desc text NOT NULL,
  runs_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_automations" ON automations FOR SELECT TO anon USING (true);
CREATE POLICY "insert_automations" ON automations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_automations" ON automations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_automations" ON automations FOR DELETE TO anon USING (true);

-- Documents
CREATE TABLE documents (
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
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_documents" ON documents FOR SELECT TO anon USING (true);
CREATE POLICY "insert_documents" ON documents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_documents" ON documents FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_documents" ON documents FOR DELETE TO anon USING (true);
