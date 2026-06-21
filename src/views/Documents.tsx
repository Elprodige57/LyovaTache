import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Document } from '../types';

interface DocumentsViewProps {
  documents: Document[];
}

const BLOCK_LABELS: Record<string, string> = {
  p: 'Paragraphe',
  h: 'Titre',
  h2: 'Sous-titre',
  code: 'Code',
  callout: 'Callout',
  check: 'Checklist',
  list: 'Liste',
  quote: 'Citation',
};

const DEFAULT_CONTENT: Record<string, unknown>[] = [
  { type: 'p', content: 'Commencez à rédiger votre document…' },
];

export function DocumentsView({ documents }: DocumentsViewProps) {
  const app = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState<Record<string, unknown>[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocEmoji, setNewDocEmoji] = useState('📝');
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');

  // Build document tree
  const tree = useMemo(() => {
    const byId = new Map(documents.map(d => [d.id, d]));
    const roots: Document[] = [];
    const children: Record<string, Document[]> = {};
    for (const d of documents) {
      if (d.parent_id) {
        children[d.parent_id] = [...(children[d.parent_id] || []), d];
      } else {
        roots.push(d);
      }
    }
    return { roots, children, byId };
  }, [documents]);

  const selectedId = app.selectedDocId;
  const selected = tree.byId.get(selectedId || '') || tree.roots[0];

  const startEditing = () => {
    if (!selected) return;
    setEditedTitle(selected.title);
    const content = Array.isArray(selected.content) ? selected.content : DEFAULT_CONTENT;
    setEditedContent(content.map(b => (typeof b === 'object' && b !== null ? (b as Record<string, unknown>) : { type: 'p', content: String(b) })));
    setIsEditing(true);
    setActiveTab('edit');
  };

  const saveDoc = async () => {
    if (!selected || !editedTitle.trim() || saving) return;
    setSaving(true);
    await app.updateDocument(selected.id, { title: editedTitle.trim(), content: editedContent, emoji: selected.emoji });
    setSaving(false);
    setIsEditing(false);
    setActiveTab('view');
  };

  const addBlock = (type: string) => {
    setEditedContent(prev => [...prev, { type, content: '' }]);
  };

  const updateBlock = (idx: number, content: string) => {
    setEditedContent(prev => prev.map((b, i) => i === idx ? { ...b, content } : b));
  };

  const removeBlock = (idx: number) => {
    setEditedContent(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateDoc = async () => {
    const t = newDocTitle.trim();
    if (!t || creatingDoc) return;
    setCreatingDoc(true);
    await app.addDocument('00000000-0000-0000-0000-000000000001', t, newDocEmoji, selected?.id);
    setNewDocTitle('');
    setNewDocEmoji('📝');
    setCreatingDoc(false);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      {/* Tree sidebar */}
      <div style={{ width: 268, flexShrink: 0, borderRight: '1px solid var(--line)', background: 'var(--panel2)', overflowY: 'auto', padding: '16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px 12px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sub2)', flex: 1 }}>Espace Docs</span>
          <div
            onClick={() => { setNewDocTitle(''); setNewDocEmoji('📝'); setIsEditing(false); }}
            title="Nouvelle page"
            style={{ cursor: 'pointer', color: 'var(--sub2)', padding: 4, borderRadius: 5, transition: 'background .1s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </div>

        {/* New doc mini form */}
        <div style={{ marginBottom: 10, padding: '0 8px' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <input
              value={newDocTitle}
              onChange={e => setNewDocTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateDoc(); }}
              placeholder="Nouvelle page…"
              style={{
                flex: 1, border: '1px solid var(--line2)', borderRadius: 8, padding: '6px 8px',
                fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--panel)',
                outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
              }}
            />
            <button
              onClick={handleCreateDoc}
              disabled={!newDocTitle.trim() || creatingDoc}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6,
                padding: '5px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                opacity: !newDocTitle.trim() || creatingDoc ? 0.5 : 1,
              }}
            >{creatingDoc ? '…' : 'OK'}</button>
          </div>
        </div>

        {/* Doc tree */}
        {tree.roots.map(doc => (
          <DocTreeNode
            key={doc.id}
            doc={doc}
            children={tree.children}
            selectedId={selectedId}
            onSelect={app.openDoc}
            depth={0}
          />
        ))}

        {documents.length === 0 && (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--sub2)', fontSize: 12 }}>
            Aucun document. Créez votre première page.
          </div>
        )}
      </div>

      {/* Doc content */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '44px 56px 60px' }}>
        {!selected ? (
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', padding: '80px 0', color: 'var(--sub2)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Sélectionnez un document</div>
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', background: 'var(--soft)', borderRadius: 8, padding: 3 }}>
                <div
                  onClick={() => { setIsEditing(false); setActiveTab('view'); }}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    color: activeTab === 'view' ? 'var(--ink)' : 'var(--sub2)',
                    background: activeTab === 'view' ? 'var(--panel)' : 'transparent',
                    boxShadow: activeTab === 'view' ? 'var(--shadow)' : 'none',
                    transition: 'all .1s',
                  }}
                >Vue</div>
                <div
                  onClick={startEditing}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    color: activeTab === 'edit' ? 'var(--ink)' : 'var(--sub2)',
                    background: activeTab === 'edit' ? 'var(--panel)' : 'transparent',
                    boxShadow: activeTab === 'edit' ? 'var(--shadow)' : 'none',
                    transition: 'all .1s',
                  }}
                >Éditer</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--sub2)' }}>
                  Modifié {selected.updated_at ? new Date(selected.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                </span>
                {selected.author && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: selected.author.color, color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selected.author.initials}
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 14, userSelect: 'none' }}>{selected.emoji}</div>
            {isEditing ? (
              <input
                value={editedTitle}
                onChange={e => setEditedTitle(e.target.value)}
                style={{
                  width: '100%', fontSize: 34, fontWeight: 800, letterSpacing: '-0.025em',
                  margin: '0 0 8px', lineHeight: 1.15, color: 'var(--ink)', border: '1px solid var(--accent)',
                  borderRadius: 10, padding: '8px 12px', background: 'var(--soft)', outline: 'none',
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                }}
              />
            ) : (
              <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px', lineHeight: 1.15, color: 'var(--ink)' }}>{selected.title}</h1>
            )}

            {/* Editor */}
            {isEditing ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {editedContent.map((block, idx) => (
                    <DocBlockEditor
                      key={idx}
                      block={block}
                      onChange={c => updateBlock(idx, c)}
                      onRemove={() => removeBlock(idx)}
                    />
                  ))}
                </div>
                {/* Add block toolbar */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                  {Object.entries(BLOCK_LABELS).map(([type, label]) => (
                    <div
                      key={type}
                      onClick={() => addBlock(type)}
                      style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)',
                        background: 'var(--accent-soft)', borderRadius: 14,
                        padding: '5px 10px', cursor: 'pointer', transition: 'filter .1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.97)')}
                      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                    >+ {label}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={saveDoc}
                    disabled={!editedTitle.trim() || saving}
                    style={{
                      background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      opacity: !editedTitle.trim() || saving ? 0.5 : 1,
                    }}
                  >{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
                  <button
                    onClick={() => { setIsEditing(false); setActiveTab('view'); }}
                    style={{
                      background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)',
                      borderRadius: 8, padding: '8px 14px',
                      fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >Annuler</button>
                </div>
              </div>
            ) : (
              <div>
                {/* Render content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {Array.isArray(selected.content) && selected.content.length > 0 ? (selected.content as unknown[]).map((block, i) => (
                    <DocBlockRenderer key={i} block={block as Record<string, unknown>} />
                  )) : (
                    <div style={{ color: 'var(--sub2)', fontSize: 14, fontStyle: 'italic' }}>
                      Ce document est vide. Cliquez sur « Éditer » pour commencer.
                    </div>
                  )}
                </div>
                {/* Children pages */}
                {(tree.children[selected.id] || []).length > 0 && (
                  <div style={{ marginTop: 32, borderTop: '1px solid var(--line)', paddingTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 12 }}>
                      Sous-pages
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                      {(tree.children[selected.id] || []).map(child => (
                        <div
                          key={child.id}
                          onClick={() => app.openDoc(child.id)}
                          style={{
                            background: 'var(--panel)', border: '1px solid var(--line)',
                            borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                            boxShadow: 'var(--shadow)', transition: 'box-shadow .15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                        >
                          <div style={{ fontSize: 20, marginBottom: 4 }}>{child.emoji}</div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DocTreeNode({ doc, children, selectedId, onSelect, depth }: {
  doc: Document;
  children: Record<string, Document[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const active = selectedId === doc.id;
  const childDocs = children[doc.id] || [];
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div
        onClick={() => onSelect(doc.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: `7px 9px`,
          paddingLeft: 9 + depth * 16,
          borderRadius: 8, cursor: 'pointer',
          fontSize: 13, fontWeight: active ? 700 : 500,
          color: active ? 'var(--ink)' : 'var(--ink2)',
          background: active ? 'var(--accent-soft)' : 'transparent',
          transition: 'background .1s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        {childDocs.length > 0 ? (
          <div onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} style={{ cursor: 'pointer', color: 'var(--sub2)', transition: 'transform .15s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        ) : (
          <div style={{ width: 14 }} />
        )}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
        </svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
      </div>
      {expanded && childDocs.map(child => (
        <DocTreeNode key={child.id} doc={child} children={children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

function DocBlockRenderer({ block }: { block: Record<string, unknown> }) {
  const type = String(block.type || 'p');
  const content = String(block.content || '');
  const done = block.done === true;

  if (type === 'h') {
    return <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)', margin: '12px 0 6px' }}>{content}</div>;
  }
  if (type === 'h2') {
    return <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink2)', margin: '10px 0 4px' }}>{content}</div>;
  }
  if (type === 'code') {
    return (
      <pre style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12.5, background: 'var(--soft)',
        border: '1px solid var(--line)', borderRadius: 10,
        padding: '14px 16px', color: 'var(--ink2)',
        overflowX: 'auto', margin: 0, lineHeight: 1.6,
      }}>{content}</pre>
    );
  }
  if (type === 'callout') {
    return (
      <div style={{
        display: 'flex', gap: 11,
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent)44',
        borderRadius: 10, padding: '13px 15px',
      }}>
        <span style={{ fontSize: 17 }}>💡</span>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink2)' }}>{content}</div>
      </div>
    );
  }
  if (type === 'check') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
        <div style={{
          width: 18, height: 18, borderRadius: 5,
          border: `2px solid ${done ? '#10b981' : 'var(--line2)'}`,
          background: done ? '#10b981' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4 4L19 6" /></svg>}
        </div>
        <span style={{ fontSize: 15, color: done ? 'var(--sub2)' : 'var(--ink2)', textDecoration: done ? 'line-through' : 'none' }}>
          {content}
        </span>
      </div>
    );
  }
  if (type === 'list') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '2px 0' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 8, flexShrink: 0 }} />
        <span style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink2)' }}>{content}</span>
      </div>
    );
  }
  if (type === 'quote') {
    return (
      <div style={{
        borderLeft: '3px solid var(--accent)',
        padding: '4px 0 4px 14px',
        fontSize: 15, color: 'var(--ink2)', lineHeight: 1.7, fontStyle: 'italic',
      }}>
        {content}
      </div>
    );
  }
  return <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink2)' }}>{content}</div>;
}

function DocBlockEditor({ block, onChange, onRemove }: {
  block: Record<string, unknown>;
  onChange: (c: string) => void;
  onRemove: () => void;
}) {
  const type = String(block.type || 'p');
  const content = String(block.content || '');
  const isDone = block.done === true;
  const [check, setCheck] = useState(isDone);

  if (type === 'h') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={content}
          onChange={e => onChange(e.target.value)}
          placeholder="Titre"
          style={{
            flex: 1, fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em',
            color: 'var(--ink)', border: '1px solid var(--line2)', borderRadius: 8,
            padding: '8px 10px', background: 'var(--soft)', outline: 'none',
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          }}
        />
        <button onClick={onRemove} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}>×</button>
      </div>
    );
  }
  if (type === 'h2') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={content}
          onChange={e => onChange(e.target.value)}
          placeholder="Sous-titre"
          style={{
            flex: 1, fontSize: 16, fontWeight: 700,
            color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8,
            padding: '8px 10px', background: 'var(--soft)', outline: 'none',
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          }}
        />
        <button onClick={onRemove} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}>×</button>
      </div>
    );
  }
  if (type === 'code') {
    return (
      <div style={{ position: 'relative' }}>
        <textarea
          value={content}
          onChange={e => onChange(e.target.value)}
          placeholder="Code"
          rows={4}
          style={{
            width: '100%', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12.5, background: 'var(--soft)',
            border: '1px solid var(--line2)', borderRadius: 10,
            padding: '14px 16px', color: 'var(--ink2)',
            outline: 'none', resize: 'vertical',
          }}
        />
        <button onClick={onRemove} style={{ position: 'absolute', top: 6, right: 6, background: 'var(--panel)', color: '#ef4444', border: '1px solid var(--line2)', borderRadius: 5, fontSize: 12, cursor: 'pointer', padding: '2px 6px' }}>×</button>
      </div>
    );
  }
  if (type === 'callout') {
    return (
      <div style={{ position: 'relative', display: 'flex', gap: 11, background: 'var(--accent-soft)', border: '1px solid var(--accent)44', borderRadius: 10, padding: '13px 15px' }}>
        <span style={{ fontSize: 17, flexShrink: 0 }}>💡</span>
        <textarea
          value={content}
          onChange={e => onChange(e.target.value)}
          placeholder="Callout"
          rows={2}
          style={{
            flex: 1, fontSize: 14, lineHeight: 1.6, color: 'var(--ink2)',
            border: 'none', outline: 'none', resize: 'vertical', background: 'transparent',
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          }}
        />
        <button onClick={onRemove} style={{ position: 'absolute', top: 6, right: 6, background: 'var(--panel)', color: '#ef4444', border: '1px solid var(--line2)', borderRadius: 5, fontSize: 12, cursor: 'pointer', padding: '2px 6px' }}>×</button>
      </div>
    );
  }
  if (type === 'check') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div
          onClick={() => { setCheck(!check); }}
          style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
            border: `2px solid ${check ? '#10b981' : 'var(--line2)'}`,
            background: check ? '#10b981' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {check && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4 4L19 6" /></svg>}
        </div>
        <input
          value={content}
          onChange={e => onChange(e.target.value)}
          placeholder="Checklist item"
          style={{
            flex: 1, fontSize: 14, color: 'var(--ink2)',
            border: '1px solid var(--line2)', borderRadius: 6,
            padding: '6px 8px', background: 'var(--soft)', outline: 'none',
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          }}
        />
        <button onClick={onRemove} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}>×</button>
      </div>
    );
  }
  if (type === 'list') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 8, flexShrink: 0 }} />
        <input
          value={content}
          onChange={e => onChange(e.target.value)}
          placeholder="Item de liste"
          style={{
            flex: 1, fontSize: 14, color: 'var(--ink2)',
            border: '1px solid var(--line2)', borderRadius: 6,
            padding: '6px 8px', background: 'var(--soft)', outline: 'none',
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          }}
        />
        <button onClick={onRemove} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}>×</button>
      </div>
    );
  }
  if (type === 'quote') {
    return (
      <div style={{ position: 'relative', display: 'flex', gap: 8, borderLeft: '3px solid var(--accent)', padding: '4px 0 4px 14px' }}>
        <textarea
          value={content}
          onChange={e => onChange(e.target.value)}
          placeholder="Citation"
          rows={2}
          style={{
            flex: 1, fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7, fontStyle: 'italic',
            border: 'none', outline: 'none', resize: 'vertical', background: 'transparent',
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          }}
        />
        <button onClick={onRemove} style={{ position: 'absolute', top: -2, right: 0, background: 'var(--panel)', color: '#ef4444', border: '1px solid var(--line2)', borderRadius: 5, fontSize: 12, cursor: 'pointer', padding: '2px 6px' }}>×</button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder="Paragraphe"
        rows={2}
        style={{
          flex: 1, fontSize: 15, color: 'var(--ink2)', lineHeight: 1.7,
          border: '1px solid var(--line2)', borderRadius: 8,
          padding: '8px 10px', background: 'var(--soft)', outline: 'none',
          resize: 'vertical', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
        }}
      />
      <button onClick={onRemove} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}>×</button>
    </div>
  );
}
