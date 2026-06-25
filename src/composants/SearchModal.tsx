import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../controleur/AppContext';
import type { Task, Folder, Document } from '../modele/types';

interface SearchResult {
  id: string;
  type: 'task' | 'board' | 'document';
  title: string;
  subtitle?: string;
  color?: string;
  icon: string;
}

interface SearchModalProps {
  tasks: Task[];
  folders: Folder[];
  documents: Document[];
}

export function SearchModal({ tasks, folders, documents }: SearchModalProps) {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allBoards = useMemo(() => folders.flatMap(f => (f.boards || []).map(b => ({ ...b, folderName: f.name }))), [folders]);

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];
    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) {
        out.push({ id: t.id, type: 'task', title: t.title, subtitle: t.priority, icon: 'M9 11l3 3L22 4' });
      }
    }
    for (const b of allBoards) {
      if (b.name.toLowerCase().includes(q)) {
        out.push({ id: b.id, type: 'board', title: b.name, subtitle: b.folderName, color: b.color, icon: 'M3 4h5v16H3z|M10 4h5v11h-5z|M17 4h4v14h-4z' });
      }
    }
    for (const d of documents) {
      if (d.title.toLowerCase().includes(q)) {
        out.push({ id: d.id, type: 'document', title: d.title, subtitle: 'Document', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' });
      }
    }
    return out.slice(0, 8);
  }, [query, tasks, allBoards, documents]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { app.toggleSearch(); return; }
      if (!results.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        const r = results[selectedIndex];
        if (!r) return;
        if (r.type === 'task') app.openTask(r.id);
        else if (r.type === 'board') app.openBoard(r.id);
        else if (r.type === 'document') app.goTo('documents');
        app.toggleSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [results, selectedIndex, app]);

  const handleSelect = (r: SearchResult) => {
    if (r.type === 'task') app.openTask(r.id);
    else if (r.type === 'board') app.openBoard(r.id);
    else if (r.type === 'document') app.goTo('documents');
    app.toggleSearch();
  };

  return (
    <>
      <div onClick={app.toggleSearch} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
      <div style={{ position: 'fixed', top: '12vh', left: '50%', transform: 'translateX(-50%)', zIndex: 61, width: 600, maxWidth: '94vw', background: 'var(--panel)', borderRadius: 16, boxShadow: 'var(--shadow-md)', overflow: 'hidden', animation: 'lyPop .18s ease', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une tâche, un bureau, un document…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: 'var(--ink)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }} />
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: 'var(--faint)', background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 5, padding: '1px 5px' }}>ESC</span>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {results.length === 0 && query.trim() && (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--sub2)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Aucun résultat</div>
              <div style={{ fontSize: 12, marginTop: 3 }}>Essayez un autre terme</div>
            </div>
          )}
          {results.map((r, i) => {
            const active = i === selectedIndex;
            return (
              <div key={`${r.type}-${r.id}`} onClick={() => handleSelect(r)} onMouseEnter={() => setSelectedIndex(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', background: active ? 'var(--accent-soft)' : 'transparent', transition: 'background .08s' }}>
                {r.color ? <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flexShrink: 0 }} /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="2" strokeLinecap="round">
                    {r.icon.split('|').map((d, di) => <path key={di} d={d} />)}
                  </svg>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--sub2)', textTransform: 'capitalize' }}>{r.type}{r.subtitle ? ` · ${r.subtitle}` : ''}</div>
                </div>
                {active && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>↵</span>}
              </div>
            );
          })}
        </div>
        {results.length > 0 && (
          <div style={{ borderTop: '1px solid var(--line)', padding: '6px 16px', fontSize: 11, color: 'var(--faint)', display: 'flex', justifyContent: 'space-between' }}>
            <span>↑↓ pour naviguer · ↵ pour ouvrir</span>
            <span>{results.length} résultat{results.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </>
  );
}
