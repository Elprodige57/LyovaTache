// Couche données — Statistiques (colonnes + tâches légères de tous les Bureaux).
import { useEffect, useState } from 'react';
import { supabase } from '../outils/supabase';
import { loadCache, saveCache } from '../outils/cache';

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
