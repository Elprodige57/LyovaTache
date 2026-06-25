import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../controleur/AppContext';
import { confirmDialog } from '../outils/dialog';
import type { Document } from '../modele/types';

interface DocumentsViewProps {
  documents: Document[];
}

// Convertit le contenu stocké (nouveau format « doc html » ou ancien format en blocs) en une seule chaîne HTML.
function blocksToHtml(content: unknown): string {
  if (!Array.isArray(content)) return '<p></p>';
  if (content.length === 1 && (content[0] as Record<string, unknown>)?.type === 'doc') {
    return String((content[0] as Record<string, unknown>).html || '') || '<p></p>';
  }
  const parts = content.map((raw) => {
    const b = raw as Record<string, unknown>;
    const t = String(b.type || 'p');
    const c = String(b.content || '');
    switch (t) {
      case 'h': return `<h1>${c}</h1>`;
      case 'h2': return `<h2>${c}</h2>`;
      case 'quote': return `<blockquote>${c}</blockquote>`;
      case 'code': return `<pre>${c}</pre>`;
      case 'callout': return `<p>💡 ${c}</p>`;
      case 'check': return `<p>${b.done ? '☑' : '☐'} ${c}</p>`;
      case 'list': return `<ul><li>${c}</li></ul>`;
      case 'image': return c ? `<p><img src="${c}" style="max-width:100%" alt="" /></p>` : '';
      case 'divider': return '<hr />';
      default: return `<p>${c || ''}</p>`;
    }
  });
  return parts.filter(Boolean).join('') || '<p></p>';
}

export function DocumentsView({ documents }: DocumentsViewProps) {
  const app = useApp();
  const [newDocTitle, setNewDocTitle] = useState('');
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [docSearch, setDocSearch] = useState('');

  const tree = useMemo(() => {
    const byId = new Map(documents.map(d => [d.id, d]));
    const roots: Document[] = [];
    const children: Record<string, Document[]> = {};
    for (const d of documents) {
      if (d.parent_id) children[d.parent_id] = [...(children[d.parent_id] || []), d];
      else roots.push(d);
    }
    return { roots, children, byId };
  }, [documents]);

  const selectedId = app.selectedDocId;
  const selected = tree.byId.get(selectedId || '') || tree.roots[0];

  const handleCreateDoc = async () => {
    const t = newDocTitle.trim();
    if (!t || creatingDoc) return;
    setCreatingDoc(true);
    await app.addDocument('00000000-0000-0000-0000-000000000001', t, '📝', null);
    setNewDocTitle('');
    setCreatingDoc(false);
  };

  const q = docSearch.trim().toLowerCase();
  const searchResults = q ? documents.filter(d => d.title.toLowerCase().includes(q)) : [];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      {/* Sidebar Docs */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--line)', background: 'var(--panel2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Lyova Docs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 8, padding: '6px 9px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Rechercher un document…" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, color: 'var(--ink)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 4px 8px' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sub2)', flex: 1 }}>{q ? 'Résultats' : 'Documents'}</span>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 10, padding: '0 2px' }}>
            <input
              value={newDocTitle}
              onChange={e => setNewDocTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateDoc(); }}
              placeholder="Nouvelle page…"
              style={{ flex: 1, border: '1px solid var(--line2)', borderRadius: 8, padding: '6px 8px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--panel)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            />
            <button onClick={handleCreateDoc} disabled={!newDocTitle.trim() || creatingDoc} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: !newDocTitle.trim() || creatingDoc ? 0.5 : 1 }}>{creatingDoc ? '…' : 'OK'}</button>
          </div>

          {q ? (
            searchResults.length > 0 ? searchResults.map(d => (
              <div key={d.id} onClick={() => app.openDoc(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: selectedId === d.id ? 'var(--accent-ink)' : 'var(--ink2)', background: selectedId === d.id ? 'var(--accent-soft)' : 'transparent' }}>
                <span style={{ fontSize: 14 }}>{d.emoji}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
              </div>
            )) : <div style={{ padding: '14px 8px', color: 'var(--sub2)', fontSize: 12 }}>Aucun résultat pour « {docSearch} ».</div>
          ) : (
            <>
              {tree.roots.map(doc => (
                <DocTreeNode key={doc.id} doc={doc} children={tree.children} selectedId={selectedId} onSelect={app.openDoc} depth={0} />
              ))}
              {documents.length === 0 && (
                <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--sub2)', fontSize: 12 }}>Aucun document. Créez votre première page.</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Traitement de texte */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <WordProcessor
            key={selected.id}
            doc={selected}
            onSave={(title, html) => app.updateDocument(selected.id, { title: title.trim() || selected.title, content: [{ type: 'doc', html }], emoji: selected.emoji })}
            onDelete={async () => { if (await confirmDialog('Supprimer le document ?', { message: `« ${selected.title} »`, danger: true })) app.deleteDocument(selected.id); }}
            onNew={() => app.addDocument('00000000-0000-0000-0000-000000000001', 'Nouveau document', '📝', null)}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--sub2)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" style={{ marginBottom: 16 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Sélectionnez un document</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Traitement de texte (style Word / LibreOffice)
// ────────────────────────────────────────────────────────────
function WordProcessor({ doc, onSave, onDelete, onNew }: { doc: Document; onSave: (title: string, html: string) => void | Promise<void>; onDelete: () => void; onNew: () => void }) {
  const initialHtml = useMemo(() => blocksToHtml(doc.content), [doc.content]);
  const pageRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(doc.title);
  const [status, setStatus] = useState<'Enregistré' | 'Modifié' | 'Enregistrement…'>('Enregistré');
  const [words, setWords] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [ribbonTab, setRibbonTab] = useState('Accueil');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const dirty = useRef(false);
  const latest = useRef({ title: doc.title, html: initialHtml });
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const countWords = (el: HTMLElement | null) => {
    const txt = (el?.innerText || '').trim();
    setWords(txt ? txt.split(/\s+/).length : 0);
  };

  useEffect(() => {
    document.execCommand('styleWithCSS', false, 'true');
    countWords(pageRef.current);
    // Sauvegarde au démontage (changement de document) si modifications non enregistrées.
    return () => { if (dirty.current) onSaveRef.current(latest.current.title, latest.current.html); };
  }, []);

  const markDirty = () => { dirty.current = true; if (status !== 'Modifié') setStatus('Modifié'); };

  const onInput = () => {
    latest.current.html = pageRef.current?.innerHTML ?? '';
    countWords(pageRef.current);
    markDirty();
  };

  const doSave = async () => {
    if (!dirty.current) return;
    setStatus('Enregistrement…');
    await onSaveRef.current(latest.current.title, pageRef.current?.innerHTML ?? '');
    dirty.current = false;
    setStatus('Enregistré');
  };

  // Applique une commande de mise en forme sur la sélection courante de la page.
  const exec = (cmd: string, value?: string) => {
    pageRef.current?.focus();
    document.execCommand(cmd, false, value);
    latest.current.html = pageRef.current?.innerHTML ?? '';
    markDirty();
  };
  const block = (tag: string) => exec('formatBlock', tag);
  const insertImage = () => { const u = prompt("URL de l'image"); if (u) exec('insertImage', u); };
  const insertLink = () => { const u = prompt('URL du lien'); if (u) exec('createLink', u); };

  // Menus déroulants de la barre de titre (actions réelles).
  type MItem = { label: string; shortcut?: string; action: () => void; sep?: boolean };
  const menus: Record<string, MItem[]> = {
    Fichier: [
      { label: 'Nouvelle page', shortcut: '⌘N', action: onNew },
      { label: 'Enregistrer', shortcut: '⌘S', action: doSave },
      { label: 'Imprimer', shortcut: '⌘P', action: () => window.print() },
      { label: 'Supprimer le document', sep: true, action: onDelete },
    ],
    Édition: [
      { label: 'Annuler', shortcut: '⌘Z', action: () => exec('undo') },
      { label: 'Rétablir', shortcut: '⌘Y', action: () => exec('redo') },
      { label: 'Couper', shortcut: '⌘X', sep: true, action: () => exec('cut') },
      { label: 'Copier', shortcut: '⌘C', action: () => exec('copy') },
      { label: 'Coller', shortcut: '⌘V', action: () => exec('paste') },
      { label: 'Tout sélectionner', shortcut: '⌘A', sep: true, action: () => exec('selectAll') },
    ],
    Affichage: [
      { label: 'Zoom avant', action: () => setZoom(z => Math.min(200, z + 10)) },
      { label: 'Zoom arrière', action: () => setZoom(z => Math.max(50, z - 10)) },
      { label: 'Zoom 100 %', action: () => setZoom(100) },
    ],
    Insertion: [
      { label: 'Image…', action: insertImage },
      { label: 'Lien…', action: insertLink },
      { label: 'Séparateur', action: () => exec('insertHorizontalRule') },
      { label: 'Date du jour', sep: true, action: () => exec('insertText', new Date().toLocaleDateString('fr-FR')) },
    ],
    Format: [
      { label: 'Gras', shortcut: '⌘B', action: () => exec('bold') },
      { label: 'Italique', shortcut: '⌘I', action: () => exec('italic') },
      { label: 'Souligné', shortcut: '⌘U', action: () => exec('underline') },
      { label: 'Barré', action: () => exec('strikeThrough') },
      { label: 'Titre 1', sep: true, action: () => block('<h1>') },
      { label: 'Titre 2', action: () => block('<h2>') },
      { label: 'Corps de texte', action: () => block('<p>') },
      { label: 'Citation', action: () => block('<blockquote>') },
    ],
  };
  const runMenu = (item: MItem) => { item.action(); setOpenMenu(null); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--panel)' }}>
      <style>{`
        .lyo-page h1{font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1a1a1a;margin:0 0 6px}
        .lyo-page h2{font-family:Georgia,serif;font-size:17px;font-weight:600;color:#1a1a1a;margin:18px 0 6px}
        .lyo-page h3{font-family:Georgia,serif;font-size:14px;font-weight:600;color:#444;margin:14px 0 4px}
        .lyo-page p{font-family:Georgia,serif;font-size:14px;line-height:1.85;color:#2c2c2a;margin:0 0 10px;text-align:justify}
        .lyo-page ul,.lyo-page ol{font-family:Georgia,serif;font-size:14px;line-height:1.85;color:#2c2c2a;margin:0 0 10px 22px}
        .lyo-page blockquote{border-left:3px solid #5b50e8;background:rgba(91,80,232,.05);margin:12px 0;padding:8px 14px;font-style:italic;color:#555}
        .lyo-page pre{font-family:'JetBrains Mono',monospace;font-size:12.5px;background:#F1EFE8;border-radius:6px;padding:12px 14px;white-space:pre-wrap;color:#3C3489;margin:0 0 10px}
        .lyo-page hr{border:none;border-top:1px solid #ddd;margin:14px 0}
        .lyo-page img{max-width:100%;border-radius:4px}
        .lyo-page:focus{outline:none}
      `}</style>

      {/* Barre de titre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, height: 38, padding: '0 8px', background: 'var(--panel2)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {openMenu && <div onMouseDown={() => setOpenMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}
          {Object.keys(menus).map(m => (
            <div key={m} style={{ position: 'relative' }}>
              <span
                onMouseDown={e => { e.preventDefault(); setOpenMenu(o => (o === m ? null : m)); }}
                onMouseEnter={() => { if (openMenu) setOpenMenu(m); }}
                style={{ fontSize: 12.5, color: openMenu === m ? 'var(--ink)' : 'var(--sub2)', background: openMenu === m ? 'var(--panel)' : 'transparent', padding: '0 9px', height: 38, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >{m}</span>
              {openMenu === m && (
                <div style={{ position: 'absolute', top: 38, left: 0, zIndex: 41, minWidth: 210, background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 10, boxShadow: 'var(--shadow-md)', padding: '5px 0' }}>
                  {menus[m].map((it, i) => (
                    <div key={i}>
                      {it.sep && <div style={{ height: 1, background: 'var(--line)', margin: '5px 0' }} />}
                      <div
                        onMouseDown={e => { e.preventDefault(); runMenu(it); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 13px', fontSize: 12.5, color: 'var(--ink2)', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ flex: 1 }}>{it.label}</span>
                        {it.shortcut && <span style={{ fontSize: 11, color: 'var(--sub2)' }}>{it.shortcut}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); latest.current.title = e.target.value; markDirty(); }}
          onBlur={doSave}
          style={{ flex: 1, textAlign: 'center', fontSize: 13, color: 'var(--ink)', fontWeight: 600, border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", minWidth: 0 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--sub2)', whiteSpace: 'nowrap' }}>{status}</span>
          <button onClick={doSave} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>Enregistrer</button>
          {doc.author && <span style={{ width: 24, height: 24, borderRadius: '50%', background: doc.author.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={doc.author.name}>{doc.author.initials}</span>}
          <button onClick={onDelete} title="Supprimer" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 4 }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>
      </div>

      {/* Onglets du ruban */}
      <div style={{ display: 'flex', padding: '0 8px', background: 'var(--panel2)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {['Accueil', 'Insertion', 'Mise en page', 'Affichage'].map(t => (
          <span key={t} onClick={() => setRibbonTab(t)} style={{ fontSize: 12, padding: '6px 12px', cursor: 'pointer', color: ribbonTab === t ? 'var(--accent-ink)' : 'var(--sub2)', borderBottom: `2px solid ${ribbonTab === t ? 'var(--accent)' : 'transparent'}`, marginBottom: -1 }}>{t}</span>
        ))}
      </div>

      {/* Ruban */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: '6px 8px', background: 'var(--panel2)', borderBottom: '1px solid var(--line)', flexShrink: 0, flexWrap: 'wrap', minHeight: 58 }}>
        {ribbonTab === 'Accueil' && (
          <>
            <RibbonGroup label="Police">
              <select onChange={e => exec('fontName', e.target.value)} title="Police" style={selStyle}>
                <option>Georgia</option><option>Arial</option><option>Times New Roman</option><option>Calibri</option><option>Courier New</option>
              </select>
              <select onChange={e => exec('fontSize', e.target.value)} defaultValue="3" title="Taille" style={{ ...selStyle, width: 46 }}>
                <option value="1">10</option><option value="2">12</option><option value="3">14</option><option value="4">16</option><option value="5">18</option><option value="6">24</option><option value="7">32</option>
              </select>
              <Rb onClick={() => exec('bold')} title="Gras"><strong>G</strong></Rb>
              <Rb onClick={() => exec('italic')} title="Italique"><em>I</em></Rb>
              <Rb onClick={() => exec('underline')} title="Souligné"><span style={{ textDecoration: 'underline' }}>S</span></Rb>
              <Rb onClick={() => exec('strikeThrough')} title="Barré"><span style={{ textDecoration: 'line-through' }}>S</span></Rb>
              <label title="Couleur du texte" style={{ width: 26, height: 26, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', color: 'var(--sub2)' }}>
                <span style={{ fontWeight: 700 }}>A</span>
                <input type="color" onChange={e => exec('foreColor', e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
            </RibbonGroup>

            <RibbonGroup label="Paragraphe">
              <Rb onClick={() => exec('justifyLeft')} title="Aligner à gauche"><AlignIcon d="left" /></Rb>
              <Rb onClick={() => exec('justifyCenter')} title="Centrer"><AlignIcon d="center" /></Rb>
              <Rb onClick={() => exec('justifyRight')} title="Aligner à droite"><AlignIcon d="right" /></Rb>
              <Rb onClick={() => exec('justifyFull')} title="Justifier"><AlignIcon d="full" /></Rb>
              <span style={sepStyle} />
              <Rb onClick={() => exec('insertUnorderedList')} title="Liste à puces">•≡</Rb>
              <Rb onClick={() => exec('insertOrderedList')} title="Liste numérotée">1.</Rb>
              <Rb onClick={() => exec('outdent')} title="Diminuer le retrait">⇤</Rb>
              <Rb onClick={() => exec('indent')} title="Augmenter le retrait">⇥</Rb>
            </RibbonGroup>

            <RibbonGroup label="Styles">
              <Rb wide onClick={() => block('<h1>')} title="Titre 1">Titre 1</Rb>
              <Rb wide onClick={() => block('<h2>')} title="Titre 2">Titre 2</Rb>
              <Rb wide onClick={() => block('<h3>')} title="Sous-titre">Sous-titre</Rb>
              <Rb wide onClick={() => block('<p>')} title="Corps du texte">Corps</Rb>
              <Rb wide onClick={() => block('<blockquote>')} title="Citation"><em>Citation</em></Rb>
            </RibbonGroup>
          </>
        )}

        {ribbonTab === 'Insertion' && (
          <RibbonGroup label="Insertion">
            <Rb wide onClick={insertImage} title="Image">🖼 Image</Rb>
            <Rb wide onClick={() => exec('insertHorizontalRule')} title="Séparateur">― Séparateur</Rb>
            <Rb wide onClick={insertLink} title="Lien">🔗 Lien</Rb>
            <Rb wide onClick={() => exec('insertText', new Date().toLocaleDateString('fr-FR'))} title="Date du jour">📅 Date</Rb>
          </RibbonGroup>
        )}

        {(ribbonTab === 'Mise en page' || ribbonTab === 'Affichage') && (
          <RibbonGroup label="Zoom">
            <Rb onClick={() => setZoom(z => Math.max(50, z - 10))} title="Dézoomer">−</Rb>
            <span style={{ fontSize: 11.5, color: 'var(--sub2)', minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
            <Rb onClick={() => setZoom(z => Math.min(200, z + 10))} title="Zoomer">+</Rb>
            <span style={sepStyle} />
            <Rb wide onClick={() => setZoom(100)} title="Taille réelle">100 %</Rb>
            <Rb wide onClick={() => setZoom(140)} title="Agrandir">140 %</Rb>
          </RibbonGroup>
        )}
      </div>

      {/* Règle */}
      <div style={{ height: 18, background: 'var(--panel2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 540 * (zoom / 100), maxWidth: '90%', height: 6, background: 'repeating-linear-gradient(90deg, var(--line2) 0 1px, transparent 1px 44px)', borderRadius: 2, opacity: 0.7 }} />
      </div>

      {/* Espace de travail + page */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
          <div style={{ background: '#fff', width: 620, minHeight: 720, padding: '56px 64px', boxShadow: '0 1px 8px rgba(0,0,0,0.18)', position: 'relative' }}>
            <div
              ref={pageRef}
              className="lyo-page"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onInput={onInput}
              onBlur={doSave}
              dangerouslySetInnerHTML={{ __html: initialHtml }}
              style={{ minHeight: 600, caretColor: 'var(--accent)' }}
            />
            <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#888780' }}>1</div>
          </div>
        </div>
      </div>

      {/* Barre d'état */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 14px', background: 'var(--panel2)', borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--sub2)', flexShrink: 0 }}>
        <span>Page 1 sur 1</span>
        <span style={{ width: 1, height: 12, background: 'var(--line2)' }} />
        <span>{words} mot{words > 1 ? 's' : ''}</span>
        <span style={{ width: 1, height: 12, background: 'var(--line2)' }} />
        <span>Français (France)</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={zoomBtn} aria-label="Dézoomer">−</button>
          <span style={{ minWidth: 34, textAlign: 'center' }}>{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} style={zoomBtn} aria-label="Zoomer">+</button>
        </div>
      </div>
    </div>
  );
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 10px', borderRight: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>{children}</div>
      <div style={{ fontSize: 10, color: 'var(--sub2)' }}>{label}</div>
    </div>
  );
}

function Rb({ onClick, title, children, wide }: { onClick: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{ height: 26, minWidth: wide ? 'auto' : 26, padding: wide ? '0 8px' : 0, borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--ink2)', fontSize: wide ? 11.5 : 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >{children}</button>
  );
}

function AlignIcon({ d }: { d: 'left' | 'center' | 'right' | 'full' }) {
  const lines: Record<string, string> = {
    left: 'M3 6h18M3 12h12M3 18h15',
    center: 'M3 6h18M6 12h12M5 18h14',
    right: 'M3 6h18M9 12h12M6 18h15',
    full: 'M3 6h18M3 12h18M3 18h18',
  };
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={lines[d]} /></svg>;
}

const selStyle: React.CSSProperties = { fontSize: 12, padding: '3px 5px', borderRadius: 4, border: '1px solid var(--line2)', background: 'var(--panel)', color: 'var(--ink)', cursor: 'pointer', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", width: 92 };
const sepStyle: React.CSSProperties = { width: 1, height: 20, background: 'var(--line2)', margin: '0 3px', display: 'inline-block' };
const zoomBtn: React.CSSProperties = { width: 20, height: 20, borderRadius: 4, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--sub2)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 };

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
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', paddingLeft: 9 + depth * 16, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--ink)' : 'var(--ink2)', background: active ? 'var(--accent-soft)' : 'transparent' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        {childDocs.length > 0 ? (
          <div onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} style={{ cursor: 'pointer', color: 'var(--sub2)', transition: 'transform .15s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        ) : (<div style={{ width: 14 }} />)}
        <span style={{ fontSize: 14 }}>{doc.emoji}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
      </div>
      {expanded && childDocs.map(child => (
        <DocTreeNode key={child.id} doc={child} children={children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}
