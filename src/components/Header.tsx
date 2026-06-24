import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { createMember, addBoardMember, createBoard, createFolder, useDocumentLinks, linkDocument, unlinkDocument } from '../hooks/useData';
import { getQueueSize, subscribeQueue } from '../lib/syncQueue';
import type { Board, Member, Label, Folder, Document } from '../types';

interface HeaderProps {
  board?: Board | null;
  members?: Member[];
  labels?: Label[];
  isBoard: boolean;
  folders?: Folder[];
  workspaceId?: string;
  currentMemberId?: string;
  allDocuments?: Document[];
}

const BOARD_COLORS = ['#5b50e8','#0ea5e9','#10b981','#f59e0b','#f43f5e','#8b5cf6','#14b8a6'];

export function Header({ board, members = [], labels = [], isBoard, folders = [], workspaceId, currentMemberId, allDocuments = [] }: HeaderProps) {
  const app = useApp();
  const [docPanelOpen, setDocPanelOpen] = useState(false);
  const boardDocs = useDocumentLinks('board', isBoard ? board?.id : null, app.refreshCounter);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardFolder, setNewBoardFolder] = useState('');
  const [newBoardColor, setNewBoardColor] = useState(BOARD_COLORS[0]);
  const [savingBoard, setSavingBoard] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [savingInvite, setSavingInvite] = useState(false);
  const [showDeleteBoard, setShowDeleteBoard] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [showEditBoard, setShowEditBoard] = useState(false);
  const [editBoardName, setEditBoardName] = useState('');
  const [editBoardColor, setEditBoardColor] = useState(BOARD_COLORS[0]);
  const [savingEditBoard, setSavingEditBoard] = useState(false);

  // Pré-remplit la modale d'édition à l'ouverture
  useEffect(() => {
    if (showEditBoard && board) { setEditBoardName(board.name); setEditBoardColor(board.color); }
  }, [showEditBoard, board]);

  // Réinitialise le formulaire quand la modale « Nouveau Bureau » s'ouvre (depuis le Header ou le tableau de bord)
  useEffect(() => {
    if (app.createBoardOpen) {
      setNewBoardName('');
      setNewBoardFolder(folders[0]?.id || '');
      setNewBoardColor(BOARD_COLORS[0]);
    }
  }, [app.createBoardOpen, folders]);

  const headers: Record<string, { title: string; sub: string; cta: string }> = {
    dashboard: { title: 'Tableau de bord', sub: 'Vue d\'ensemble · ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), cta: 'Nouveau Bureau' },
    mytasks: { title: 'Mes tâches', sub: 'Tâches assignées', cta: 'Nouvelle tâche' },
    notifications: { title: 'Notifications', sub: '3 non lues', cta: 'Tout marquer lu' },
    documents: { title: 'Documents', sub: 'Wiki & comptes-rendus', cta: 'Nouvelle page' },
    archives: { title: 'Archives', sub: 'Tâches archivées', cta: 'Restaurer' },
  };

  const h = isBoard
    ? { title: board?.name ?? '', sub: '', cta: 'Tâche' }
    : (headers[app.screen] ?? { title: '', sub: '', cta: '' });

  const tabs = [
    { key: 'kanban', label: 'Tableau', icon: 'M3 4h5v16H3z|M10 4h5v11h-5z|M17 4h4v14h-4z' },
    { key: 'agenda', label: 'Agenda', icon: 'M3 4h18v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4z|M3 10h18M8 2v4M16 2v4' },
    { key: 'automations', label: 'Automatisations', icon: 'M13 2 3 14h7l-1 8 10-12h-7z' },
  ];

  const handleCTA = () => {
    if (isBoard) {
      setShowNewTask(true);
      setNewTaskTitle('');
    } else if (app.screen === 'dashboard') {
      app.openCreateBoard();
    } else if (app.screen === 'documents') {
      app.addDocument(workspaceId || '00000000-0000-0000-0000-000000000001', 'Nouvelle page', '📝', null, currentMemberId || null);
    } else if (app.screen === 'mytasks') {
      setShowNewTask(true);
      setNewTaskTitle('');
    }
  };

  const handleSaveTask = async () => {
    const t = newTaskTitle.trim();
    if (!t || savingTask) return;
    setSavingTask(true);
    const boardId = app.activeBoardId || '00000000-0000-0000-0003-000000000001';
    const colId = '00000000-0000-0000-0004-000000000001';
    await app.addTask(colId, boardId, t);
    setNewTaskTitle('');
    setShowNewTask(false);
    setSavingTask(false);
  };

  const handleSaveBoard = async () => {
    const n = newBoardName.trim();
    if (!n || savingBoard) return;
    setSavingBoard(true);
    const ws = workspaceId || '00000000-0000-0000-0000-000000000001';
    // Si aucun dossier n'existe/n'est sélectionné, on en crée un par défaut
    let folderId = newBoardFolder;
    if (!folderId) {
      const { data: f } = await createFolder(ws, 'Mes Bureaux', 0);
      folderId = f?.id ?? '';
    }
    const { data: b } = await createBoard(folderId, n, newBoardColor, '', 99);
    app.closeCreateBoard();
    setSavingBoard(false);
    app.refreshAll();
    if (b?.id) app.openBoard(b.id); // ouvre le nouveau Bureau (retour visuel clair)
  };

  const INVITE_COLORS = ['#5b50e8', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#ec4899'];
  const handleSaveInvite = async () => {
    const name = inviteName.trim();
    if (!name || savingInvite) return;
    setSavingInvite(true);
    const initials = name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
    const color = INVITE_COLORS[Math.floor(Math.random() * INVITE_COLORS.length)];
    const { data } = await createMember(workspaceId || '00000000-0000-0000-0000-000000000001', name, initials, color, 'Membre');
    if (data && app.activeBoardId) await addBoardMember(app.activeBoardId, data.id);
    setShowInvite(false);
    setSavingInvite(false);
    app.refreshAll();
  };

  const handleDeleteBoard = async () => {
    if (!board || deletingBoard) return;
    setDeletingBoard(true);
    await app.deleteBoard(board.id);
    setDeletingBoard(false);
    setShowDeleteBoard(false);
  };

  const handleSaveEditBoard = async () => {
    if (!board || !editBoardName.trim() || savingEditBoard) return;
    setSavingEditBoard(true);
    await app.updateBoard(board.id, { name: editBoardName.trim(), color: editBoardColor });
    setSavingEditBoard(false);
    setShowEditBoard(false);
  };

  return (
    <header style={{ flexShrink: 0, borderBottom: '1px solid var(--line)', background: 'var(--panel)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", position: 'relative', zIndex: 20 }}>
      <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14 }}>
        {app.collapsed && (
          <div onClick={app.toggleSidebar} title="Afficher le menu" style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sub)', flexShrink: 0, transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </div>
        )}

        {isBoard && board && <span style={{ width: 11, height: 11, borderRadius: 3, background: board.color, flexShrink: 0 }} />}

        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {isBoard && board?.folder && (
              <>
                <span style={{ fontSize: 12, color: 'var(--sub2)', fontWeight: 600 }}>{board.folder.name}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </>
            )}
            <span style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{h.title}</span>
          </div>
          {h.sub && <span style={{ fontSize: 12, color: 'var(--sub2)', fontWeight: 500 }}>{h.sub}</span>}
        </div>

        {/* View tabs — board only */}
        {isBoard && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 18, background: 'var(--soft)', borderRadius: 10, padding: 3 }}>
            {tabs.map(tab => {
              const active = app.boardView === tab.key;
              return (
                <div key={tab.key} onClick={() => app.setBoardView(tab.key as 'kanban' | 'agenda' | 'automations')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: active ? 'var(--ink)' : 'var(--sub)', background: active ? 'var(--panel)' : 'transparent', boxShadow: active ? 'var(--shadow)' : 'none', transition: 'all .1s' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {tab.icon.split('|').map((d, i) => <path key={i} d={d} />)}
                  </svg>
                  {tab.label}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <OfflineBadge />
          <PendingSyncBadge />
          {/* Board members */}
          {isBoard && members.length > 0 && (
            <div style={{ display: 'flex' }}>
              {members.slice(0, 5).map((m, i) => (
                <div key={m.id} title={m.name} style={{ width: 29, height: 29, borderRadius: '50%', background: m.color, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid var(--panel)', marginLeft: i > 0 ? -8 : 0 }}>{m.initials}</div>
              ))}
            </div>
          )}

          {/* Edit board */}
          {/* Documents liés au Bureau */}
          {isBoard && board && (
            <div style={{ position: 'relative' }}>
              <div onClick={() => setDocPanelOpen(o => !o)} title="Documents liés au Bureau" style={{ height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--line2)', background: docPanelOpen ? 'var(--soft)' : 'var(--panel)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--sub)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Docs{boardDocs.length ? ` · ${boardDocs.length}` : ''}</span>
              </div>
              {docPanelOpen && (
                <>
                  <div onClick={() => setDocPanelOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
                  <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 61, width: 280, maxHeight: 340, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 12, boxShadow: 'var(--shadow-md)', padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Documents liés</div>
                    {boardDocs.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: 'var(--sub2)', marginBottom: 10 }}>Aucun document lié à ce Bureau.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                        {boardDocs.map(d => (
                          <div key={d.linkId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8 }}>
                            <span style={{ fontSize: 14 }}>{d.emoji}</span>
                            <span onClick={() => { app.openDoc(d.id); app.goTo('documents'); setDocPanelOpen(false); }} style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                            <span onClick={async () => { await unlinkDocument(d.linkId); app.refreshAll(); }} title="Délier" style={{ cursor: 'pointer', color: 'var(--sub2)', fontSize: 15 }}>×</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', margin: '4px 0 6px' }}>Lier un document</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 150, overflowY: 'auto' }}>
                      {allDocuments.filter(d => !boardDocs.some(l => l.id === d.id)).map(d => (
                        <div key={d.id} onClick={async () => { await linkDocument(d.id, 'board', board.id); app.refreshAll(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: 'var(--ink2)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span>{d.emoji}</span><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                          <span style={{ fontSize: 14, color: 'var(--accent-ink)' }}>+</span>
                        </div>
                      ))}
                      {allDocuments.filter(d => !boardDocs.some(l => l.id === d.id)).length === 0 && <div style={{ fontSize: 12, color: 'var(--sub2)', padding: '4px 8px' }}>Aucun autre document.</div>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {isBoard && board && (
            <div onClick={() => setShowEditBoard(true)} title="Modifier le Bureau (nom, couleur)" style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid var(--line2)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sub)', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel)')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
            </div>
          )}

          {/* Delete board */}
          {isBoard && board && (
            <div onClick={() => setShowDeleteBoard(true)} title="Supprimer ce Bureau" style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid var(--line2)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel)')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </div>
          )}

          {/* Invite member */}
          {isBoard && (
            <div onClick={() => { setShowInvite(true); setInviteName(''); setInviteEmail(''); }} title="Inviter un membre" style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid var(--line2)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sub)', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel)')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" /></svg>
            </div>
          )}

          {/* AI button */}
          <div onClick={app.openAI} title="Assistant IA" style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid var(--line2)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-ink)', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel)')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" /></svg>
          </div>

          {/* CTA */}
          <button
            onClick={handleCTA}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 15px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'filter .1s' }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.93)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {h.cta}
          </button>
        </div>
      </div>

      {/* Kanban filter bar */}
      {isBoard && app.boardView === 'kanban' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px 11px' }}>
          <FilterMenu labels={labels} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <GroupMenu />
            <DensityToggle />
            <FocusToggle />
            <SortMenu />
          </div>
        </div>
      )}

      {/* New task modal */}
      {showNewTask && (
        <>
          <div onClick={() => setShowNewTask(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 480, background: 'var(--panel)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-md)', animation: 'lyPop .18s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 16 }}>Nouvelle tâche</div>
            <input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveTask(); if (e.key === 'Escape') setShowNewTask(false); }}
              placeholder="Titre de la tâche…"
              autoFocus
              style={{ width: '100%', border: '1px solid var(--accent)', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewTask(false)} style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSaveTask} disabled={!newTaskTitle.trim() || savingTask} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !newTaskTitle.trim() || savingTask ? 0.5 : 1 }}>{savingTask ? '…' : 'Créer'}</button>
            </div>
          </div>
        </>
      )}

      {/* New board modal */}
      {app.createBoardOpen && (
        <>
          <div onClick={() => app.closeCreateBoard()} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 520, background: 'var(--panel)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-md)', animation: 'lyPop .18s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 18 }}>Nouveau Bureau</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sub2)', marginBottom: 6 }}>Nom du bureau</div>
                <input
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveBoard(); if (e.key === 'Escape') app.closeCreateBoard(); }}
                  placeholder="ex: Design system"
                  autoFocus
                  style={{ width: '100%', border: '1px solid var(--accent)', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                />
              </div>
              {folders.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sub2)', marginBottom: 6 }}>Dossier</div>
                  <select
                    value={newBoardFolder}
                    onChange={e => setNewBoardFolder(e.target.value)}
                    style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 9, padding: '9px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", cursor: 'pointer' }}
                  >
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sub2)', marginBottom: 8 }}>Couleur</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {BOARD_COLORS.map(c => (
                    <div key={c} onClick={() => setNewBoardColor(c)} style={{ width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer', border: newBoardColor === c ? '3px solid var(--ink)' : '3px solid transparent', transition: 'border .15s' }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => app.closeCreateBoard()} style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSaveBoard} disabled={!newBoardName.trim() || savingBoard} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !newBoardName.trim() || savingBoard ? 0.5 : 1 }}>{savingBoard ? '…' : 'Créer le bureau'}</button>
            </div>
          </div>
        </>
      )}
      {/* Edit board modal */}
      {showEditBoard && board && (
        <>
          <div onClick={() => setShowEditBoard(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 520, background: 'var(--panel)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-md)', animation: 'lyPop .18s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 18 }}>Modifier le Bureau</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sub2)', marginBottom: 6 }}>Nom du bureau</div>
                <input value={editBoardName} onChange={e => setEditBoardName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveEditBoard(); if (e.key === 'Escape') setShowEditBoard(false); }} autoFocus style={{ width: '100%', border: '1px solid var(--accent)', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sub2)', marginBottom: 8 }}>Couleur</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {BOARD_COLORS.map(c => (
                    <div key={c} onClick={() => setEditBoardColor(c)} style={{ width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer', border: editBoardColor === c ? '3px solid var(--ink)' : '3px solid transparent', transition: 'border .15s' }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowEditBoard(false)} style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSaveEditBoard} disabled={!editBoardName.trim() || savingEditBoard} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !editBoardName.trim() || savingEditBoard ? 0.5 : 1 }}>{savingEditBoard ? '…' : 'Enregistrer'}</button>
            </div>
          </div>
        </>
      )}

      {/* Delete board confirmation */}
      {showDeleteBoard && board && (
        <>
          <div onClick={() => setShowDeleteBoard(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 460, background: 'var(--panel)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-md)', animation: 'lyPop .18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" /></svg>
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--ink)' }}>Supprimer ce Bureau ?</div>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.5, marginBottom: 18 }}>
              <b>« {board.name} »</b> part à la <b>corbeille</b> avec toutes ses colonnes et tâches. Tu peux le <b>restaurer pendant 30 jours</b> ; après quoi il est supprimé définitivement.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteBoard(false)} style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '9px 16px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleDeleteBoard} disabled={deletingBoard} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: deletingBoard ? 0.6 : 1 }}>{deletingBoard ? '…' : 'Mettre à la corbeille'}</button>
            </div>
          </div>
        </>
      )}

      {/* Invite member modal */}
      {showInvite && (
        <>
          <div onClick={() => setShowInvite(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 480, background: 'var(--panel)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-md)', animation: 'lyPop .18s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Inviter un membre</div>
            <div style={{ fontSize: 12.5, color: 'var(--sub2)', marginBottom: 16 }}>Le membre est ajouté à ce Bureau et devient assignable.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveInvite(); if (e.key === 'Escape') setShowInvite(false); }}
                placeholder="Nom complet (ex: Léa Dubois)"
                autoFocus
                style={{ width: '100%', border: '1px solid var(--accent)', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              />
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveInvite(); if (e.key === 'Escape') setShowInvite(false); }}
                placeholder="Email (optionnel)"
                style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowInvite(false)} style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSaveInvite} disabled={!inviteName.trim() || savingInvite} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !inviteName.trim() || savingInvite ? 0.5 : 1 }}>{savingInvite ? '…' : 'Inviter'}</button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div title="Hors-ligne — données en cache, vos modifications se synchroniseront au retour du réseau" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#b45309', background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 7, padding: '5px 10px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
      Hors-ligne
    </div>
  );
}

function PendingSyncBadge() {
  const [n, setN] = useState(getQueueSize());
  useEffect(() => subscribeQueue(setN), []);
  if (n <= 0) return null;
  return (
    <div title="Modifications faites hors-ligne, en attente de synchronisation" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--accent-ink)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 7, padding: '5px 10px' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      {n} en attente
    </div>
  );
}

function GroupMenu() {
  const { groupMode, setGroupMode } = useApp();
  const [open, setOpen] = useState(false);
  const opts: { key: 'status' | 'priority' | 'assignee'; label: string }[] = [
    { key: 'status', label: 'Statut' },
    { key: 'priority', label: 'Priorité' },
    { key: 'assignee', label: 'Assigné' },
  ];
  const active = groupMode !== 'status';
  const current = opts.find(o => o.key === groupMode)?.label ?? 'Statut';

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        title="Grouper les cartes"
        style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', border: `1px solid ${active ? 'var(--accent)' : 'var(--line2)'}`, padding: '5px 10px', borderRadius: 7, color: active ? 'var(--accent-ink)' : 'var(--sub2)', background: active ? 'var(--accent-soft)' : 'transparent', transition: 'all .1s' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
        Grouper : {current}
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 41, width: 170, background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 11, boxShadow: 'var(--shadow-md)', padding: 6, animation: 'lyPop .14s ease' }}>
            {opts.map(o => {
              const sel = groupMode === o.key;
              return (
                <div
                  key={o.key}
                  onClick={() => { setGroupMode(o.key); setOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 9px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: sel ? 'var(--accent-ink)' : 'var(--ink2)', background: sel ? 'var(--accent-soft)' : 'transparent' }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                >
                  {o.label}
                  {sel && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SortMenu() {
  const { sortMode, setSortMode } = useApp();
  const [open, setOpen] = useState(false);
  const opts: { key: 'manual' | 'due' | 'priority' | 'title'; label: string }[] = [
    { key: 'manual', label: 'Manuel' },
    { key: 'due', label: 'Échéance' },
    { key: 'priority', label: 'Priorité' },
    { key: 'title', label: 'Titre (A→Z)' },
  ];
  const active = sortMode !== 'manual';
  const current = opts.find(o => o.key === sortMode)?.label ?? 'Trier';

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        title="Trier les cartes"
        style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', border: `1px solid ${active ? 'var(--accent)' : 'var(--line2)'}`, padding: '5px 10px', borderRadius: 7, color: active ? 'var(--accent-ink)' : 'var(--sub2)', background: active ? 'var(--accent-soft)' : 'transparent', transition: 'all .1s' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M10 18h4" /></svg>
        {active ? `Trier : ${current}` : 'Trier'}
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41, width: 178, background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 11, boxShadow: 'var(--shadow-md)', padding: 6, animation: 'lyPop .14s ease' }}>
            {opts.map(o => {
              const sel = sortMode === o.key;
              return (
                <div
                  key={o.key}
                  onClick={() => { setSortMode(o.key); setOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 9px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: sel ? 'var(--accent-ink)' : 'var(--ink2)', background: sel ? 'var(--accent-soft)' : 'transparent' }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                >
                  {o.label}
                  {sel && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function DensityToggle() {
  const { density, toggleDensity } = useApp();
  const compact = density === 'compact';
  return (
    <div onClick={toggleDensity} title="Densité d'affichage" style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', border: `1px solid ${compact ? 'var(--accent)' : 'var(--line2)'}`, padding: '5px 10px', borderRadius: 7, color: compact ? 'var(--accent-ink)' : 'var(--sub2)', background: compact ? 'var(--accent-soft)' : 'transparent', transition: 'all .1s' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5h18M3 10h18M3 15h18M3 20h18" /></svg>
      {compact ? 'Confort' : 'Compact'}
    </div>
  );
}

function FocusToggle() {
  const { toggleFocus } = useApp();
  return (
    <div onClick={toggleFocus} title="Plein écran" style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', border: '1px solid var(--line2)', padding: '5px 10px', borderRadius: 7, color: 'var(--sub2)', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
      Plein écran
    </div>
  );
}

function FilterMenu({ labels }: { labels: Label[] }) {
  const { filterLabelIds, toggleFilterLabel, clearFilterLabels } = useApp();
  const [open, setOpen] = useState(false);
  const count = filterLabelIds.length;
  const active = count > 0;

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        title="Filtrer par étiquette"
        style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: `1px solid ${active ? 'var(--accent)' : 'var(--line2)'}`, padding: '5px 10px', borderRadius: 7, color: active ? 'var(--accent-ink)' : 'var(--sub2)', background: active ? 'var(--accent-soft)' : 'transparent', transition: 'all .1s' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54z" /></svg>
        Filtrer
        {count > 0 && (
          <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
        )}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ opacity: 0.7 }}><path d="M6 9l6 6 6-6" /></svg>
      </div>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 41, width: 232, background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 11, boxShadow: 'var(--shadow-md)', padding: 6, animation: 'lyPop .14s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 6px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sub2)' }}>Étiquettes</span>
              {count > 0 && (
                <span onClick={clearFilterLabels} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent-ink)', cursor: 'pointer' }}>Effacer</span>
              )}
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {labels.length === 0 && (
                <div style={{ padding: 8, fontSize: 12.5, color: 'var(--sub2)' }}>Aucune étiquette</div>
              )}
              {labels.map(lbl => {
                const checked = filterLabelIds.includes(lbl.id);
                return (
                  <div
                    key={lbl.id}
                    onClick={() => toggleFilterLabel(lbl.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 7, cursor: 'pointer', background: checked ? 'var(--soft)' : 'transparent', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = checked ? 'var(--soft)' : 'transparent')}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${checked ? lbl.color : 'var(--line2)'}`, background: checked ? lbl.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                    </span>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: lbl.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)' }}>{lbl.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
