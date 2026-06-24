import { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { confirmDialog } from '../lib/dialog';
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
  image: 'Image',
  divider: 'Séparateur',
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

  // Insère un nouveau bloc juste après l'index donné (choisir où on met les choses).
  const insertBlockAfter = (idx: number, type: string) => {
    setEditedContent(prev => { const c = [...prev]; c.splice(idx + 1, 0, { type, content: '' }); return c; });
  };

  // Réordonne un bloc (↑/↑).
  const moveBlock = (idx: number, dir: 'up' | 'down') => {
    setEditedContent(prev => {
      const j = idx + (dir === 'up' ? -1 : 1);
      if (j < 0 || j >= prev.length) return prev;
      const c = [...prev];
      [c[idx], c[j]] = [c[j], c[idx]];
      return c;
    });
  };

  const updateBlock = (idx: number, content: string) => {
    setEditedContent(prev => prev.map((b, i) => i === idx ? { ...b, content } : b));
  };

  const updateBlockField = (idx: number, field: string, value: unknown) => {
    setEditedContent(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const removeBlock = (idx: number) => {
    setEditedContent(prev => prev.filter((_, i) => i !== idx));
  };

  // Mise en forme du texte sélectionné dans le bloc actif (type Word).
  const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value);

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
                <button onClick={async () => { if (await confirmDialog('Supprimer le document ?', { message: `« ${selected.title} »`, danger: true })) app.deleteDocument(selected.id); }} title="Supprimer le document" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 4, borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
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
                <style>{`[contenteditable][data-ph]:empty:before{content:attr(data-ph);color:var(--sub2);pointer-events:none}`}</style>
                {/* Barre de mise en forme (s'applique au bloc en cours d'édition) */}
                <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 10, padding: 6, marginBottom: 14 }}>
                  <FmtBtn onClick={() => exec('bold')} title="Gras (Ctrl+B)"><b>G</b></FmtBtn>
                  <FmtBtn onClick={() => exec('italic')} title="Italique (Ctrl+I)"><i>I</i></FmtBtn>
                  <FmtBtn onClick={() => exec('underline')} title="Souligné (Ctrl+U)"><u>S</u></FmtBtn>
                  <span style={{ width: 1, height: 18, background: 'var(--line2)', margin: '0 4px' }} />
                  <FmtBtn onClick={() => exec('insertUnorderedList')} title="Liste à puces">• —</FmtBtn>
                  <FmtBtn onClick={() => exec('insertOrderedList')} title="Liste numérotée">1.</FmtBtn>
                  <FmtBtn onClick={() => exec('removeFormat')} title="Effacer la mise en forme">✕ format</FmtBtn>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {editedContent.map((block, idx) => (
                    <DocBlockEditor
                      key={idx}
                      block={block}
                      onChange={c => updateBlock(idx, c)}
                      onToggleDone={() => updateBlockField(idx, 'done', !(block.done === true))}
                      onRemove={() => removeBlock(idx)}
                      onMoveUp={() => moveBlock(idx, 'up')}
                      onMoveDown={() => moveBlock(idx, 'down')}
                      onInsertAfter={(type) => insertBlockAfter(idx, type)}
                      isFirst={idx === 0}
                      isLast={idx === editedContent.length - 1}
                    />
                  ))}
                </div>
                {/* Ajouter un bloc (à la fin) */}
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
  const html = { __html: content };

  if (type === 'divider') {
    return <hr style={{ border: 'none', borderTop: '1px solid var(--line2)', margin: '10px 0' }} />;
  }
  if (type === 'image') {
    return content ? <img src={content} alt="" style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid var(--line)' }} /> : null;
  }
  if (type === 'h') {
    return <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)', margin: '12px 0 6px' }} dangerouslySetInnerHTML={html} />;
  }
  if (type === 'h2') {
    return <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink2)', margin: '10px 0 4px' }} dangerouslySetInnerHTML={html} />;
  }
  if (type === 'code') {
    return (
      <pre style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12.5, background: 'var(--soft)',
        border: '1px solid var(--line)', borderRadius: 10,
        padding: '14px 16px', color: 'var(--ink2)',
        overflowX: 'auto', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap',
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
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink2)' }} dangerouslySetInnerHTML={html} />
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
        <span style={{ fontSize: 15, color: done ? 'var(--sub2)' : 'var(--ink2)', textDecoration: done ? 'line-through' : 'none' }} dangerouslySetInnerHTML={html} />
      </div>
    );
  }
  if (type === 'list') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '2px 0' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 8, flexShrink: 0 }} />
        <span style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink2)' }} dangerouslySetInnerHTML={html} />
      </div>
    );
  }
  if (type === 'quote') {
    return (
      <div style={{
        borderLeft: '3px solid var(--accent)',
        padding: '4px 0 4px 14px',
        fontSize: 15, color: 'var(--ink2)', lineHeight: 1.7, fontStyle: 'italic',
      }} dangerouslySetInnerHTML={html} />
    );
  }
  return <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink2)' }} dangerouslySetInnerHTML={html} />;
}

// Bouton de la barre de mise en forme (onMouseDown pour ne pas perdre la sélection).
function FmtBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{ minWidth: 28, height: 26, padding: '0 8px', fontSize: 12.5, borderRadius: 6, border: '1px solid var(--line2)', background: 'var(--panel)', color: 'var(--ink2)', cursor: 'pointer', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
    >{children}</button>
  );
}

// Zone éditable riche (contentEditable) : on fige le HTML initial pour ne pas casser le curseur.
function RichEditable({ html, onChange, placeholder, style }: { html: string; onChange: (h: string) => void; placeholder: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = useRef(html ?? '');
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      onInput={() => onChange(ref.current?.innerHTML ?? '')}
      dangerouslySetInnerHTML={{ __html: initial.current }}
      style={{ outline: 'none', minHeight: 22, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", ...style }}
    />
  );
}

function DocBlockEditor({ block, onChange, onToggleDone, onRemove, onMoveUp, onMoveDown, onInsertAfter, isFirst, isLast }: {
  block: Record<string, unknown>;
  onChange: (c: string) => void;
  onToggleDone: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAfter: (type: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const type = String(block.type || 'p');
  const content = String(block.content || '');
  const done = block.done === true;
  const [openInsert, setOpenInsert] = useState(false);

  const ctrl = (disabled: boolean, color?: string): React.CSSProperties => ({
    width: 24, height: 24, padding: 0, fontSize: 13, lineHeight: 1, borderRadius: 6,
    border: '1px solid var(--line2)', background: 'var(--panel)', color: color || 'var(--sub2)',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1, flexShrink: 0,
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  });

  // Corps de l'éditeur selon le type
  let body: React.ReactNode;
  if (type === 'divider') {
    body = <hr style={{ flex: 1, border: 'none', borderTop: '2px dashed var(--line2)', margin: '6px 0' }} />;
  } else if (type === 'image') {
    body = <input value={content} onChange={e => onChange(e.target.value)} placeholder="URL de l'image (https://…)" style={{ flex: 1, fontSize: 13, color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 6, padding: '7px 9px', background: 'var(--panel)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }} />;
  } else if (type === 'code') {
    body = <textarea value={content} onChange={e => onChange(e.target.value)} placeholder="Code" rows={4} style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 8, padding: '10px 12px', color: 'var(--ink2)', outline: 'none', resize: 'vertical' }} />;
  } else {
    const richStyle: React.CSSProperties =
      type === 'h' ? { fontSize: 20, fontWeight: 800, color: 'var(--ink)', flex: 1 }
      : type === 'h2' ? { fontSize: 16, fontWeight: 700, color: 'var(--ink2)', flex: 1 }
      : { fontSize: 15, lineHeight: 1.7, color: 'var(--ink2)', flex: 1, fontStyle: type === 'quote' ? 'italic' : 'normal' };
    const rich = <RichEditable html={content} onChange={onChange} placeholder={BLOCK_LABELS[type] || 'Texte'} style={richStyle} />;
    if (type === 'check') {
      body = (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flex: 1 }}>
          <div onClick={onToggleDone} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer', marginTop: 2, border: `2px solid ${done ? '#10b981' : 'var(--line2)'}`, background: done ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4 4L19 6" /></svg>}
          </div>
          {rich}
        </div>
      );
    } else if (type === 'callout') {
      body = <div style={{ display: 'flex', gap: 10, flex: 1, background: 'var(--accent-soft)', borderRadius: 8, padding: '8px 10px' }}><span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>{rich}</div>;
    } else if (type === 'quote') {
      body = <div style={{ flex: 1, borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>{rich}</div>;
    } else if (type === 'list') {
      body = <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'flex-start' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 9, flexShrink: 0 }} />{rich}</div>;
    } else {
      body = rich;
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--soft)', border: '1px solid var(--line2)', borderRadius: 8, padding: '7px 9px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onMoveUp} disabled={isFirst} title="Monter" style={ctrl(isFirst)}>↑</button>
          <button onClick={onMoveDown} disabled={isLast} title="Descendre" style={ctrl(isLast)}>↓</button>
          <button onClick={() => setOpenInsert(o => !o)} title="Insérer un bloc en dessous" style={ctrl(false, 'var(--accent-ink)')}>+</button>
          <button onClick={onRemove} title="Supprimer le bloc" style={ctrl(false, '#ef4444')}>×</button>
        </div>
      </div>
      {openInsert && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '4px 0 0 6px' }}>
          {Object.entries(BLOCK_LABELS).map(([t, l]) => (
            <span key={t} onClick={() => { onInsertAfter(t); setOpenInsert(false); }} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 12, padding: '3px 8px', cursor: 'pointer' }}>+ {l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
