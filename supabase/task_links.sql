-- Liens de tâches inter-bureaux : une tâche peut être "liée" à un autre Bureau
-- (même d'un autre espace) → elle apparaît dans la colonne spéciale « Liée » du Bureau cible.
CREATE TABLE IF NOT EXISTS task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  target_board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, target_board_id)
);
CREATE INDEX IF NOT EXISTS idx_task_links_target ON task_links (target_board_id);
-- RLS : voir/supprimer si membre de l'espace de la tâche OU du Bureau cible ;
--       créer si membre des DEUX côtés. (cf. supabase/rls_durcissement.sql)
