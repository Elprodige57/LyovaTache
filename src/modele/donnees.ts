import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../outils/supabase';
import { loadCache, saveCache } from '../outils/cache';
import { cleanInput } from '../outils/sanitizer';
import type { Workspace, Member, Folder, Board, Column, Label, Task, Automation, Document, ChecklistItem, Notification, Team, MemberAccess, Invitation, AccessScope, AccessRole } from '../modele/types';

export function useWorkspace(workspaceId: string | undefined, refreshKey = 0) {
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadCache<Workspace | null>('workspace_' + (workspaceId ?? ''), null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    supabase.from('workspaces').select('*').eq('id', workspaceId).single()
      .then(({ data }) => { if (data) { setWorkspace(data); saveCache('workspace_' + workspaceId, data); } setLoading(false); });
  }, [workspaceId, refreshKey]);

  return { workspace, loading };
}

// Liste de tous les espaces de travail (pour le sélecteur)
export function useWorkspaces(refreshKey = 0) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => loadCache<Workspace[]>('workspaces_all', []));
  useEffect(() => {
    supabase.from('workspaces').select('*').order('created_at')
      .then(({ data }) => { if (data) { setWorkspaces(data as Workspace[]); saveCache('workspaces_all', data); } });
  }, [refreshKey]);
  return workspaces;
}

// Crée un espace de travail + un membre propriétaire par défaut (pour qu'il soit utilisable)
export async function createWorkspace(name: string) {
  const { data: ws, error } = await supabase.from('workspaces').insert({ name: cleanInput(name), plan: 'Plan Équipe' }).select().single();
  if (ws) {
    await supabase.from('members').insert({ workspace_id: ws.id, name: 'Moi', initials: 'MO', color: '#5b50e8', role: 'Propriétaire' });
  }
  return { data: ws as Workspace | null, error };
}

// Supprime un espace de travail (cascade : membres, dossiers, Bureaux, tâches, étiquettes…)
export async function deleteWorkspace(id: string) {
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  return { error };
}

export async function updateWorkspace(workspaceId: string, updates: { name?: string; plan?: string }) {
  const { error } = await supabase.from('workspaces').update(updates).eq('id', workspaceId);
  return { error };
}

export function useMembers(workspaceId: string | undefined, refreshKey = 0) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    setMembers(loadCache<Member[]>('members_' + workspaceId, []));
    supabase.from('members').select('*').eq('workspace_id', workspaceId).order('created_at')
      .then(({ data }) => { if (data) { setMembers(data); saveCache('members_' + workspaceId, data); } });
  }, [workspaceId, refreshKey]);

  return members;
}

export function useFolders(workspaceId: string | undefined, refreshKey = 0) {
  const [folders, setFolders] = useState<Folder[]>([]);

  const reload = useCallback(() => {
    if (!workspaceId) return;
    setFolders(loadCache<Folder[]>('folders_' + workspaceId, []));
    supabase.from('folders').select('*, boards(*)').eq('workspace_id', workspaceId).order('position')
      .then(({ data }) => {
        if (data) {
          // Masque les Bureaux en corbeille (deleted_at non nul).
          const clean = (data as Folder[]).map((f) => ({ ...f, boards: (f.boards || []).filter((b) => !b.deleted_at) }));
          setFolders(clean);
          saveCache('folders_' + workspaceId, clean);
        }
      });
  }, [workspaceId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { folders, reload };
}

export function useLabels(workspaceId: string | undefined, refreshKey = 0) {
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    setLabels(loadCache<Label[]>('labels_' + workspaceId, []));
    supabase.from('labels').select('*').eq('workspace_id', workspaceId).order('created_at')
      .then(({ data }) => { if (data) { setLabels(data); saveCache('labels_' + workspaceId, data); } });
  }, [workspaceId, refreshKey]);

  return labels;
}

export function useBoard(boardId: string | null, refreshKey = 0) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!boardId) return;
    const cached = loadCache<Board | null>('board_' + boardId, null);
    if (cached) setBoard(cached);
    setLoading(true);
    supabase.from('boards').select(`
      *,
      folder:folders(*),
      board_members(member_id, members(*))
    `).eq('id', boardId).single()
      .then(({ data }) => {
        if (data) {
          const members = (data.board_members || []).map((bm: { members: Member }) => bm.members).filter(Boolean);
          const b = { ...data, members };
          setBoard(b);
          saveCache('board_' + boardId, b);
        }
        setLoading(false);
      });
  }, [boardId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { board, loading, reload };
}

export function useColumns(boardId: string | null, refreshKey = 0) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!boardId) return;
    setColumns(loadCache<Column[]>('columns_' + boardId, []));
    setLoading(true);
    supabase.from('columns').select('*').eq('board_id', boardId).order('position')
      .then(({ data }) => { if (data) { setColumns(data); saveCache('columns_' + boardId, data); } setLoading(false); });
  }, [boardId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { columns, loading, reload };
}

export function useTasks(boardId: string | null, refreshKey = 0) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!boardId) return;
    setTasks(loadCache<Task[]>('tasks_' + boardId, []));
    setLoading(true);
    supabase.from('tasks').select(`
      *,
      task_labels(label_id, labels(*)),
      task_assignees(member_id, members(*)),
      checklist_items(*)
    `).eq('board_id', boardId).order('position')
      .then(({ data }) => {
        if (data) {
          const enriched = data.map((t) => ({
            ...t,
            labels: (t.task_labels || []).map((tl: { labels: Label }) => tl.labels).filter(Boolean),
            assignees: (t.task_assignees || []).map((ta: { members: Member }) => ta.members).filter(Boolean),
            checklist_items: (t.checklist_items || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
          }));
          setTasks(enriched);
          saveCache('tasks_' + boardId, enriched);
        }
        setLoading(false);
      });
  }, [boardId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { tasks, loading, reload };
}

// Type helper is used by sort above, no separate interface needed

export function useTask(taskId: string | null, refreshKey = 0) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!taskId) { setTask(null); return; }
    setLoading(true);
    supabase.from('tasks').select(`
      *,
      task_labels(label_id, labels(*)),
      task_assignees(member_id, members(*)),
      checklist_items(*),
      comments(*, member:members(*))
    `).eq('id', taskId).single()
      .then(({ data }) => {
        if (data) {
          setTask({
            ...data,
            labels: (data.task_labels || []).map((tl: { labels: Label }) => tl.labels).filter(Boolean),
            assignees: (data.task_assignees || []).map((ta: { members: Member }) => ta.members).filter(Boolean),
            checklist_items: (data.checklist_items || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
          });
        }
        setLoading(false);
      });
  }, [taskId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { task, loading, reload };
}

export function useAutomations(workspaceId: string | undefined, refreshKey = 0) {
  const [automations, setAutomations] = useState<Automation[]>([]);

  const reload = useCallback(() => {
    if (!workspaceId) return;
    supabase.from('automations').select('*').eq('workspace_id', workspaceId).order('created_at')
      .then(({ data }) => setAutomations(data || []));
  }, [workspaceId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { automations, reload };
}

export function useDocuments(workspaceId: string | undefined, refreshKey = 0) {
  const [documents, setDocuments] = useState<Document[]>([]);

  const reload = useCallback(() => {
    if (!workspaceId) return;
    supabase.from('documents').select('*, author:members(*)').eq('workspace_id', workspaceId).order('position')
      .then(({ data }) => setDocuments(data || []));
  }, [workspaceId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { documents, reload };
}

// ---- CRUD helpers ----

export async function createTask(payload: {
  column_id: string;
  board_id: string;
  title: string;
  priority?: string;
  due_date?: string | null;
  estimated_hours?: number;
  description?: string | null;
  position?: number;
}) {
  const clean = { ...payload, title: cleanInput(payload.title), description: payload.description ? cleanInput(payload.description) : payload.description };
  const { data, error } = await supabase.from('tasks').insert(clean).select().single();
  return { data, error };
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  const allowed: Record<string, unknown> = {};
  const fields = ['title', 'description', 'priority', 'due_date', 'estimated_hours', 'spent_hours', 'is_blocked', 'block_reason', 'column_id', 'is_done', 'archived_at', 'updated_at'];
  for (const f of fields) {
    if (f in updates) allowed[f] = (updates as Record<string, unknown>)[f];
  }
  allowed['updated_at'] = new Date().toISOString();
  if (typeof allowed.title === 'string') allowed.title = cleanInput(allowed.title as string);
  if (typeof allowed.description === 'string') allowed.description = cleanInput(allowed.description as string);
  const { error } = await supabase.from('tasks').update(allowed).eq('id', taskId);
  return { error };
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  return { error };
}

export async function createColumn(boardId: string, name: string, color: string, position: number) {
  const { data, error } = await supabase.from('columns').insert({ board_id: boardId, name: cleanInput(name), color, position }).select().single();
  return { data, error };
}

export async function updateColumn(colId: string, updates: Partial<Column>) {
  const { error } = await supabase.from('columns').update(updates).eq('id', colId);
  return { error };
}

export async function deleteColumn(colId: string) {
  // Cascade : tâches de la colonne
  const { error } = await supabase.from('columns').delete().eq('id', colId);
  return { error };
}

export async function addComment(taskId: string, memberId: string, content: string) {
  const { data, error } = await supabase.from('comments').insert({ task_id: taskId, member_id: memberId, content: cleanInput(content) }).select('*, member:members(*)').single();
  if (!error) {
    const { error: rpcError } = await supabase.rpc('increment_comments_count', { p_task_id: taskId });
    if (rpcError) {
      // Fallback si la fonction RPC n'existe pas : lecture + incrément manuel
      const { data: t } = await supabase.from('tasks').select('comments_count').eq('id', taskId).single();
      if (t) await supabase.from('tasks').update({ comments_count: (t.comments_count || 0) + 1 }).eq('id', taskId);
    }
  }
  return { data: data as Comment | null, error };
}

export async function addChecklistItem(taskId: string, text: string, position: number) {
  const { data, error } = await supabase.from('checklist_items').insert({ task_id: taskId, text, position, is_done: false }).select().single();
  return { data: data as ChecklistItem | null, error };
}

export async function updateChecklistItem(itemId: string, updates: { is_done?: boolean; text?: string; position?: number }) {
  const { error } = await supabase.from('checklist_items').update(updates).eq('id', itemId);
  return { error };
}

export async function deleteChecklistItem(itemId: string) {
  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);
  return { error };
}

export async function addTaskLabel(taskId: string, labelId: string) {
  const { error } = await supabase.from('task_labels').insert({ task_id: taskId, label_id: labelId });
  return { error };
}

export async function removeTaskLabel(taskId: string, labelId: string) {
  const { error } = await supabase.from('task_labels').delete().eq('task_id', taskId).eq('label_id', labelId);
  return { error };
}

export async function addTaskAssignee(taskId: string, memberId: string) {
  const { error } = await supabase.from('task_assignees').insert({ task_id: taskId, member_id: memberId });
  return { error };
}

export async function removeTaskAssignee(taskId: string, memberId: string) {
  const { error } = await supabase.from('task_assignees').delete().eq('task_id', taskId).eq('member_id', memberId);
  return { error };
}

export async function moveTaskToColumn(taskId: string, newColumnId: string) {
  const { error } = await supabase.from('tasks').update({ column_id: newColumnId, updated_at: new Date().toISOString() }).eq('id', taskId);
  return { error };
}

export async function createDocument(payload: {
  workspace_id: string;
  title: string;
  emoji: string;
  parent_id?: string | null;
  author_id?: string | null;
  position: number;
}) {
  const { data, error } = await supabase.from('documents').insert({ ...payload, content: [] }).select('*, author:members(*)').single();
  return { data, error };
}

export async function updateDocument(docId: string, updates: { title?: string; content?: unknown[]; emoji?: string }) {
  const { error } = await supabase.from('documents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', docId);
  return { error };
}

export async function createAutomation(workspaceId: string, title: string, triggerDesc: string, actionDesc: string) {
  const { data, error } = await supabase.from('automations').insert({
    workspace_id: workspaceId, title, trigger_desc: triggerDesc, action_desc: actionDesc,
  }).select().single();
  return { data, error };
}

export async function updateAutomation(automationId: string, updates: Partial<Automation>) {
  const { error } = await supabase.from('automations').update(updates).eq('id', automationId);
  return { error };
}

export async function createBoard(folderId: string, name: string, color: string, description: string, position: number) {
  const { data, error } = await supabase.from('boards').insert({ folder_id: folderId, name: cleanInput(name), color, description: cleanInput(description), position }).select().single();
  return { data, error };
}

export async function deleteBoard(boardId: string) {
  // Suppression douce : le Bureau part à la corbeille (récupérable 30 jours), toutes ses infos restent.
  const { error } = await supabase.from('boards').update({ deleted_at: new Date().toISOString() }).eq('id', boardId);
  return { error };
}

// Bureaux dans la corbeille (deleted_at non nul) du workspace, avec le nom du dossier.
export function useTrashedBoards(workspaceId: string | undefined, refreshKey = 0) {
  const [boards, setBoards] = useState<Board[]>([]);
  useEffect(() => {
    if (!workspaceId) return;
    supabase.from('boards')
      .select('*, folder:folders!inner(id, name, workspace_id)')
      .eq('folder.workspace_id', workspaceId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .then(({ data }) => { if (data) setBoards(data as Board[]); });
  }, [workspaceId, refreshKey]);
  return boards;
}

export async function restoreBoard(boardId: string) {
  const { error } = await supabase.from('boards').update({ deleted_at: null }).eq('id', boardId);
  return { error };
}

export async function purgeBoard(boardId: string) {
  // Suppression définitive (cascade colonnes/tâches…)
  const { error } = await supabase.from('boards').delete().eq('id', boardId);
  return { error };
}

// Purge automatique des Bureaux en corbeille depuis plus de 30 jours.
export async function purgeExpiredBoards(workspaceId: string) {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase.from('boards')
    .select('id, folder:folders!inner(workspace_id)')
    .eq('folder.workspace_id', workspaceId)
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff);
  const ids = (data || []).map((b) => (b as { id: string }).id);
  if (ids.length) await supabase.from('boards').delete().in('id', ids);
  return ids.length;
}

export async function updateBoard(boardId: string, updates: { name?: string; color?: string; description?: string }) {
  const clean: Record<string, unknown> = {};
  if (updates.name !== undefined) clean.name = cleanInput(updates.name);
  if (updates.color !== undefined) clean.color = updates.color;
  if (updates.description !== undefined) clean.description = cleanInput(updates.description);
  const { error } = await supabase.from('boards').update(clean).eq('id', boardId);
  return { error };
}

export async function createFolder(workspaceId: string, name: string, position: number) {
  const { data, error } = await supabase.from('folders').insert({ workspace_id: workspaceId, name: cleanInput(name), position }).select().single();
  return { data, error };
}

export async function deleteFolder(folderId: string) {
  // Cascade : Bureaux du dossier (et leurs colonnes/tâches)
  const { error } = await supabase.from('folders').delete().eq('id', folderId);
  return { error };
}

export async function updateFolder(folderId: string, updates: { name?: string }) {
  const clean: Record<string, unknown> = {};
  if (updates.name !== undefined) clean.name = cleanInput(updates.name);
  const { error } = await supabase.from('folders').update(clean).eq('id', folderId);
  return { error };
}

export async function createMember(workspaceId: string, name: string, initials: string, color: string, role: string) {
  const { data, error } = await supabase.from('members').insert({ workspace_id: workspaceId, name: cleanInput(name), initials, color, role }).select().single();
  return { data: data as Member | null, error };
}

export async function deleteMember(memberId: string) {
  // Cascade : assignations et appartenances aux Bureaux du membre
  const { error } = await supabase.from('members').delete().eq('id', memberId);
  return { error };
}

export async function addBoardMember(boardId: string, memberId: string) {
  const { error } = await supabase.from('board_members').insert({ board_id: boardId, member_id: memberId });
  return { error };
}

export async function updateMemberPreferredBoard(memberId: string, boardId: string | null) {
  const { error } = await supabase.from('members').update({ preferred_board_id: boardId }).eq('id', memberId);
  return { error };
}

// Tâches de plusieurs Bureaux à la fois (vue « Mes tâches » multi-bureaux)
export function useAllTasks(boardIds: string[], refreshKey = 0) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const key = boardIds.join(',');

  const reload = useCallback(() => {
    if (boardIds.length === 0) { setTasks([]); return; }
    setTasks(loadCache<Task[]>('alltasks_' + key, []));
    supabase.from('tasks').select(`
      *,
      task_labels(label_id, labels(*)),
      task_assignees(member_id, members(*)),
      checklist_items(*)
    `).in('board_id', boardIds).order('position')
      .then(({ data }) => {
        if (data) {
          const enriched = data.map((t) => ({
            ...t,
            labels: (t.task_labels || []).map((tl: { labels: Label }) => tl.labels).filter(Boolean),
            assignees: (t.task_assignees || []).map((ta: { members: Member }) => ta.members).filter(Boolean),
            checklist_items: (t.checklist_items || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
          }));
          setTasks(enriched);
          saveCache('alltasks_' + key, enriched);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  return { tasks };
}

// ── Statistiques : colonnes + tâches (légères) de tous les Bureaux ──
export interface StatColumn { id: string; name: string; board_id: string; }
export interface StatTask {
  id: string; column_id: string; board_id: string;
  created_at: string; updated_at: string; is_done: boolean; assigneeIds: string[];
}

export function useStatsData(boardIds: string[], refreshKey = 0) {
  const key = boardIds.join(',');
  const [data, setData] = useState<{ columns: StatColumn[]; tasks: StatTask[] }>(
    () => loadCache('stats_' + key, { columns: [], tasks: [] })
  );

  useEffect(() => {
    if (boardIds.length === 0) { setData({ columns: [], tasks: [] }); return; }
    let cancelled = false;
    Promise.all([
      supabase.from('columns').select('id,name,board_id').in('board_id', boardIds),
      supabase.from('tasks')
        .select('id,column_id,board_id,created_at,updated_at,is_done,task_assignees(member_id)')
        .in('board_id', boardIds),
    ]).then(([colRes, taskRes]) => {
      if (cancelled) return;
      const columns = (colRes.data || []) as StatColumn[];
      const tasks: StatTask[] = ((taskRes.data || []) as Array<Record<string, unknown>>).map((t) => ({
        id: t.id as string,
        column_id: t.column_id as string,
        board_id: t.board_id as string,
        created_at: t.created_at as string,
        updated_at: t.updated_at as string,
        is_done: Boolean(t.is_done),
        assigneeIds: ((t.task_assignees as Array<{ member_id: string }>) || []).map((a) => a.member_id),
      }));
      const next = { columns, tasks };
      setData(next);
      saveCache('stats_' + key, next);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshKey]);

  return data;
}

// Résout le membre correspondant au compte Supabase Auth connecté.
// 1) déjà lié (auth_id) ; 2) rattaché par email ; 3) sinon provisionné.
export function useCurrentMember(
  authId: string | null,
  email: string | null,
  displayName: string | null,
  workspaceId: string,
  refreshKey = 0,
) {
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!authId) { setMember(null); return; }
    (async () => {
      let { data } = await supabase.from('members').select('*').eq('auth_id', authId).maybeSingle();
      if (!data && email) {
        const byEmail = await supabase.from('members').select('*').eq('email', email).maybeSingle();
        if (byEmail.data) {
          await supabase.from('members').update({ auth_id: authId }).eq('id', byEmail.data.id);
          data = { ...byEmail.data, auth_id: authId };
        }
      }
      if (!data) {
        const base = (displayName?.trim() || email?.split('@')[0] || 'Membre').replace(/[._-]+/g, ' ').trim();
        const initials = base.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
        const colors = ['#5b50e8', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#ec4899'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const ins = await supabase.from('members')
          .insert({ workspace_id: workspaceId, name: base, initials, color, role: 'Membre', email, auth_id: authId })
          .select().single();
        data = ins.data;
      }
      if (!cancelled) setMember((data as Member) ?? null);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authId, email, workspaceId, refreshKey]);

  return member;
}

// ---- Compléments CRUD (suppression / édition) ----
export async function deleteDocument(docId: string) {
  const { error } = await supabase.from('documents').delete().eq('id', docId);
  return { error };
}

export async function deleteAutomation(automationId: string) {
  const { error } = await supabase.from('automations').delete().eq('id', automationId);
  return { error };
}

export async function updateComment(commentId: string, content: string) {
  const { error } = await supabase.from('comments').update({ content: cleanInput(content) }).eq('id', commentId);
  return { error };
}

export async function deleteComment(commentId: string, taskId: string) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (!error) {
    const { data: t } = await supabase.from('tasks').select('comments_count').eq('id', taskId).single();
    if (t) await supabase.from('tasks').update({ comments_count: Math.max(0, (t.comments_count || 0) - 1) }).eq('id', taskId);
  }
  return { error };
}

export async function updateMember(memberId: string, updates: { name?: string; role?: string }) {
  const clean: Record<string, unknown> = {};
  if (updates.name !== undefined) {
    const name = cleanInput(updates.name);
    clean.name = name;
    clean.initials = name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
  }
  if (updates.role !== undefined) clean.role = updates.role;
  const { error } = await supabase.from('members').update(clean).eq('id', memberId);
  return { error };
}

export async function createLabel(workspaceId: string, name: string, color: string) {
  const { data, error } = await supabase.from('labels').insert({ workspace_id: workspaceId, name: cleanInput(name), color }).select().single();
  return { data: data as Label | null, error };
}

export async function updateLabel(labelId: string, updates: { name?: string; color?: string }) {
  const clean: Record<string, unknown> = {};
  if (updates.name !== undefined) clean.name = cleanInput(updates.name);
  if (updates.color !== undefined) clean.color = updates.color;
  const { error } = await supabase.from('labels').update(clean).eq('id', labelId);
  return { error };
}

export async function deleteLabel(labelId: string) {
  const { error } = await supabase.from('labels').delete().eq('id', labelId);
  return { error };
}

// Déplacement de tâche avec position (persiste l'ordre dans la colonne)
export async function moveTaskOrder(taskId: string, columnId: string, position: number) {
  const { error } = await supabase.from('tasks').update({ column_id: columnId, position, updated_at: new Date().toISOString() }).eq('id', taskId);
  return { error };
}

// ---- Notifications ----
export function useNotifications(workspaceId: string | undefined, refreshKey = 0) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    setNotifications(loadCache<Notification[]>('notifications_' + workspaceId, []));
    supabase.from('notifications').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) { setNotifications(data as Notification[]); saveCache('notifications_' + workspaceId, data); } });
  }, [workspaceId, refreshKey]);

  return notifications;
}

export async function createNotification(workspaceId: string, message: string, icon = '🔔', memberId: string | null = null) {
  const { error } = await supabase.from('notifications').insert({ workspace_id: workspaceId, member_id: memberId, icon, message: cleanInput(message) });
  return { error };
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  return { error };
}

export async function markAllNotificationsRead(workspaceId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('workspace_id', workspaceId).eq('is_read', false);
  return { error };
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  return { error };
}

// ════════════════════════════════════════════════════════════
//  ÉQUIPES · ACCÈS · INVITATIONS · MENTIONS
// ════════════════════════════════════════════════════════════

// ── Équipes (services) ──
export function useTeams(workspaceId: string | undefined, refreshKey = 0) {
  const [teams, setTeams] = useState<Team[]>(() => loadCache<Team[]>('teams_' + workspaceId, []));
  useEffect(() => {
    if (!workspaceId) return;
    supabase.from('teams').select('*, team_members(member_id, members(*))').eq('workspace_id', workspaceId).order('created_at')
      .then(({ data }) => {
        if (data) {
          const enriched = data.map((t) => ({
            ...t,
            members: ((t.team_members as Array<{ members: Member }>) || []).map((tm) => tm.members).filter(Boolean),
          })) as Team[];
          setTeams(enriched);
          saveCache('teams_' + workspaceId, enriched);
        }
      });
  }, [workspaceId, refreshKey]);
  return teams;
}

export async function createTeam(workspaceId: string, name: string, service: string, color: string) {
  const { data, error } = await supabase.from('teams')
    .insert({ workspace_id: workspaceId, name: cleanInput(name), service: cleanInput(service), color })
    .select().single();
  return { data: data as Team | null, error };
}

export async function updateTeam(teamId: string, updates: { name?: string; service?: string; color?: string }) {
  const clean: Record<string, unknown> = {};
  if (updates.name !== undefined) clean.name = cleanInput(updates.name);
  if (updates.service !== undefined) clean.service = cleanInput(updates.service);
  if (updates.color !== undefined) clean.color = updates.color;
  const { error } = await supabase.from('teams').update(clean).eq('id', teamId);
  return { error };
}

export async function deleteTeam(teamId: string) {
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  return { error };
}

export async function addTeamMember(teamId: string, memberId: string) {
  const { error } = await supabase.from('team_members').insert({ team_id: teamId, member_id: memberId });
  return { error };
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('member_id', memberId);
  return { error };
}

// ── Accès des membres (périmètre + rôle) ──
export function useMemberAccess(workspaceId: string | undefined, refreshKey = 0) {
  const [rows, setRows] = useState<MemberAccess[]>(() => loadCache<MemberAccess[]>('access_' + workspaceId, []));
  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      supabase.from('member_access').select('*').eq('workspace_id', workspaceId),
      supabase.from('member_folder_access').select('*'),
      supabase.from('member_board_access').select('*'),
    ]).then(([a, f, b]) => {
      const fa = (f.data || []) as Array<{ member_id: string; folder_id: string }>;
      const ba = (b.data || []) as Array<{ member_id: string; board_id: string }>;
      const enriched = ((a.data || []) as Array<Record<string, unknown>>).map((r) => ({
        ...(r as unknown as MemberAccess),
        folderIds: fa.filter((x) => x.member_id === r.member_id).map((x) => x.folder_id),
        boardIds: ba.filter((x) => x.member_id === r.member_id).map((x) => x.board_id),
      })) as MemberAccess[];
      setRows(enriched);
      saveCache('access_' + workspaceId, enriched);
    });
  }, [workspaceId, refreshKey]);
  return rows;
}

export async function setMemberAccess(
  workspaceId: string,
  memberId: string,
  opts: { scope: AccessScope; role: AccessRole; folderIds?: string[]; boardIds?: string[] },
) {
  const { error } = await supabase.from('member_access')
    .upsert({ workspace_id: workspaceId, member_id: memberId, scope: opts.scope, role: opts.role }, { onConflict: 'workspace_id,member_id' });
  await supabase.from('member_folder_access').delete().eq('member_id', memberId);
  if (opts.scope === 'folders' && opts.folderIds?.length) {
    await supabase.from('member_folder_access').insert(opts.folderIds.map((fid) => ({ member_id: memberId, folder_id: fid })));
  }
  await supabase.from('member_board_access').delete().eq('member_id', memberId);
  if (opts.scope === 'boards' && opts.boardIds?.length) {
    await supabase.from('member_board_access').insert(opts.boardIds.map((bid) => ({ member_id: memberId, board_id: bid })));
  }
  return { error };
}

// ── Invitations par email ──
export function useInvitations(workspaceId: string | undefined, refreshKey = 0) {
  const [invitations, setInvitations] = useState<Invitation[]>(() => loadCache<Invitation[]>('invites_' + workspaceId, []));
  useEffect(() => {
    if (!workspaceId) return;
    supabase.from('invitations').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) { setInvitations(data as Invitation[]); saveCache('invites_' + workspaceId, data); }
      });
  }, [workspaceId, refreshKey]);
  return invitations;
}

export async function createInvitation(
  workspaceId: string,
  opts: { email: string; role: AccessRole; scope: AccessScope; folderIds?: string[]; boardIds?: string[]; message?: string; invitedBy?: string | null },
) {
  const { data, error } = await supabase.from('invitations').insert({
    workspace_id: workspaceId,
    email: cleanInput(opts.email),
    role: opts.role,
    scope: opts.scope,
    folder_ids: opts.folderIds ?? [],
    board_ids: opts.boardIds ?? [],
    message: opts.message ? cleanInput(opts.message) : null,
    invited_by: opts.invitedBy ?? null,
  }).select().single();
  return { data: data as Invitation | null, error };
}

export async function updateInvitationStatus(id: string, status: 'pending' | 'accepted' | 'revoked') {
  const { error } = await supabase.from('invitations').update({ status }).eq('id', id);
  return { error };
}

export async function deleteInvitation(id: string) {
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  return { error };
}

// ── Mentions sur tâche (tag → notification dans l'espace perso) ──
export async function addTaskMention(taskId: string, memberId: string) {
  const { error } = await supabase.from('task_mentions').insert({ task_id: taskId, member_id: memberId });
  return { error };
}

// ── Liens documents ↔ tâches / bureaux ──
export type LinkTarget = 'task' | 'board';

export function useDocumentLinks(targetType: LinkTarget, targetId: string | null | undefined, refreshKey = 0) {
  const [docs, setDocs] = useState<Array<Document & { linkId: string }>>([]);
  useEffect(() => {
    if (!targetId) { setDocs([]); return; }
    supabase.from('document_links').select('id, documents(*)').eq('target_type', targetType).eq('target_id', targetId)
      .then(({ data }) => {
        if (data) {
          setDocs((data as Array<{ id: string; documents: Document }>)
            .filter(r => r.documents)
            .map(r => ({ ...r.documents, linkId: r.id })));
        }
      });
  }, [targetType, targetId, refreshKey]);
  return docs;
}

export async function linkDocument(documentId: string, targetType: LinkTarget, targetId: string) {
  const { error } = await supabase.from('document_links').insert({ document_id: documentId, target_type: targetType, target_id: targetId });
  return { error };
}

export async function unlinkDocument(linkId: string) {
  const { error } = await supabase.from('document_links').delete().eq('id', linkId);
  return { error };
}
