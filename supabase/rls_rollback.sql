-- ROLLBACK du durcissement RLS : ré-ouvre l'accès (anon + authenticated, USING true).
-- À exécuter UNIQUEMENT si le durcissement bloque l'application en production.
do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','members','folders','boards','board_members','columns','labels',
    'tasks','task_labels','task_assignees','checklist_items','comments','automations',
    'documents','notifications','teams','team_members','member_access',
    'member_folder_access','member_board_access','invitations','task_mentions','document_links'
  ]
  loop
    execute format('drop policy if exists sel_%1$s on %1$I', t);
    execute format('drop policy if exists ins_%1$s on %1$I', t);
    execute format('drop policy if exists upd_%1$s on %1$I', t);
    execute format('drop policy if exists del_%1$s on %1$I', t);
    execute format('create policy sel_%1$s on %1$I for select to anon, authenticated using (true)', t);
    execute format('create policy ins_%1$s on %1$I for insert to anon, authenticated with check (true)', t);
    execute format('create policy upd_%1$s on %1$I for update to anon, authenticated using (true) with check (true)', t);
    execute format('create policy del_%1$s on %1$I for delete to anon, authenticated using (true)', t);
  end loop;
end $$;
