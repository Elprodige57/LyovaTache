import { supabase } from './supabase';

// Format d'échange d'un Bureau (export/import JSON).
export interface BoardExport {
  version: number;
  exportedAt: string;
  board: { name: string; description: string | null; color: string };
  columns: Array<{
    name: string;
    color: string;
    position: number;
    wip_limit: number;
    tasks: Array<{
      title: string;
      description: string | null;
      priority: string;
      due_date: string | null;
      estimated_hours: number;
      spent_hours: number;
      position: number;
      is_blocked: boolean;
      block_reason: string | null;
      is_done: boolean;
      labels: string[];
      checklist: Array<{ text: string; is_done: boolean }>;
    }>;
  }>;
}

interface RawTask {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  estimated_hours: number;
  spent_hours: number;
  position: number;
  is_blocked: boolean;
  block_reason: string | null;
  is_done: boolean;
  task_labels?: Array<{ labels: { name: string } | null }>;
  checklist_items?: Array<{ text: string; is_done: boolean; position: number }>;
}

// ---- Export ----
export async function exportBoard(boardId: string): Promise<BoardExport> {
  const { data: board } = await supabase.from('boards').select('name, description, color').eq('id', boardId).single();
  const { data: columns } = await supabase.from('columns').select('id, name, color, position, wip_limit').eq('board_id', boardId).order('position');
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, task_labels(labels(name)), checklist_items(text, is_done, position)')
    .eq('board_id', boardId)
    .order('position');

  const rawTasks = (tasks ?? []) as unknown as RawTask[];
  const cols = (columns ?? []).map((c) => ({
    name: c.name,
    color: c.color,
    position: c.position,
    wip_limit: c.wip_limit,
    tasks: rawTasks.filter((t) => t.column_id === c.id).map((t) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      due_date: t.due_date,
      estimated_hours: t.estimated_hours,
      spent_hours: t.spent_hours,
      position: t.position,
      is_blocked: t.is_blocked,
      block_reason: t.block_reason,
      is_done: t.is_done,
      labels: (t.task_labels ?? []).map((tl) => tl.labels?.name).filter((n): n is string => !!n),
      checklist: (t.checklist_items ?? []).slice().sort((a, b) => a.position - b.position).map((ci) => ({ text: ci.text, is_done: ci.is_done })),
    })),
  }));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    board: { name: board?.name ?? 'Bureau', description: board?.description ?? null, color: board?.color ?? '#5b50e8' },
    columns: cols,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Import ----
export async function importBoard(workspaceId: string, data: BoardExport): Promise<string | null> {
  if (!data || !Array.isArray(data.columns)) throw new Error('Fichier JSON invalide (colonnes manquantes).');

  // Dossier d'accueil : premier dossier existant, sinon « Importés »
  let folderId: string;
  const { data: folders } = await supabase.from('folders').select('id').eq('workspace_id', workspaceId).order('position').limit(1);
  if (folders && folders.length) {
    folderId = folders[0].id;
  } else {
    const { data: f } = await supabase.from('folders').insert({ workspace_id: workspaceId, name: 'Importés', position: 0 }).select().single();
    if (!f) return null;
    folderId = f.id;
  }

  const { data: board } = await supabase.from('boards').insert({
    folder_id: folderId,
    name: `${data.board?.name ?? 'Bureau'} (importé)`,
    description: data.board?.description ?? null,
    color: data.board?.color ?? '#5b50e8',
    position: 99,
  }).select().single();
  if (!board) return null;

  // Étiquettes existantes du workspace (mappées par nom)
  const { data: wsLabels } = await supabase.from('labels').select('id, name').eq('workspace_id', workspaceId);
  const labelMap = new Map<string, string>((wsLabels ?? []).map((l) => [l.name as string, l.id as string]));

  for (const col of data.columns) {
    const { data: c } = await supabase.from('columns').insert({
      board_id: board.id,
      name: col.name,
      color: col.color ?? '#64748b',
      position: col.position ?? 0,
      wip_limit: col.wip_limit ?? 0,
    }).select().single();
    if (!c) continue;

    for (const t of col.tasks ?? []) {
      const { data: task } = await supabase.from('tasks').insert({
        column_id: c.id,
        board_id: board.id,
        title: t.title,
        description: t.description ?? null,
        priority: t.priority ?? 'medium',
        due_date: t.due_date ?? null,
        estimated_hours: t.estimated_hours ?? 0,
        spent_hours: t.spent_hours ?? 0,
        position: t.position ?? 0,
        is_blocked: t.is_blocked ?? false,
        block_reason: t.block_reason ?? null,
        is_done: t.is_done ?? false,
      }).select().single();
      if (!task) continue;

      for (const lname of t.labels ?? []) {
        const lid = labelMap.get(lname);
        if (lid) await supabase.from('task_labels').insert({ task_id: task.id, label_id: lid });
      }
      const items = t.checklist ?? [];
      for (let i = 0; i < items.length; i++) {
        await supabase.from('checklist_items').insert({ task_id: task.id, text: items[i].text, is_done: items[i].is_done, position: i });
      }
    }
  }

  return board.id;
}
