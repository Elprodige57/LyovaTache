import React, { useState, useRef } from 'react';
import type { Column, Task, Member } from '../types';
import { useApp } from '../context/AppContext';

const PRIO_COLORS: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#94a3b8',
};

const TODAY_DATE = new Date().getDate();

const COL_COLORS = ['#5b50e8','#0ea5e9','#10b981','#f59e0b','#f43f5e','#8b5cf6','#14b8a6','#64748b'];

interface KanbanProps {
  columns: Column[];
  tasks: Task[];
  members: Member[];
}

type DisplayCol = { id: string; name: string; color: string; wip_limit: number; kind: 'status' | 'priority' | 'assignee' };

export function Kanban({ columns, tasks, members }: KanbanProps) {
  const app = useApp();
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [addingCardColId, setAddingCardColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [savingCol, setSavingCol] = useState(false);
  const newColInputRef = useRef<HTMLInputElement>(null);
  const newCardInputRef = useRef<HTMLInputElement>(null);

  const activeBoardId = app.activeBoardId ?? '00000000-0000-0000-0003-000000000001';

  const getGroupTasks = (col: DisplayCol) => {
    return tasks
      .filter(t => {
        if (app.filterLabelIds.length > 0 && !(t.labels || []).some(l => app.filterLabelIds.includes(l.id))) return false;
        if (col.kind === 'priority') return t.priority === col.id;
        if (col.kind === 'assignee') {
          const ass = t.assignees || [];
          return col.id === '__none__' ? ass.length === 0 : ass.some(a => a.id === col.id);
        }
        const override = app.taskOverrides[t.id];
        const colId2 = override?.column_id ?? t.column_id;
        return colId2 === col.id;
      })
      .sort((a, b) => {
        switch (app.sortMode) {
          case 'due': {
            const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
            const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
            return da - db || a.position - b.position;
          }
          case 'priority': {
            const rank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || a.position - b.position;
          }
          case 'title':
            return a.title.localeCompare(b.title, 'fr') || a.position - b.position;
          default:
            return a.position - b.position;
        }
      });
  };

  const handleDrop = (col: DisplayCol) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragTaskId) {
      if (col.kind === 'priority') {
        app.patchTask(dragTaskId, { priority: col.id as 'urgent' | 'high' | 'medium' | 'low' });
      } else if (col.kind === 'assignee') {
        if (col.id !== '__none__') app.addTaskAssignee(dragTaskId, col.id);
      } else {
        // Statut : position = fin de la colonne cible (l'ordre est persisté)
        const targetTasks = tasks.filter(t => (app.taskOverrides[t.id]?.column_id ?? t.column_id) === col.id && t.id !== dragTaskId);
        const maxPos = targetTasks.reduce((m, t) => Math.max(m, t.position), -1);
        app.moveTaskTo(dragTaskId, col.id, maxPos + 1);
      }
    }
    setDragTaskId(null);
    setDragOverColId(null);
  };

  const handleAddCard = async (colId: string) => {
    const t = newCardTitle.trim();
    if (!t || savingCard) return;
    setSavingCard(true);
    await app.addTask(colId, activeBoardId, t);
    setNewCardTitle('');
    setAddingCardColId(null);
    setSavingCard(false);
  };

  const handleAddCol = async () => {
    const n = newColName.trim();
    if (!n || savingCol) return;
    setSavingCol(true);
    const color = COL_COLORS[columns.length % COL_COLORS.length];
    await app.addColumn(activeBoardId, n, color);
    setNewColName('');
    setAddingCol(false);
    setSavingCol(false);
  };

  const moveColumn = async (colId: string, dir: 'left' | 'right') => {
    const sorted = [...columns].sort((a, b) => a.position - b.position);
    const i = sorted.findIndex(c => c.id === colId);
    const j = dir === 'left' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[i], b = sorted[j];
    await app.updateColumn(a.id, { position: b.position });
    await app.updateColumn(b.id, { position: a.position });
  };

  const openAddCard = (colId: string) => {
    setAddingCardColId(colId);
    setNewCardTitle('');
    setTimeout(() => newCardInputRef.current?.focus(), 50);
  };

  const openAddCol = () => {
    setAddingCol(true);
    setNewColName('');
    setTimeout(() => newColInputRef.current?.focus(), 50);
  };

  const PRIO_GROUPS: DisplayCol[] = [
    { id: 'urgent', name: 'Urgente', color: '#ef4444', wip_limit: 0, kind: 'priority' },
    { id: 'high', name: 'Haute', color: '#f97316', wip_limit: 0, kind: 'priority' },
    { id: 'medium', name: 'Moyenne', color: '#6366f1', wip_limit: 0, kind: 'priority' },
    { id: 'low', name: 'Basse', color: '#94a3b8', wip_limit: 0, kind: 'priority' },
  ];
  const displayColumns: DisplayCol[] =
    app.groupMode === 'priority' ? PRIO_GROUPS
      : app.groupMode === 'assignee'
        ? [{ id: '__none__', name: 'Non assigné', color: '#94a3b8', wip_limit: 0, kind: 'assignee' }, ...members.map(m => ({ id: m.id, name: m.name, color: m.color, wip_limit: 0, kind: 'assignee' as const }))]
        : columns.map(c => ({ id: c.id, name: c.name, color: c.color, wip_limit: c.wip_limit, kind: 'status' as const }));

  return (
    <div style={{
      position: 'absolute', inset: 0,
      overflowX: 'auto', overflowY: 'hidden',
      padding: 'var(--board-pad)',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', gap: 'var(--col-gap)', alignItems: 'flex-start', height: '100%', minWidth: 'max-content' }}>
        {displayColumns.map(col => {
          const colTasks = getGroupTasks(col);
          const over = dragOverColId === col.id;
          const wipOver = col.wip_limit > 0 && colTasks.length > col.wip_limit;
          const wipPct = col.wip_limit > 0 ? Math.min(100, colTasks.length / col.wip_limit * 100) : 0;
          const isAddingHere = addingCardColId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); if (dragOverColId !== col.id) setDragOverColId(col.id); }}
              onDrop={handleDrop(col)}
              style={{
                width: 'var(--col-w)', flexShrink: 0,
                background: 'var(--panel2)', border: '1px solid var(--line)',
                borderRadius: 14, maxHeight: '100%',
                display: 'flex', flexDirection: 'column',
                boxShadow: over ? `inset 0 0 0 2px var(--accent)` : 'none',
                transition: 'box-shadow .12s',
              }}
            >
              {/* Column header */}
              <div style={{ padding: 'var(--col-head-pad)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: col.color }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--ink)' }}>{col.name}</span>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700,
                    color: wipOver ? '#ef4444' : (col.wip_limit > 0 ? col.color : 'var(--sub)'),
                    background: wipOver ? 'rgba(239,68,68,0.12)' : 'var(--soft2)',
                    borderRadius: 6, padding: '1px 7px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {col.wip_limit > 0 ? `${colTasks.length} / ${col.wip_limit}` : String(colTasks.length)}
                  </span>
                  {col.kind === 'status' && (<>
                  <div onClick={() => moveColumn(col.id, 'left')} title="Déplacer la colonne à gauche" style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--sub2)', padding: 2, borderRadius: 5, transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft2)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                  </div>
                  <div onClick={() => moveColumn(col.id, 'right')} title="Déplacer la colonne à droite" style={{ cursor: 'pointer', color: 'var(--sub2)', padding: 2, borderRadius: 5, transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft2)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                  <div
                    onClick={() => openAddCard(col.id)}
                    title="Ajouter une carte"
                    style={{ cursor: 'pointer', color: 'var(--sub2)', padding: 2, borderRadius: 5, transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <div
                    onClick={() => {
                      const n = prompt('Nom de la colonne', col.name);
                      if (n === null) return;
                      const w = prompt('Limite WIP (0 = aucune)', String(col.wip_limit ?? 0));
                      const wip = w === null ? (col.wip_limit ?? 0) : (parseInt(w, 10) || 0);
                      app.updateColumn(col.id, { name: n.trim() || col.name, wip_limit: Math.max(0, wip) });
                    }}
                    title="Modifier la colonne (nom, limite WIP)"
                    style={{ cursor: 'pointer', color: 'var(--sub2)', padding: 2, borderRadius: 5, transition: 'all .1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft2)'; e.currentTarget.style.color = 'var(--accent-ink)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sub2)'; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                  </div>
                  <div
                    onClick={() => { if (confirm(`Supprimer la colonne « ${col.name} » et ses ${colTasks.length} tâche(s) ? Action irréversible.`)) app.deleteColumn(col.id); }}
                    title="Supprimer la colonne"
                    style={{ cursor: 'pointer', color: 'var(--sub2)', padding: 2, borderRadius: 5, transition: 'all .1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sub2)'; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </div>
                  </>)}
                </div>
                <div style={{ height: 3, background: 'var(--soft2)', borderRadius: 3, marginTop: 9, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${wipPct}%`,
                    background: wipOver ? '#ef4444' : col.color,
                    borderRadius: 3, transition: 'width .3s',
                  }} />
                </div>
              </div>

              {/* Tasks */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '3px 8px var(--card-gap)', display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={dragTaskId === task.id}
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={() => { setDragTaskId(null); setDragOverColId(null); }}
                    onClick={() => app.openTask(task.id)}
                  />
                ))}

                {/* Inline card add form */}
                {isAddingHere ? (
                  <div style={{ background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 10, padding: '8px 10px', boxShadow: 'var(--shadow)' }}>
                    <textarea
                      ref={newCardInputRef as unknown as React.RefObject<HTMLTextAreaElement>}
                      value={newCardTitle}
                      onChange={e => setNewCardTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(col.id); }
                        if (e.key === 'Escape') { setAddingCardColId(null); }
                      }}
                      placeholder="Titre de la tâche…"
                      rows={2}
                      style={{
                        width: '100%', border: 'none', outline: 'none',
                        fontSize: 13.5, fontWeight: 600, resize: 'none',
                        background: 'transparent', color: 'var(--ink)',
                        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                        lineHeight: 1.4,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                      <button
                        onClick={() => handleAddCard(col.id)}
                        disabled={!newCardTitle.trim() || savingCard}
                        style={{
                          background: 'var(--accent)', color: '#fff',
                          border: 'none', borderRadius: 7, padding: '6px 14px',
                          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                          fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                          opacity: !newCardTitle.trim() || savingCard ? 0.5 : 1,
                        }}
                      >{savingCard ? '…' : 'Ajouter'}</button>
                      <button
                        onClick={() => setAddingCardColId(null)}
                        style={{
                          background: 'transparent', color: 'var(--sub2)',
                          border: '1px solid var(--line2)', borderRadius: 7, padding: '6px 10px',
                          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                          fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        }}
                      >Annuler</button>
                    </div>
                  </div>
                ) : col.kind === 'status' ? (
                  <div
                    onClick={() => openAddCard(col.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 10px', borderRadius: 9,
                      color: 'var(--sub2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sub2)'; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Ajouter une carte
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Add column (mode Statut uniquement) */}
        {app.groupMode === 'status' && (addingCol ? (
          <div style={{
            width: 'var(--col-w)', flexShrink: 0,
            background: 'var(--panel)', border: '1px solid var(--accent)',
            borderRadius: 14, padding: '14px 14px',
            boxShadow: 'var(--shadow)',
          }}>
            <input
              ref={newColInputRef}
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCol();
                if (e.key === 'Escape') setAddingCol(false);
              }}
              placeholder="Nom de la liste…"
              style={{
                width: '100%', border: '1px solid var(--line2)', outline: 'none',
                borderRadius: 8, padding: '8px 10px',
                fontSize: 13.5, fontWeight: 700, color: 'var(--ink)',
                background: 'var(--soft)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
              }}
            />
            <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
              <button
                onClick={handleAddCol}
                disabled={!newColName.trim() || savingCol}
                style={{
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 7, padding: '7px 14px',
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  opacity: !newColName.trim() || savingCol ? 0.5 : 1,
                }}
              >{savingCol ? '…' : 'Ajouter la liste'}</button>
              <button
                onClick={() => setAddingCol(false)}
                style={{
                  background: 'transparent', color: 'var(--sub2)',
                  border: '1px solid var(--line2)', borderRadius: 7, padding: '7px 10px',
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}
              >Annuler</button>
            </div>
          </div>
        ) : (
          <div
            onClick={openAddCol}
            style={{
              width: 270, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 8, padding: '13px 14px',
              border: '1.5px dashed var(--line2)', borderRadius: 14,
              color: 'var(--sub2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              transition: 'all .1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--faint)'; e.currentTarget.style.color = 'var(--ink2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line2)'; e.currentTarget.style.color = 'var(--sub2)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Ajouter une liste
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, isDragging, onDragStart, onDragEnd, onClick }: {
  task: Task;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const app = useApp();
  const labels = task.labels || [];
  const assignees = task.assignees || [];
  const checklist = task.checklist_items || [];
  const doneItems = checklist.filter(i => {
    const override = app.checklistOverrides[i.id];
    return override !== undefined ? override : i.is_done;
  });

  const hasProgress = checklist.length > 0;
  const pct = hasProgress ? Math.round(doneItems.length / checklist.length * 100) : 0;

  const dueDay = task.due_date ? new Date(task.due_date).getDate() : null;
  const dueMonth = task.due_date ? new Date(task.due_date).getMonth() : null;
  const isUrgent = dueDay != null && dueDay <= TODAY_DATE && dueMonth === 5;

  const ref = 'LYO-' + task.id.slice(-4).toUpperCase();
  const compact = app.density === 'compact';

  const monthLabel = (m: number) => {
    const months = ['jan','fév','mar','avr','mai','juin','jul','août','sep','oct','nov','déc'];
    return months[m] ?? '';
  };

  return (
    <div
      draggable
      onDragStart={e => { if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderLeft: `3px solid ${PRIO_COLORS[task.priority] ?? '#94a3b8'}`,
        borderRadius: 'var(--card-radius)', padding: 'var(--card-pad)',
        cursor: 'pointer', boxShadow: 'var(--shadow)',
        display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)',
        opacity: isDragging ? 0.5 : 1,
        transition: 'box-shadow .12s, transform .08s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Labels */}
      {labels.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {compact ? (
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              {labels.map(l => (
                <span key={l.id} title={l.name} style={{ width: 20, height: 4, borderRadius: 3, background: l.color }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
              {labels.map(l => (
                <span key={l.id} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: l.color + '1e', color: l.color }}>{l.name}</span>
              ))}
            </div>
          )}
          <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--faint)', marginLeft: 'auto' }}>{ref}</span>
        </div>
      )}

      {labels.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--faint)' }}>{ref}</span>
        </div>
      )}

      {/* Title */}
      <div style={{ fontSize: 'var(--card-title)', fontWeight: 600, lineHeight: 1.3, color: 'var(--ink)' }}>{task.title}</div>

      {/* Blocked */}
      {task.is_blocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: '#dc2626', background: 'rgba(220,38,38,0.08)', padding: '5px 8px', borderRadius: 7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><path d="M5 5l14 14" /></svg>
          {task.block_reason || 'Bloqué'}
        </div>
      )}

      {/* Progress */}
      {hasProgress && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 5, background: 'var(--soft2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : 'var(--accent)', borderRadius: 3, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sub2)', fontFamily: "'JetBrains Mono', monospace" }}>{doneItems.length}/{checklist.length}</span>
        </div>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--card-meta-gap)', flexWrap: 'wrap' }}>
        {dueDay != null && dueMonth != null && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
            color: isUrgent ? '#dc2626' : 'var(--sub)',
            background: isUrgent ? 'rgba(220,38,38,0.10)' : 'var(--soft)',
            padding: '2px 7px', borderRadius: 6,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            {dueDay} {monthLabel(dueMonth)}
          </span>
        )}
        {task.estimated_hours > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: "'JetBrains Mono', monospace" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            {task.spent_hours}/{task.estimated_hours}h
          </span>
        )}
        {task.comments_count > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: 'var(--sub2)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {task.comments_count}
          </span>
        )}
        {task.files_count > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: 'var(--sub2)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.4 11.05 12.25 20.2a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            {task.files_count}
          </span>
        )}

        {assignees.length > 0 && (
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            {assignees.slice(0, 3).map((m, i) => (
              <div key={m.id} title={m.name} style={{
                width: 23, height: 23, borderRadius: '50%',
                background: m.color, color: '#fff', fontSize: 9.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--panel)', marginLeft: i > 0 ? -6 : 0,
              }}>{m.initials}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
