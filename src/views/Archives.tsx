import React from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';

interface ArchivesViewProps {
  tasks: Task[];
}

const PRIO_COLORS: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#94a3b8',
};

export function ArchivesView({ tasks }: ArchivesViewProps) {
  const app = useApp();
  const archived = tasks.filter(t => t.archived_at);
  const sorted = [...archived].sort((a, b) => new Date(b.archived_at || 0).getTime() - new Date(a.archived_at || 0).getTime());

  const handleRestore = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    app.restoreTask(taskId);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 28px 40px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--ink)' }}>Archives</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sub2)', background: 'var(--soft2)', borderRadius: 6, padding: '2px 10px' }}>{sorted.length} tâche{sorted.length > 1 ? 's' : ''}</span>
        </div>

        {sorted.length > 0 ? (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            {sorted.map((t, i) => {
              const lbl = (t.labels || [])[0];
              return (
                <div
                  key={t.id}
                  onClick={() => app.openTask(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < sorted.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', transition: 'background .1s', opacity: 0.75 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${PRIO_COLORS[t.priority] ?? '#94a3b8'}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)', textDecoration: 'line-through' }}>{t.title}</span>
                  {lbl && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: lbl.color + '1e', color: lbl.color, flexShrink: 0 }}>{lbl.name}</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--sub2)', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
                    {t.archived_at ? new Date(t.archived_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                  <button
                    onClick={e => handleRestore(e, t.id)}
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Restaurer
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--sub2)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block' }}>
              <path d="M3 4h18v5H3z" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" /><path d="M10 13h4" />
            </svg>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink2)' }}>Archives vides</p>
            <p style={{ fontSize: 14 }}>Les tâches archivées apparaîtront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}
