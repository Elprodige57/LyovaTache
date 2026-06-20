import React from 'react';
import { useApp } from '../context/AppContext';
import type { Workspace, Folder, Member } from '../types';

interface SidebarProps {
  workspace: Workspace | null;
  folders: Folder[];
  currentMember: Member | null;
}

function Icon({ d, size = 16, stroke = 'currentColor', fill = 'none', sw = 2 }: { d: string; size?: number; stroke?: string; fill?: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split('|').map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
}

export function Sidebar({ workspace, folders, currentMember }: SidebarProps) {
  const app = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z', screen: 'dashboard' as const },
    { id: 'mytasks', label: 'Mes tâches', icon: 'M9 11l3 3L22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', screen: 'mytasks' as const, badge: 8 },
    { id: 'notifications', label: 'Notifications', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.7 21a2 2 0 0 1-3.4 0', screen: 'notifications' as const, badge: 3, badgeAccent: true },
    { id: 'documents', label: 'Documents', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6', screen: 'documents' as const },
    { id: 'archives', label: 'Archives', icon: 'M3 4h18v5H3z|M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9|M10 13h4', screen: 'archives' as const },
  ];

  const allBoards = folders.flatMap(f => (f.boards || []).map(b => ({ ...b, folderName: f.name })));
  const favoriteBoards = allBoards.slice(0, 2);

  return (
    <aside style={{
      width: 268,
      flexShrink: 0,
      background: 'var(--panel2)',
      borderRight: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
    }}>
      {/* Workspace switcher */}
      <div style={{ padding: '13px 12px 10px' }}>
        <div
          onClick={app.toggleWs}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 9px', borderRadius: 11, cursor: 'pointer',
            transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 8px var(--accent-soft)',
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12l4 4L19 6" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink)' }}>
              {workspace?.name || 'Lyova Tech'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--sub2)', fontWeight: 500 }}>{workspace?.plan}</span>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="2">
            <path d="M7 9l5-5 5 5M7 15l5 5 5-5" />
          </svg>
          <div
            onClick={e => { e.stopPropagation(); app.toggleSidebar(); }}
            title="Réduire"
            style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" /><path d="M9 6v12" />
            </svg>
          </div>
        </div>

        {/* Workspace dropdown */}
        {app.wsOpen && (
          <div style={{
            marginTop: 6, background: 'var(--panel)',
            border: '1px solid var(--line)', borderRadius: 11, padding: 5,
            boxShadow: 'var(--shadow-md)', animation: 'lyPop .15s ease',
          }}>
            {[
              { name: 'Lyova Tech', color: '#5b50e8', initial: 'L', active: true },
              { name: 'Studio Perso', color: '#f59e0b', initial: 'S', active: false },
              { name: 'Client — Acme', color: '#10b981', initial: 'A', active: false },
            ].map(w => (
              <div
                key={w.name}
                onClick={() => app.toggleWs()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                  background: w.active ? 'var(--soft)' : 'transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = w.active ? 'var(--soft)' : 'transparent')}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: w.color, color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{w.initial}</div>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: 'var(--ink)' }}>{w.name}</span>
                {w.active && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12l4 4L19 6" />
                  </svg>
                )}
              </div>
            ))}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 8px', borderRadius: 8, cursor: 'pointer', color: 'var(--sub)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 7,
                border: '1.5px dashed var(--line2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Nouvel espace</span>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '0 12px 8px' }}>
        <div
          onClick={app.toggleSearch}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'var(--soft)', border: '1px solid var(--line)',
            borderRadius: 10, padding: '8px 11px', cursor: 'pointer',
            transition: 'border-color .1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <span style={{ fontSize: 13, color: 'var(--sub2)', flex: 1 }}>Rechercher…</span>
          <span style={{
            fontSize: 10.5, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--faint)', background: 'var(--panel)',
            border: '1px solid var(--line)', borderRadius: 5, padding: '1px 5px',
          }}>⌘K</span>
        </div>
      </div>

      {/* Nav + folders */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 10px 10px' }}>
        {/* Main nav */}
        {navItems.map(item => {
          const active = app.screen === item.screen;
          return (
            <div
              key={item.id}
              onClick={() => app.goTo(item.screen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                fontSize: 13.5, fontWeight: active ? 700 : 600,
                color: active ? 'var(--accent)' : 'var(--ink2)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                marginBottom: 1, transition: 'background .1s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon d={item.icon} size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge != null && (
                <span style={{
                  background: item.badgeAccent ? 'var(--accent)' : 'var(--soft2)',
                  color: item.badgeAccent ? '#fff' : 'var(--sub)',
                  fontSize: 10.5, fontWeight: 700,
                  minWidth: 18, height: 18, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>{item.badge}</span>
              )}
            </div>
          );
        })}

        {/* Favoris */}
        <div style={{ padding: '14px 8px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--faint)" stroke="none">
            <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.3 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--sub2)', flex: 1 }}>Favoris</span>
        </div>
        {favoriteBoards.map(board => {
          const active = app.screen === 'board' && app.activeBoardId === board.id;
          return (
            <div
              key={board.id}
              onClick={() => app.openBoard(board.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 600,
                color: active ? 'var(--accent)' : 'var(--ink2)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                transition: 'background .1s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 3, background: board.color, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{board.name}</span>
            </div>
          );
        })}

        {/* Folders */}
        <div style={{ padding: '14px 8px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--sub2)', flex: 1 }}>Dossiers</span>
          <div
            onClick={app.toggleCreateFolder}
            title="Nouveau dossier"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sub2)', transition: 'background .1s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </div>
        {folders.map(folder => (
          <div key={folder.id} style={{ marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 12.5, fontWeight: 700, color: 'var(--ink2)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="2">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{folder.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer le dossier « ${folder.name} » et tous ses Bureaux ? Action irréversible.`)) app.deleteFolder(folder.id); }}
                title="Supprimer le dossier"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 2, borderRadius: 5 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </button>
            </div>
            {(folder.boards || []).map(board => {
              const active = app.screen === 'board' && app.activeBoardId === board.id;
              return (
                <div
                  key={board.id}
                  onClick={() => app.openBoard(board.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 10px 7px 15px', margin: '1px 0',
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: active ? 700 : 600,
                    color: active ? 'var(--accent)' : 'var(--ink2)',
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: board.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{board.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600 }}>{(board as Board & { taskCount?: number }).taskCount ?? ''}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* AI launcher */}
      <div style={{ padding: '10px 12px 6px' }}>
        <div
          onClick={app.openAI}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
            background: 'linear-gradient(110deg, var(--accent), #8b5cf6)',
            color: '#fff', boxShadow: '0 4px 14px var(--accent-soft)',
            transition: 'filter .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" />
            <path d="M19 14l.7 1.8L21.5 16l-1.8.7L19 18l-.7-1.3L16.5 16l1.8-.5z" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Assistant Lyova IA</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>Demandez ce que vous voulez</span>
          </div>
        </div>
      </div>

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--line)', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: currentMember?.color ?? 'var(--accent)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {currentMember?.initials ?? 'CR'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>
            {currentMember?.name ?? 'Camille Royer'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--sub2)', fontWeight: 500 }}>{currentMember?.role ?? 'Propriétaire'}</span>
        </div>
        <ThemeToggle />
        <div
          onClick={app.toggleSettings}
          title="Paramètres"
          style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sub)', transition: 'background .1s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
      </div>
    </aside>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  return (
    <div
      onClick={toggleTheme}
      title="Thème"
      style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sub)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </div>
  );
}

// Re-export type for boards with taskCount
interface Board {
  id: string;
  name: string;
  color: string;
  taskCount?: number;
}
