import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';

interface MyTasksProps {
  tasks: Task[];
  currentMemberId: string;
}

const TODAY_DATE = new Date('2026-06-18');
const PRIO_COLORS: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#94a3b8',
};

type GroupMode = 'date' | 'priority';

export function MyTasks({ tasks, currentMemberId }: MyTasksProps) {
  const app = useApp();
  const [groupMode, setGroupMode] = useState<GroupMode>('date');

  const myTasks = tasks.filter(t =>
    (t.assignees || []).some(a => a.id === currentMemberId) && !t.archived_at
  );

  const done = myTasks.filter(t => t.is_done);
  const active = myTasks.filter(t => !t.is_done);

  const bucketDate = (t: Task): number => {
    if (!t.due_date) return 2;
    const d = new Date(t.due_date);
    if (d <= TODAY_DATE) return 0;
    const diff = (d.getTime() - TODAY_DATE.getTime()) / 86400000;
    if (diff <= 6) return 1;
    return 2;
  };

  const dateGroups = [
    { name: 'En retard / Aujourd\'hui', color: '#ef4444', index: 0 },
    { name: 'Cette semaine', color: '#f59e0b', index: 1 },
    { name: 'Plus tard', color: '#94a3b8', index: 2 },
  ].map(g => ({ ...g, tasks: active.filter(t => bucketDate(t) === g.index) })).filter(g => g.tasks.length > 0);

  const prioGroups = [
    { name: 'Urgent', color: PRIO_COLORS.urgent, prio: 'urgent' as const },
    { name: 'Haute', color: PRIO_COLORS.high, prio: 'high' as const },
    { name: 'Moyenne', color: PRIO_COLORS.medium, prio: 'medium' as const },
    { name: 'Basse', color: PRIO_COLORS.low, prio: 'low' as const },
  ].map(g => ({ ...g, tasks: active.filter(t => t.priority === g.prio) })).filter(g => g.tasks.length > 0);

  const groups = groupMode === 'date' ? dateGroups : prioGroups;

  const handleToggleDone = (e: React.MouseEvent, t: Task) => {
    e.stopPropagation();
    app.toggleTaskDone(t.id, t.is_done);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 28px 40px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sub2)' }}>Grouper par</div>
          <div style={{ display: 'flex', background: 'var(--soft)', borderRadius: 8, padding: 3 }}>
            {(['date', 'priority'] as const).map(m => {
              const active = groupMode === m;
              return (
                <div key={m} onClick={() => setGroupMode(m)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: active ? 'var(--ink)' : 'var(--sub2)', background: active ? 'var(--panel)' : 'transparent', boxShadow: active ? 'var(--shadow)' : 'none', transition: 'all .1s' }}>
                  {m === 'date' ? 'Échéance' : 'Priorité'}
                </div>
              );
            })}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--sub2)' }}>
            {active.length} active{active.length > 1 ? 's' : ''} · {done.length} terminée{done.length > 1 ? 's' : ''}
          </div>
        </div>

        {groups.map(g => (
          <div key={g.name} style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: g.color }} />
              <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{g.name}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sub2)', background: 'var(--soft2)', borderRadius: 6, padding: '1px 8px' }}>{g.tasks.length}</span>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {g.tasks.map((t, i) => {
                const overdue = t.due_date && new Date(t.due_date) < TODAY_DATE;
                const lbl = (t.labels || [])[0];
                return (
                  <div
                    key={t.id}
                    onClick={() => app.openTask(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                      borderBottom: i < g.tasks.length - 1 ? '1px solid var(--line)' : 'none',
                      cursor: 'pointer', transition: 'background .1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Completion circle */}
                    <div
                      onClick={e => handleToggleDone(e, t)}
                      title={t.is_done ? 'Marquer non terminée' : 'Marquer terminée'}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                        border: `2px solid ${t.is_done ? '#10b981' : PRIO_COLORS[t.priority] ?? '#94a3b8'}`,
                        background: t.is_done ? '#10b981' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .15s',
                      }}
                    >
                      {t.is_done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4 4L19 6" /></svg>}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)', textDecoration: t.is_done ? 'line-through' : 'none', opacity: t.is_done ? 0.6 : 1 }}>{t.title}</span>
                    {lbl && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: lbl.color + '1e', color: lbl.color, flexShrink: 0 }}>{lbl.name}</span>
                    )}
                    <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: overdue ? '#dc2626' : 'var(--sub)', minWidth: 74, textAlign: 'right', flexShrink: 0 }}>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Completed tasks section */}
        {done.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M9 11l3 3L22 4" /></svg>
              <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Terminées</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sub2)', background: 'rgba(16,185,129,0.12)', borderRadius: 6, padding: '1px 8px' }}>{done.length}</span>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)', opacity: 0.7 }}>
              {done.map((t, i) => (
                <div key={t.id} onClick={() => app.openTask(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < done.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div onClick={e => handleToggleDone(e, t)} style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: '2px solid #10b981', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4 4L19 6" /></svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--sub)', textDecoration: 'line-through' }}>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && done.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--sub2)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Aucune tâche assignée</p>
          </div>
        )}
      </div>
    </div>
  );
}
