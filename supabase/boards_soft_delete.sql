-- Corbeille des Bureaux : suppression douce (récupérable 30 jours).
-- Un Bureau "supprimé" garde deleted_at ; toutes ses infos (colonnes/tâches…) restent intactes.
ALTER TABLE boards ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_boards_deleted_at ON boards (deleted_at);
