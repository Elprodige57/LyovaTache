-- Bureau préféré par membre : à l'ouverture de l'app, l'utilisateur arrive directement dessus.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS preferred_board_id uuid REFERENCES boards(id) ON DELETE SET NULL;
