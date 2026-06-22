import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loadCache, saveCache } from '../lib/cache';
import { cleanInput } from '../lib/sanitizer';
import type { Workspace, Member, Folder, Board, Column, Label, Task, Automation, Document, ChecklistItem, Notification } from '../types';

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
      .then(({ data }) => { if (data) { setFolders(data); saveCache('folders_' + workspaceId, data); } });
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

export async function updateChecklistItem(itemId: string, updates: { is_done?: boolean; text?: string }) {
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
  // Cascade : colonnes, tâches, étiquettes/assignés/sous-tâches/commentaires liés
  const { error } = await supabase.from('boards').delete().eq('id', boardId);
  return { error };
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
