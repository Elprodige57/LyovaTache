import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Task, Column, Member } from '../types';

interface TaskDrawerProps {
  task: Task | null;
  columns: Column[];
  currentMember: Member | null;
}

const PRIO_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: '#ef4444' },
  high: { label: 'Haute', color: '#f97316' },
  medium: { label: 'Moyenne', color: '#6366f1' },
  low: { label: 'Basse', color: '#94a3b8' },
};

const PRIOS = ['urgent', 'high', 'medium', 'low'] as const;

export function TaskDrawer({ task, columns, currentMember }: TaskDrawerProps) {
  const app = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [newCheckText, setNewCheckText] = useState('');
  const [addingCheck, setAddingCheck] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showPrioPicker, setShowPrioPicker] = useState(false);
  const [showColPicker, setShowColPicker] = useState(false);
  const [savingCheck, setSavingCheck] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  if (!task) {
    return null;
  }

  const colOverride = app.taskOverrides[task.id]?.column_id;
  const colId = colOverride ?? task.column_id;
  const col = columns.find(c => c.id === colId);
  const prio = PRIO_MAP[task.priority] ?? PRIO_MAP.medium;
  const labels = task.labels || [];
  const assignees = task.assignees || [];
  const checklist = task.checklist_items || [];
  const comments = task.comments || [];

  const doneCl = checklist.filter(i => {
    const ov = app.checklistOverrides[i.id];
    return ov !== undefined ? ov : i.is_done;
  });
  const clPct = checklist.length > 0 ? Math.round((doneCl.length / checklist.length) * 100) : 0;

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isUrgent = dueDate != null && dueDate <= new Date();
  const dueStr = dueDate ? dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const timePct = task.estimated_hours > 0
    ? Math.min(100, Math.round((task.spent_hours / task.estimated_hours) * 100))
    : 0;

  const showSummary = app.aiSummaryForTaskId === task.id;
  const ref = 'LYO-' + task.id.slice(-4).toUpperCase();

  const timeline = [
    { dot: '#10b981', text: 'Tâche mise à jour', time: 'il y a 2 h' },
    { dot: '#6366f1', text: 'Assignée à ' + (assignees[0]?.name ?? '…'), time: 'hier' },
    { dot: '#f59e0b', text: 'Déplacée vers ' + (col?.name ?? '…'), time: 'il y a 3 j' },
    { dot: '#94a3b8', text: 'Tâche créée', time: 'il y a 5 j' },
  ];

  const startEditing = () => {
    setIsEditing(true);
    setEditingTitle(task.title);
    setEditingDesc(task.description || '');
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  const saveEdit = async () => {
    const t = editingTitle.trim();
    if (!t) return;
    await app.patchTask(task.id, { title: t, description: editingDesc || null });
    setIsEditing(false);
  };

  const handlePostComment = async () => {
    const c = newComment.trim();
    if (!c || !currentMember || sendingComment) return;
    setSendingComment(true);
    await app.postComment(task.id, currentMember.id, c);
    setNewComment('');
    setSendingComment(false);
  };

  const handleAddCheck = async () => {
    const t = newCheckText.trim();
    if (!t || savingCheck) return;
    setSavingCheck(true);
    const pos = checklist.length;
    await app.addChecklistItem(task.id, t, pos);
    setNewCheckText('');
    setAddingCheck(false);
    setSavingCheck(false);
  };

  const handleDeleteCheck = async (itemId: string) => {
    await app.removeChecklistItem(itemId);
  };

  const handleDeleteTask = async () => {
    if (!confirm('Supprimer cette tâche ? Cette action est irréversible.')) return;
    setDeletingTask(true);
    await app.removeTask(task.id);
    setDeletingTask(false);
  };

  const handleArchiveTask = async () => {
    if (task.archived_at) {
      await app.restoreTask(task.id);
    } else {
      await app.archiveTask(task.id);
    }
  };

  const handleMoveColumn = async (colId2: string) => {
    if (colId2 === colId) return;
    await app.patchTask(task.id, { column_id: colId2 });
    setShowColPicker(false);
  };

  const handleChangePrio = async (p: string) => {
    if (p === task.priority) return;
    await app.patchTask(task.id, { priority: p });
    setShowPrioPicker(false);
  };

  const handleChangeDueDate = async (date: string) => {
    await app.patchTask(task.id, { due_date: date || null });
  };

  const handleTimeChange = async (spent: number, estimated: number) => {
    await app.patchTask(task.id, { spent_hours: spent, estimated_hours: estimated });
  };

  const handleAddAssignee = async (m: Member) => {
    if (assignees.some(a => a.id === m.id)) return;
    await app.addTaskAssignee(task.id, m.id);
    setShowAssigneePicker(false);
  };

  const handleRemoveAssignee = async (m: Member) => {
    await app.removeTaskAssignee(task.id, m.id);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={app.closeTask} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 40, animation: 'lyFade .15s ease' }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 760, maxWidth: '95vw',
        background: 'var(--panel)', zIndex: 41,
        boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column',
        animation: 'lySlide .22s cubic-bezier(.2,.8,.2,1)',
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      }}>
        {/* Drawer header */}
        <div style={{ padding: '15px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {col && (
            <div style={{ position: 'relative' }}>
              <span
                onClick={() => setShowColPicker(!showColPicker)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12.5, fontWeight: 600, color: col.color,
                  background: col.color + '1e', padding: '4px 10px', borderRadius: 7,
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: col.color }} />
                {col.name}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </span>
              {showColPicker && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 5,
                  background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10,
                  boxShadow: 'var(--shadow-md)', padding: 6, minWidth: 160,
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}>
                  {columns.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleMoveColumn(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                        fontSize: 12.5, fontWeight: c.id === colId ? 700 : 600,
                        color: c.id === colId ? c.color : 'var(--ink2)',
                        background: c.id === colId ? c.color + '1e' : 'transparent',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--faint)' }}>{ref}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <div
              onClick={app.summarizeTask}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
                color: 'var(--accent-ink)', border: '1px solid var(--line2)', borderRadius: 8,
                padding: '6px 11px', cursor: 'pointer', transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" />
              </svg>
              Résumer (IA)
            </div>
            <div
              onClick={startEditing}
              title="Modifier"
              style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--sub)', transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4z" />
              </svg>
            </div>
            <div
              onClick={handleArchiveTask}
              title={task.archived_at ? 'Désarchiver' : 'Archiver'}
              style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: task.archived_at ? 'var(--accent)' : 'var(--sub)', transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 4h18v5H3z" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
              </svg>
            </div>
            <div
              onClick={handleDeleteTask}
              title="Supprimer"
              style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#ef4444', transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <div
              onClick={app.closeTask}
              style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--sub)', transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', minHeight: 0 }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0, padding: '22px 24px', borderRight: '1px solid var(--line)', overflowY: 'auto' }}>
            {/* Labels */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11, alignItems: 'center' }}>
              {labels.length > 0 && labels.map(l => (
                <span key={l.id} style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: l.color + '1e', color: l.color }}>
                  {l.name}
                </span>
              ))}
              <div style={{ position: 'relative' }}>
                <span
                  onClick={() => setShowLabelPicker(!showLabelPicker)}
                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 5, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  Étiquette
                </span>
                {showLabelPicker && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 5,
                    background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10,
                    boxShadow: 'var(--shadow-md)', padding: 6, minWidth: 160,
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    {/* This would need actual labels from workspace - using placeholder for now */}
                    <div style={{ fontSize: 11, color: 'var(--sub2)', padding: '6px 8px' }}>Gérer les étiquettes depuis le tableau</div>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            {isEditing ? (
              <div style={{ marginBottom: 16 }}>
                <input
                  ref={titleInputRef}
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                  style={{
                    width: '100%', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
                    lineHeight: 1.25, color: 'var(--ink)', border: '1px solid var(--accent)',
                    borderRadius: 10, padding: '8px 12px', background: 'var(--soft)',
                    outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                  }}
                />
                <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                  <button onClick={saveEdit} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
                  <button onClick={() => setIsEditing(false)} style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 7, padding: '6px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                </div>
              </div>
            ) : (
              <h1 onClick={startEditing} style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25, margin: '0 0 16px', color: 'var(--ink)', cursor: 'pointer' }}>{task.title}</h1>
            )}

            {/* AI Summary */}
            {showSummary && (
              <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, animation: 'lyPop .2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent-ink)', marginBottom: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" /></svg>
                  Résumé IA
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.55 }}>
                  Tâche de priorité {prio.label.toLowerCase()}. {checklist.length > 0 ? `${doneCl.length}/${checklist.length} sous-tâches complétées.` : ''} {task.due_date ? `Échéance le ${dueStr}.` : ''} {assignees.length > 0 ? `Assignée à ${assignees.map(a => a.name.split(' ')[0]).join(', ')}.` : ''}
                </div>
              </div>
            )}

            {/* Description */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Description</div>
            {isEditing ? (
              <textarea
                value={editingDesc}
                onChange={e => setEditingDesc(e.target.value)}
                rows={5}
                style={{
                  width: '100%', fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.6,
                  border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 12px',
                  background: 'var(--soft)', outline: 'none', resize: 'vertical',
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                  marginBottom: 24,
                }}
              />
            ) : (
              <p
                onClick={startEditing}
                style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.6, margin: '0 0 24px', cursor: 'pointer', minHeight: 24 }}
              >
                {task.description || 'Aucune description. Cliquez pour ajouter.'}
              </p>
            )}

            {/* Checklist */}
            {checklist.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)' }}>Sous-tâches</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sub2)', fontFamily: "'JetBrains Mono', monospace" }}>{doneCl.length}/{checklist.length}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--soft2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${clPct}%`, background: '#10b981', borderRadius: 4, transition: 'width .25s' }} />
                  </div>
                  <span
                    onClick={app.openAI}
                    style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" /></svg>
                    Générer
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {checklist.map(item => {
                    const isDone = app.checklistOverrides[item.id] !== undefined ? app.checklistOverrides[item.id] : item.is_done;
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 9px', borderRadius: 8,
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div
                          onClick={() => app.toggleChecklistItem(item.id, isDone)}
                          style={{
                            width: 18, height: 18, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                            border: `2px solid ${isDone ? '#10b981' : 'var(--line2)'}`,
                            background: isDone ? '#10b981' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {isDone && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4 4L19 6" /></svg>}
                        </div>
                        <span style={{ fontSize: 13.5, color: isDone ? 'var(--sub2)' : 'var(--ink2)', textDecoration: isDone ? 'line-through' : 'none', flex: 1 }}>
                          {item.text}
                        </span>
                        <div
                          onClick={() => handleDeleteCheck(item.id)}
                          style={{ cursor: 'pointer', color: 'var(--sub2)', opacity: 0, transition: 'opacity .1s', padding: '0 4px' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add new item */}
                  {addingCheck ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 9px' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, border: '2px solid var(--line2)', background: 'transparent' }} />
                      <input
                        value={newCheckText}
                        onChange={e => setNewCheckText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddCheck();
                          if (e.key === 'Escape') { setAddingCheck(false); setNewCheckText(''); }
                        }}
                        placeholder="Nouvelle sous-tâche…"
                        autoFocus
                        style={{
                          flex: 1, border: 'none', outline: 'none',
                          fontSize: 13.5, fontWeight: 600, color: 'var(--ink2)',
                          background: 'transparent', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                        }}
                      />
                      <button onClick={handleAddCheck} disabled={!newCheckText.trim() || savingCheck} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: !newCheckText.trim() || savingCheck ? 0.5 : 1 }}>
                        {savingCheck ? '…' : 'OK'}
                      </button>
                      <button onClick={() => { setAddingCheck(false); setNewCheckText(''); }} style={{ background: 'transparent', color: 'var(--sub2)', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setAddingCheck(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', cursor: 'pointer', color: 'var(--accent-ink)', fontSize: 13, fontWeight: 600, transition: 'background .1s', borderRadius: 8 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                      Ajouter une sous-tâche
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comments */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 12 }}>
              Commentaires <span style={{ color: 'var(--faint)' }}>· {comments.length || task.comments_count}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8 }}>
              {comments.length > 0 ? comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 11 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: c.member?.color ?? '#64748b', color: '#fff', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{c.member?.initials ?? '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{c.member?.name}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--sub2)' }}>{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5, marginTop: 3 }}>{c.content}</div>
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--sub2)', fontSize: 13, fontStyle: 'italic' }}>Aucun commentaire pour l'instant.</p>
              )}
            </div>
          </div>

          {/* Right rail */}
          <div style={{ width: 240, flexShrink: 0, padding: '22px 20px', background: 'var(--panel2)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Status */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Statut</div>
                {col && (
                  <div style={{ position: 'relative' }}>
                    <span
                      onClick={() => setShowColPicker(!showColPicker)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: col.color, background: col.color + '1e', padding: '5px 11px', borderRadius: 8, cursor: 'pointer' }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                      {col.name}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </span>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Priorité</div>
                <div style={{ position: 'relative' }}>
                  <span
                    onClick={() => setShowPrioPicker(!showPrioPicker)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: prio.color, cursor: 'pointer' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" />
                    </svg>
                    {prio.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                  {showPrioPicker && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 5,
                      background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10,
                      boxShadow: 'var(--shadow-md)', padding: 6, minWidth: 140,
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}>
                      {PRIOS.map(p => {
                        const pm = PRIO_MAP[p];
                        return (
                          <div
                            key={p}
                            onClick={() => handleChangePrio(p)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                              fontSize: 13, fontWeight: p === task.priority ? 700 : 600,
                              color: pm.color, background: p === task.priority ? pm.color + '1e' : 'transparent',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></svg>
                            {pm.label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Due date */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Échéance</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: isUrgent ? '#dc2626' : 'var(--ink2)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" />
                    </svg>
                    {dueStr}
                  </span>
                  <input
                    type="date"
                    value={task.due_date || ''}
                    onChange={e => handleChangeDueDate(e.target.value)}
                    style={{
                      border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px',
                      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      background: 'var(--soft)', color: 'var(--ink2)', cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              {/* Assignees */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Assignés</div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  {assignees.map(m => (
                    <div key={m.id} title={m.name} style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: m.color, color: '#fff', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--panel2)', cursor: 'pointer',
                    }}
                    onClick={() => handleRemoveAssignee(m)}
                    >{m.initials}</div>
                  ))}
                  <div
                    onClick={() => setShowAssigneePicker(!showAssigneePicker)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: '2px dashed var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--sub2)', fontSize: 14, fontWeight: 700,
                    }}
                  >+</div>
                </div>
                {showAssigneePicker && (
                  <div style={{
                    marginTop: 8, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10,
                    boxShadow: 'var(--shadow-md)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub2)', padding: '4px 6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Équipe</div>
                    {(currentMember ? [currentMember] : []).map(m => (
                      <div
                        key={m.id}
                        onClick={() => handleAddAssignee(m)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', transition: 'background .1s', fontSize: 13, fontWeight: 600, color: 'var(--ink2)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: m.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.initials}</div>
                        {m.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Time tracking */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Suivi du temps</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink2)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{task.spent_hours}h passées</span>
                  <span style={{ color: 'var(--sub2)' }}>/ {task.estimated_hours}h est.</span>
                </div>
                <div style={{ height: 6, background: 'var(--soft2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${timePct}%`, background: timePct > 100 ? '#ef4444' : 'var(--accent)', borderRadius: 4 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    type="number"
                    min={0}
                    value={task.spent_hours}
                    onChange={e => handleTimeChange(parseInt(e.target.value) || 0, task.estimated_hours)}
                    style={{ width: 60, border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 6px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", background: 'var(--soft)', color: 'var(--ink2)', outline: 'none' }}
                    title="Heures passées"
                  />
                  <input
                    type="number"
                    min={0}
                    value={task.estimated_hours}
                    onChange={e => handleTimeChange(task.spent_hours, parseInt(e.target.value) || 0)}
                    style={{ width: 60, border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 6px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", background: 'var(--soft)', color: 'var(--ink2)', outline: 'none' }}
                    title="Heures estimées"
                  />
                </div>
              </div>

              {/* Timeline */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 10 }}>Activité</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {timeline.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: ev.dot, marginTop: 3 }} />
                        {i < timeline.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'var(--line2)', marginTop: 2 }} />}
                      </div>
                      <div style={{ paddingBottom: 2 }}>
                        <div style={{ fontSize: 11.5, color: 'var(--ink2)', lineHeight: 1.4 }}>{ev.text}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--sub2)', marginTop: 1 }}>{ev.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comment input */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '13px 22px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: currentMember?.color ?? 'var(--accent)',
            color: '#fff', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{currentMember?.initials ?? 'CR'}</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px' }}>
            <textarea
              ref={commentRef}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); }
                if (e.key === 'Escape') { setNewComment(''); }
              }}
              placeholder="Commenter, @mentionner…"
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--ink)',
                background: 'transparent', resize: 'none',
                fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                maxHeight: 80,
              }}
            />
            <div
              onClick={handlePostComment}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: newComment.trim() ? 'var(--accent)' : 'var(--soft2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: newComment.trim() ? 'pointer' : 'default',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={newComment.trim() ? '#fff' : 'var(--sub2)'} strokeWidth="2">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
