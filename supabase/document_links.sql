-- Liens documents ↔ tâches / bureaux (ex. rattacher un CDC à une tâche ou un Bureau).
CREATE TABLE IF NOT EXISTS document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('task','board')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_doclinks_target ON document_links (target_type, target_id);
-- RLS ouverte (anon + authenticated), comme le reste du schéma démo.
