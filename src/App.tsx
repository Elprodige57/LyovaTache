import React, { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { flushQueue } from './lib/syncQueue';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TaskDrawer } from './components/TaskDrawer';
import { AIPanel } from './components/AIPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { SearchModal } from './components/SearchModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { Dashboard } from './views/Dashboard';
import { Kanban } from './views/Kanban';
import { Agenda } from './views/Agenda';
import { AutomationsView } from './views/Automations';
import { DocumentsView } from './views/Documents';
import { MyTasks } from './views/MyTasks';
import { ArchivesView } from './views/Archives';
import {
  useWorkspace, useMembers, useFolders, useLabels,
  useBoard, useColumns, useTasks, useTask, useAutomations, useDocuments, useAllTasks, useCurrentMember
} from './hooks/useData';
import type { Task } from './types';

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const MAIN_BOARD_ID = '00000000-0000-0000-0003-000000000001';
const GUEST_MEMBER_ID = '00000000-0000-0000-0001-000000000001'; // Camille (mode démo sans compte)

function AppContent({ session }: { session: Session | null }) {
  const app = useApp();
  const isGuest = !session;

  const { workspace } = useWorkspace(app.refreshCounter);
  const members = useMembers(WORKSPACE_ID, app.refreshCounter);
  const { folders } = useFolders(WORKSPACE_ID, app.refreshCounter);
  const labels = useLabels(WORKSPACE_ID);
  const { automations } = useAutomations(WORKSPACE_ID, app.refreshCounter);
  const { documents } = useDocuments(WORKSPACE_ID, app.refreshCounter);

  const activeBoardId = app.activeBoardId ?? MAIN_BOARD_ID;
  const { board } = useBoard(app.screen === 'board' ? activeBoardId : null, app.refreshCounter);
  const { columns } = useColumns(app.screen === 'board' ? activeBoardId : null, app.refreshCounter);
  const { tasks } = useTasks(
    app.screen === 'board' || app.screen === 'mytasks' || app.screen === 'dashboard' || app.screen === 'archives'
      ? activeBoardId
      : null,
    app.refreshCounter
  );
  const { task: selectedTask } = useTask(app.selectedTaskId, app.refreshCounter);

  // Tâches de tous les Bureaux (vue « Mes tâches »)
  const allBoards = folders.flatMap(f => f.boards ?? []);
  const allBoardIds = allBoards.map(b => b.id);
  const { tasks: allTasks } = useAllTasks(app.screen === 'mytasks' ? allBoardIds : [], app.refreshCounter);

  const authedMember = useCurrentMember(
    session?.user.id ?? null,
    session?.user.email ?? null,
    (session?.user.user_metadata?.name as string | undefined) ?? null,
    WORKSPACE_ID,
    app.refreshCounter,
  );
  const currentMember = session ? authedMember : (members.find(m => m.id === GUEST_MEMBER_ID) ?? null);
  const currentMemberId = currentMember?.id ?? '';
  const boardMembers = board?.members ?? [];

  // Apply task overrides
  const effectiveTasks: Task[] = tasks.map(t => {
    const ov = app.taskOverrides[t.id];
    if (!ov) return t;
    return { ...t, ...ov };
  });
  const effectiveAllTasks: Task[] = allTasks.map(t => {
    const ov = app.taskOverrides[t.id];
    return ov ? { ...t, ...ov } : t;
  });

  // Redirection vers le Bureau préféré au chargement (une seule fois)
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (didAutoOpen.current) return;
    const pref = currentMember?.preferred_board_id;
    if (pref && allBoardIds.includes(pref)) {
      didAutoOpen.current = true;
      app.openBoard(pref);
    }
  }, [currentMember, allBoardIds, app]);

  // Rejoue les écritures hors-ligne au retour du réseau (et au chargement)
  useEffect(() => {
    const doFlush = async () => { const n = await flushQueue(); if (n > 0) app.refreshAll(); };
    window.addEventListener('online', doFlush);
    if (navigator.onLine) doFlush();
    return () => window.removeEventListener('online', doFlush);
  }, [app]);

  const isBoard = app.screen === 'board';

  // ⌘K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        app.toggleSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app]);

  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100%', overflow: 'hidden',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      background: 'var(--bg)', color: 'var(--ink)',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Sidebar */}
      {!app.collapsed && !app.focus && (
        <Sidebar workspace={workspace} folders={folders} currentMember={currentMember} />
      )}

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

        {/* Focus exit button */}
        {app.focus && (
          <div
            onClick={app.toggleFocus}
            title="Quitter le plein écran"
            style={{
              position: 'absolute', top: 14, right: 16, zIndex: 35,
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--panel)', border: '1px solid var(--line2)',
              borderRadius: 9, padding: '8px 13px', cursor: 'pointer',
              boxShadow: 'var(--shadow-md)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink2)',
              transition: 'background .1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel)')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 9 4 4M4 9V4h5M15 9l5-5M20 9V4h-5M9 15l-5 5M4 15v5h5M15 15l5 5M20 15v5h-5" />
            </svg>
            Quitter
          </div>
        )}

        {/* Header */}
        {!app.focus && (
          <Header
            board={board}
            members={boardMembers}
            labels={labels}
            isBoard={isBoard}
            folders={folders}
            workspaceId={WORKSPACE_ID}
            currentMemberId={currentMemberId}
          />
        )}

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {app.screen === 'dashboard' && (
            <Dashboard folders={folders} members={members} allTasks={effectiveTasks} />
          )}

          {app.screen === 'mytasks' && (
            <MyTasks tasks={effectiveAllTasks} currentMemberId={currentMemberId} />
          )}

          {app.screen === 'documents' && (
            <DocumentsView documents={documents} />
          )}

          {app.screen === 'notifications' && (
            <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 28px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
              <NotificationsPlaceholder />
            </div>
          )}

          {app.screen === 'archives' && (
            <ArchivesView tasks={effectiveTasks} />
          )}

          {isBoard && app.boardView === 'kanban' && (
            <Kanban columns={columns} tasks={effectiveTasks} members={members} />
          )}

          {isBoard && app.boardView === 'agenda' && (
            <Agenda tasks={effectiveTasks} columns={columns} />
          )}

          {isBoard && app.boardView === 'automations' && (
            <AutomationsView automations={automations} />
          )}
        </div>
      </main>

      {/* Task drawer */}
      {app.selectedTaskId && (
        <TaskDrawer
          task={selectedTask}
          columns={columns}
          currentMember={currentMember}
          allLabels={labels}
        />
      )}

      {/* AI panel */}
      {app.aiOpen && <AIPanel />}

      {/* Settings panel */}
      {app.settingsOpen && <SettingsPanel boards={allBoards} members={members} labels={labels} currentMember={currentMember} currentMemberId={currentMemberId} workspace={workspace} isGuest={isGuest} />}

      {/* Search modal */}
      {app.searchOpen && <SearchModal tasks={effectiveTasks} folders={folders} documents={documents} />}

      {/* Create folder modal */}
      {app.createFolderOpen && <CreateFolderModal workspaceId={WORKSPACE_ID} />}
    </div>
  );
}

function NotificationsPlaceholder() {
  const [read, setRead] = React.useState<Set<number>>(new Set([3, 4]));
  const notifications = [
    { icon: '💬', text: 'Hugo a commenté « Sessions PostgreSQL »', time: 'il y a 12 min' },
    { icon: '🔄', text: 'Naïma a déplacé « Liaison inter-bureaux » en revue', time: 'il y a 40 min' },
    { icon: '⚠️', text: 'Tâche « Authentification » en retard de 1 jour', time: 'il y a 1 h' },
    { icon: '✅', text: 'Hugo a complété « Sessions PostgreSQL »', time: 'hier' },
    { icon: '👤', text: 'Tomas vous a assigné « Web Push (Service Worker) »', time: 'il y a 2 j' },
  ];
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--ink)' }}>Notifications</span>
        {read.size < notifications.length && (
          <button onClick={() => setRead(new Set(notifications.map((_, i) => i)))} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--line2)', borderRadius: 7, padding: '5px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--sub2)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
            Tout marquer lu
          </button>
        )}
      </div>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {notifications.map((n, i) => {
          const isRead = read.has(i);
          return (
            <div key={i} onClick={() => setRead(prev => { const s = new Set(prev); s.add(i); return s; })} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
              borderBottom: i < notifications.length - 1 ? '1px solid var(--line)' : 'none',
              background: isRead ? 'transparent' : 'var(--accent-soft)',
              cursor: 'pointer', transition: 'background .1s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = isRead ? 'transparent' : 'var(--accent-soft)')}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: isRead ? 400 : 600 }}>{n.text}</div>
                <div style={{ fontSize: 11.5, color: 'var(--sub2)', marginTop: 2 }}>{n.time}</div>
              </div>
              {!isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [guest, setGuest] = useState(() => localStorage.getItem('lyova_guest') === '1');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) { localStorage.removeItem('lyova_guest'); setGuest(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const enterGuest = () => { localStorage.setItem('lyova_guest', '1'); setGuest(true); };

  if (!guest && session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--sub2)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontWeight: 600 }}>
        Chargement…
      </div>
    );
  }

  if (!guest && !session) return <LoginScreen onGuest={enterGuest} />;

  return (
    <AppProvider>
      <AppContent session={session ?? null} />
    </AppProvider>
  );
}
