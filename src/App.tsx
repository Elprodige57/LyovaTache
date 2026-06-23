import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { DialogHost } from './lib/dialog';
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
import { Stats } from './views/Stats';
import { Kanban } from './views/Kanban';
import { Agenda } from './views/Agenda';
import { AutomationsView } from './views/Automations';
import { DocumentsView } from './views/Documents';
import { MyTasks } from './views/MyTasks';
import { ArchivesView } from './views/Archives';
import {
  useWorkspace, useMembers, useFolders, useLabels,
  useBoard, useColumns, useTasks, useTask, useAutomations, useDocuments, useAllTasks, useCurrentMember, useNotifications, useWorkspaces
} from './hooks/useData';
import type { Task, Notification } from './types';

const MAIN_BOARD_ID = '00000000-0000-0000-0003-000000000001';
const GUEST_MEMBER_ID = '00000000-0000-0000-0001-000000000001'; // Camille (mode démo sans compte)

function AppContent({ session }: { session: Session | null }) {
  const app = useApp();
  const isGuest = !session;
  const WORKSPACE_ID = app.activeWorkspaceId; // espace de travail actif (dynamique)

  const { workspace } = useWorkspace(WORKSPACE_ID, app.refreshCounter);
  const workspaces = useWorkspaces(app.refreshCounter);
  const members = useMembers(WORKSPACE_ID, app.refreshCounter);
  const { folders } = useFolders(WORKSPACE_ID, app.refreshCounter);
  const labels = useLabels(WORKSPACE_ID, app.refreshCounter);
  const { automations } = useAutomations(WORKSPACE_ID, app.refreshCounter);
  const { documents } = useDocuments(WORKSPACE_ID, app.refreshCounter);
  const notifications = useNotifications(WORKSPACE_ID, app.refreshCounter);

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
  const currentMember = session ? authedMember : (members.find(m => m.id === GUEST_MEMBER_ID) ?? members[0] ?? null);
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
    const doFlush = async () => { const n = await flushQueue(); if (n > 0) { app.clearPendingTasks(); app.refreshAll(); } };
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
        <Sidebar workspace={workspace} workspaces={workspaces} activeWorkspaceId={app.activeWorkspaceId} folders={folders} currentMember={currentMember} notifUnread={notifications.filter(n => !n.is_read).length} />
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

          {app.screen === 'stats' && (
            <Stats folders={folders} members={members} />
          )}

          {app.screen === 'mytasks' && (
            <MyTasks tasks={effectiveAllTasks} currentMemberId={currentMemberId} />
          )}

          {app.screen === 'documents' && (
            <DocumentsView documents={documents} />
          )}

          {app.screen === 'notifications' && (
            <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 28px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
              <NotificationsView notifications={notifications} workspaceId={WORKSPACE_ID} />
            </div>
          )}

          {app.screen === 'archives' && (
            <ArchivesView tasks={effectiveTasks} />
          )}

          {isBoard && app.boardView === 'kanban' && (
            <Kanban columns={columns} tasks={[...effectiveTasks, ...app.pendingTasks.filter(p => p.board_id === activeBoardId)]} members={members} />
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

      <DialogHost />
    </div>
  );
}

function NotificationsView({ notifications, workspaceId }: { notifications: Notification[]; workspaceId: string }) {
  const app = useApp();
  const unread = notifications.filter(n => !n.is_read).length;
  const timeAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h} h`;
    return `il y a ${Math.floor(h / 24)} j`;
  };
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--ink)' }}>Notifications</span>
        {unread > 0 && (
          <button onClick={() => app.markAllNotifsRead(workspaceId)} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--line2)', borderRadius: 7, padding: '5px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--sub2)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
            Tout marquer lu
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--sub2)', fontSize: 14 }}>Aucune notification.</div>
      ) : (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          {notifications.map((n, i) => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: i < notifications.length - 1 ? '1px solid var(--line)' : 'none', background: n.is_read ? 'transparent' : 'var(--accent-soft)', transition: 'background .1s' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
              <div style={{ flex: 1, minWidth: 0, cursor: n.is_read ? 'default' : 'pointer' }} onClick={() => { if (!n.is_read) app.markNotifRead(n.id); }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: n.is_read ? 400 : 600 }}>{n.message}</div>
                <div style={{ fontSize: 11.5, color: 'var(--sub2)', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
              <button onClick={() => app.removeNotification(n.id)} title="Supprimer" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 2, borderRadius: 5, flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Par défaut on entre directement dans l'app (mode démo). L'écran de connexion
  // ne s'affiche que si l'utilisateur le demande explicitement (lyova_mode = 'login').
  const [guest, setGuest] = useState(() => localStorage.getItem('lyova_mode') !== 'login');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) { localStorage.removeItem('lyova_mode'); setGuest(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const enterGuest = () => { localStorage.removeItem('lyova_mode'); setGuest(true); };

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
