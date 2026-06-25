-- ============================================================
--  DURCISSEMENT RLS — chacun ne voit/modifie que les espaces dont il est membre.
--  Accès réservé au rôle `authenticated` (la clé anon seule ne lit plus rien).
--  Helpers en SECURITY DEFINER pour éviter la récursion sur `members`.
-- ============================================================

create or replace function app_is_ws_member(ws uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from members m where m.workspace_id = ws and m.auth_id = auth.uid());
$$;
create or replace function app_ws_of_folder(f uuid) returns uuid
  language sql security definer stable set search_path = public as $$ select workspace_id from folders where id = f; $$;
create or replace function app_ws_of_board(b uuid) returns uuid
  language sql security definer stable set search_path = public as $$ select app_ws_of_folder(folder_id) from boards where id = b; $$;
create or replace function app_ws_of_task(t uuid) returns uuid
  language sql security definer stable set search_path = public as $$ select app_ws_of_board(board_id) from tasks where id = t; $$;
create or replace function app_ws_of_team(t uuid) returns uuid
  language sql security definer stable set search_path = public as $$ select workspace_id from teams where id = t; $$;
create or replace function app_ws_of_document(d uuid) returns uuid
  language sql security definer stable set search_path = public as $$ select workspace_id from documents where id = d; $$;

grant execute on function app_is_ws_member(uuid), app_ws_of_folder(uuid), app_ws_of_board(uuid), app_ws_of_task(uuid), app_ws_of_team(uuid), app_ws_of_document(uuid) to authenticated, anon;

-- Tables scopées par appartenance (prédicat sur les colonnes de la ligne)
do $$
declare i int; t text; p text;
  arr text[][] := array[
    ['folders','app_is_ws_member(workspace_id)'],
    ['labels','app_is_ws_member(workspace_id)'],
    ['automations','app_is_ws_member(workspace_id)'],
    ['documents','app_is_ws_member(workspace_id)'],
    ['notifications','app_is_ws_member(workspace_id)'],
    ['teams','app_is_ws_member(workspace_id)'],
    ['member_access','app_is_ws_member(workspace_id)'],
    ['invitations','app_is_ws_member(workspace_id)'],
    ['boards','app_is_ws_member(app_ws_of_folder(folder_id))'],
    ['columns','app_is_ws_member(app_ws_of_board(board_id))'],
    ['tasks','app_is_ws_member(app_ws_of_board(board_id))'],
    ['task_labels','app_is_ws_member(app_ws_of_task(task_id))'],
    ['task_assignees','app_is_ws_member(app_ws_of_task(task_id))'],
    ['checklist_items','app_is_ws_member(app_ws_of_task(task_id))'],
    ['comments','app_is_ws_member(app_ws_of_task(task_id))'],
    ['board_members','app_is_ws_member(app_ws_of_board(board_id))'],
    ['team_members','app_is_ws_member(app_ws_of_team(team_id))'],
    ['member_folder_access','app_is_ws_member(app_ws_of_folder(folder_id))'],
    ['member_board_access','app_is_ws_member(app_ws_of_board(board_id))'],
    ['task_mentions','app_is_ws_member(app_ws_of_task(task_id))'],
    ['document_links','app_is_ws_member(app_ws_of_document(document_id))']
  ];
begin
  for i in 1 .. array_length(arr,1) loop
    t := arr[i][1]; p := arr[i][2];
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists sel_%1$s on %1$I', t);
    execute format('drop policy if exists ins_%1$s on %1$I', t);
    execute format('drop policy if exists upd_%1$s on %1$I', t);
    execute format('drop policy if exists del_%1$s on %1$I', t);
    execute format('create policy sel_%1$s on %1$I for select to authenticated using (%2$s)', t, p);
    execute format('create policy ins_%1$s on %1$I for insert to authenticated with check (%2$s)', t, p);
    execute format('create policy upd_%1$s on %1$I for update to authenticated using (%2$s) with check (%2$s)', t, p);
    execute format('create policy del_%1$s on %1$I for delete to authenticated using (%2$s)', t, p);
  end loop;
end $$;

-- workspaces : membre pour voir/modifier ; tout authentifié peut en créer un
alter table workspaces enable row level security;
drop policy if exists sel_workspaces on workspaces;
drop policy if exists ins_workspaces on workspaces;
drop policy if exists upd_workspaces on workspaces;
drop policy if exists del_workspaces on workspaces;
create policy sel_workspaces on workspaces for select to authenticated using (app_is_ws_member(id));
create policy ins_workspaces on workspaces for insert to authenticated with check (auth.uid() is not null);
create policy upd_workspaces on workspaces for update to authenticated using (app_is_ws_member(id)) with check (app_is_ws_member(id));
create policy del_workspaces on workspaces for delete to authenticated using (app_is_ws_member(id));

-- members : voir les membres de ses espaces, sa propre fiche, ou son invitation (email non lié)
alter table members enable row level security;
drop policy if exists sel_members on members;
drop policy if exists ins_members on members;
drop policy if exists upd_members on members;
drop policy if exists del_members on members;
create policy sel_members on members for select to authenticated
  using (app_is_ws_member(workspace_id) or auth_id = auth.uid() or (auth_id is null and email = auth.email()));
create policy ins_members on members for insert to authenticated
  with check (app_is_ws_member(workspace_id) or auth_id = auth.uid());
create policy upd_members on members for update to authenticated
  using (app_is_ws_member(workspace_id) or auth_id = auth.uid() or (auth_id is null and email = auth.email()))
  with check (app_is_ws_member(workspace_id) or auth_id = auth.uid());
create policy del_members on members for delete to authenticated using (app_is_ws_member(workspace_id));
