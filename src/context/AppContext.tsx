import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Screen, BoardView, Theme, Density, Task, Automation } from '../types';
import * as api from '../hooks/useData';
import { runOrQueue } from '../lib/syncQueue';

interface AppState {
  screen: Screen;
  boardView: BoardView;
  activeBoardId: string | null;
  activeWorkspaceId: string;
  selectedTaskId: string | null;
  aiOpen: boolean;
  aiSummaryForTaskId: string | null;
  theme: Theme;
  density: Density;
  collapsed: boolean;
  wsOpen: boolean;
  filterLabelIds: string[];
  sortMode: 'manual' | 'due' | 'priority' | 'title';
  groupMode: 'status' | 'priority' | 'assignee';
  focus: boolean;
  autoTab: 'rules' | 'history';
  builderOpen: boolean;
  selectedDocId: string | null;
  agendaView: 'day' | 'week' | 'month' | 'team';
  calMonth: number;
  calYear: number;
  settingsOpen: boolean;
  searchOpen: boolean;
  createFolderOpen: boolean;
  createBoardOpen: boolean;
  taskOverrides: Record<string, Partial<Task>>;
  pendingTasks: Task[];
  automationOverrides: Record<string, Partial<Automation>>;
  checklistOverrides: Record<string, boolean>;
  refreshCounter: number;
}

interface AppContextValue extends AppState {
  goTo: (screen: Screen, boardView?: BoardView) => void;
  openBoard: (boardId: string) => void;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setBoardView: (view: BoardView) => void;
  openTask: (taskId: string) => void;
  closeTask: () => void;
  openAI: () => void;
  closeAI: () => void;
  summarizeTask: () => void;
  toggleTheme: () => void;
  toggleDensity: () => void;
  toggleSidebar: () => void;
  toggleWs: () => void;
  toggleFilterLabel: (id: string) => void;
  clearFilterLabels: () => void;
  setSortMode: (mode: 'manual' | 'due' | 'priority' | 'title') => void;
  setGroupMode: (mode: 'status' | 'priority' | 'assignee') => void;
  toggleFocus: () => void;
  setAutoTab: (tab: 'rules' | 'history') => void;
  toggleBuilder: () => void;
  openDoc: (id: string) => void;
  setAgendaView: (view: 'day' | 'week' | 'month' | 'team') => void;
  prevMonth: () => void;
  nextMonth: () => void;
  goToday: () => void;
  moveTask: (taskId: string, newColumnId: string) => void;
  moveTaskTo: (taskId: string, columnId: string, position: number) => void;
  toggleAutomation: (automationId: string) => void;
  toggleChecklistItem: (itemId: string, currentValue: boolean) => void;
  toggleSettings: () => void;
  toggleSearch: () => void;
  toggleCreateFolder: () => void;
  openCreateBoard: () => void;
  closeCreateBoard: () => void;
  setPreferredBoard: (memberId: string, boardId: string | null) => Promise<void>;
  // CRUD
  addTask: (columnId: string, boardId: string, title: string) => Promise<void>;
  clearPendingTasks: () => void;
  patchTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  addColumn: (boardId: string, name: string, color: string) => Promise<void>;
  postComment: (taskId: string, memberId: string, content: string) => Promise<void>;
  addChecklistItem: (taskId: string, text: string, position: number) => Promise<void>;
  removeChecklistItem: (itemId: string) => Promise<void>;
  moveChecklistItem: (items: { id: string; position: number }[], itemId: string, dir: -1 | 1) => Promise<void>;
  addTaskLabel: (taskId: string, labelId: string) => Promise<void>;
  removeTaskLabel: (taskId: string, labelId: string) => Promise<void>;
  addTaskAssignee: (taskId: string, memberId: string) => Promise<void>;
  removeTaskAssignee: (taskId: string, memberId: string) => Promise<void>;
  addDocument: (workspaceId: string, title: string, emoji: string, parentId?: string | null, authorId?: string | null) => Promise<void>;
  updateDocument: (docId: string, updates: { title?: string; content?: unknown[]; emoji?: string }) => Promise<void>;
  createBoard: (folderId: string, name: string, color: string, description: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  updateBoard: (boardId: string, updates: { name?: string; color?: string; description?: string }) => Promise<void>;
  updateFolder: (folderId: string, updates: { name?: string }) => Promise<void>;
  updateColumn: (columnId: string, updates: { name?: string; color?: string; wip_limit?: number; position?: number }) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  deleteAutomation: (automationId: string) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  removeComment: (commentId: string, taskId: string) => Promise<void>;
  updateMember: (memberId: string, updates: { name?: string; role?: string }) => Promise<void>;
  createLabel: (workspaceId: string, name: string, color: string) => Promise<void>;
  updateLabel: (labelId: string, updates: { name?: string; color?: string }) => Promise<void>;
  deleteLabel: (labelId: string) => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
  markAllNotifsRead: (workspaceId: string) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  createFolder: (workspaceId: string, name: string) => Promise<void>;
  updateAutomationActive: (automationId: string, active: boolean) => Promise<void>;
  createAutomation: (workspaceId: string, title: string, triggerDesc: string, actionDesc: string) => Promise<void>;
  refreshAll: () => void;
  archiveTask: (taskId: string) => Promise<void>;
  restoreTask: (taskId: string) => Promise<void>;
  toggleTaskDone: (taskId: string, isDone: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    screen: 'dashboard',
    boardView: 'kanban',
    activeBoardId: null,
    activeWorkspaceId: localStorage.getItem('lyova_ws') || '00000000-0000-0000-0000-000000000001',
    selectedTaskId: null,
    aiOpen: false,
    aiSummaryForTaskId: null,
    theme: 'light',
    density: 'comfortable',
    collapsed: false,
    wsOpen: false,
    filterLabelIds: [],
    sortMode: 'manual',
    groupMode: 'status',
    focus: false,
    autoTab: 'rules',
    builderOpen: false,
    selectedDocId: null,
    agendaView: 'month',
    calMonth: 5,
    calYear: 2026,
    settingsOpen: false,
    searchOpen: false,
    createFolderOpen: false,
    createBoardOpen: false,
    taskOverrides: {},
    pendingTasks: [],
    automationOverrides: {},
    checklistOverrides: {},
    refreshCounter: 0,
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.setAttribute('data-density', state.density);
  }, [state.theme, state.density]);

  const refreshAll = useCallback(() => {
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1, taskOverrides: {}, automationOverrides: {}, checklistOverrides: {} }));
  }, []);

  const goTo = useCallback((screen: Screen, boardView?: BoardView) => {
    setState(s => ({ ...s, screen, boardView: boardView ?? s.boardView, selectedTaskId: null, aiOpen: false, wsOpen: false }));
  }, []);

  const openBoard = useCallback((boardId: string) => {
    setState(s => ({ ...s, screen: 'board', boardView: 'kanban', activeBoardId: boardId, selectedTaskId: null, wsOpen: false }));
  }, []);

  const setActiveWorkspace = useCallback((id: string) => {
    try { localStorage.setItem('lyova_ws', id); } catch { /* ignore */ }
    setState(s => ({ ...s, activeWorkspaceId: id, screen: 'dashboard', activeBoardId: null, selectedTaskId: null, wsOpen: false, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const createWorkspace = useCallback(async (name: string) => {
    const { data } = await api.createWorkspace(name);
    if (data) {
      try { localStorage.setItem('lyova_ws', data.id); } catch { /* ignore */ }
      setState(s => ({ ...s, activeWorkspaceId: data.id, screen: 'dashboard', activeBoardId: null, wsOpen: false, refreshCounter: s.refreshCounter + 1 }));
    }
  }, []);

  const deleteWorkspace = useCallback(async (id: string) => {
    await api.deleteWorkspace(id);
    setState(s => ({ ...s, screen: 'dashboard', activeBoardId: null, wsOpen: false, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const setBoardView = useCallback((view: BoardView) => setState(s => ({ ...s, boardView: view })), []);
  const openTask = useCallback((taskId: string) => setState(s => ({ ...s, selectedTaskId: taskId, aiSummaryForTaskId: null })), []);
  const closeTask = useCallback(() => setState(s => ({ ...s, selectedTaskId: null })), []);
  const openAI = useCallback(() => setState(s => ({ ...s, aiOpen: true })), []);
  const closeAI = useCallback(() => setState(s => ({ ...s, aiOpen: false })), []);
  const summarizeTask = useCallback(() => setState(s => ({ ...s, aiSummaryForTaskId: s.selectedTaskId })), []);
  const toggleTheme = useCallback(() => setState(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })), []);
  const toggleDensity = useCallback(() => setState(s => ({ ...s, density: s.density === 'compact' ? 'comfortable' : 'compact' })), []);
  const toggleSidebar = useCallback(() => setState(s => ({ ...s, collapsed: !s.collapsed, wsOpen: false })), []);
  const toggleWs = useCallback(() => setState(s => ({ ...s, wsOpen: !s.wsOpen })), []);
  const toggleFilterLabel = useCallback((id: string) => setState(s => ({ ...s, filterLabelIds: s.filterLabelIds.includes(id) ? s.filterLabelIds.filter(x => x !== id) : [...s.filterLabelIds, id] })), []);
  const clearFilterLabels = useCallback(() => setState(s => ({ ...s, filterLabelIds: [] })), []);
  const setSortMode = useCallback((sortMode: 'manual' | 'due' | 'priority' | 'title') => setState(s => ({ ...s, sortMode })), []);
  const setGroupMode = useCallback((groupMode: 'status' | 'priority' | 'assignee') => setState(s => ({ ...s, groupMode })), []);
  const toggleFocus = useCallback(() => setState(s => ({ ...s, focus: !s.focus })), []);
  const setAutoTab = useCallback((tab: 'rules' | 'history') => setState(s => ({ ...s, autoTab: tab })), []);
  const toggleBuilder = useCallback(() => setState(s => ({ ...s, builderOpen: !s.builderOpen })), []);
  const openDoc = useCallback((id: string) => setState(s => ({ ...s, selectedDocId: id })), []);
  const setAgendaView = useCallback((view: 'day' | 'week' | 'month' | 'team') => setState(s => ({ ...s, agendaView: view })), []);
  const prevMonth = useCallback(() => setState(s => {
    let m = s.calMonth - 1, y = s.calYear;
    if (m < 0) { m = 11; y--; }
    return { ...s, calMonth: m, calYear: y };
  }), []);
  const nextMonth = useCallback(() => setState(s => {
    let m = s.calMonth + 1, y = s.calYear;
    if (m > 11) { m = 0; y++; }
    return { ...s, calMonth: m, calYear: y };
  }), []);
  const goToday = useCallback(() => setState(s => ({ ...s, calMonth: 5, calYear: 2026 })), []);
  const toggleSettings = useCallback(() => setState(s => ({ ...s, settingsOpen: !s.settingsOpen, searchOpen: false, createFolderOpen: false })), []);
  const toggleSearch = useCallback(() => setState(s => ({ ...s, searchOpen: !s.searchOpen, settingsOpen: false, createFolderOpen: false })), []);
  const toggleCreateFolder = useCallback(() => setState(s => ({ ...s, createFolderOpen: !s.createFolderOpen, settingsOpen: false, searchOpen: false })), []);
  const openCreateBoard = useCallback(() => setState(s => ({ ...s, createBoardOpen: true })), []);
  const closeCreateBoard = useCallback(() => setState(s => ({ ...s, createBoardOpen: false })), []);
  const setPreferredBoard = useCallback(async (memberId: string, boardId: string | null) => {
    await api.updateMemberPreferredBoard(memberId, boardId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const moveTask = useCallback((taskId: string, newColumnId: string) => {
    setState(s => ({
      ...s,
      taskOverrides: { ...s.taskOverrides, [taskId]: { ...(s.taskOverrides[taskId] || {}), column_id: newColumnId } }
    }));
    runOrQueue('moveTaskToColumn', [taskId, newColumnId]);
  }, []);

  const moveTaskTo = useCallback((taskId: string, columnId: string, position: number) => {
    setState(s => ({
      ...s,
      taskOverrides: { ...s.taskOverrides, [taskId]: { ...(s.taskOverrides[taskId] || {}), column_id: columnId, position } }
    }));
    runOrQueue('moveTaskOrder', [taskId, columnId, position]);
  }, []);

  const toggleAutomation = useCallback((automationId: string) => {
    setState(s => {
      const prev = s.automationOverrides[automationId];
      return {
        ...s,
        automationOverrides: {
          ...s.automationOverrides,
          [automationId]: { ...prev, is_active: prev?.is_active !== undefined ? !prev.is_active : undefined }
        }
      };
    });
  }, []);

  const toggleChecklistItem = useCallback((itemId: string, currentValue: boolean) => {
    setState(s => ({
      ...s,
      checklistOverrides: { ...s.checklistOverrides, [itemId]: !currentValue }
    }));
    runOrQueue('updateChecklistItem', [itemId, { is_done: !currentValue }]);
  }, []);

  // CRUD
  const addTask = useCallback(async (columnId: string, boardId: string, title: string) => {
    const res = await runOrQueue('createTask', [{ column_id: columnId, board_id: boardId, title }]);
    if (res.queued) {
      // Hors-ligne : carte optimiste affichée jusqu'à la synchronisation
      const tmp: Task = {
        id: 'pending-' + Math.random().toString(36).slice(2), column_id: columnId, board_id: boardId,
        title, description: null, priority: 'medium', due_date: null, estimated_hours: 0, spent_hours: 0,
        position: 9999, is_blocked: false, block_reason: null, is_done: false, archived_at: null,
        comments_count: 0, files_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        labels: [], assignees: [], checklist_items: [],
      };
      setState(s => ({ ...s, pendingTasks: [...s.pendingTasks, tmp] }));
    } else {
      setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
    }
  }, []);

  const clearPendingTasks = useCallback(() => setState(s => (s.pendingTasks.length ? { ...s, pendingTasks: [] } : s)), []);

  const patchTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    await runOrQueue('updateTask', [taskId, updates]);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const removeTask = useCallback(async (taskId: string) => {
    await runOrQueue('deleteTask', [taskId]);
    setState(s => ({ ...s, selectedTaskId: null, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const addColumn = useCallback(async (boardId: string, name: string, color: string) => {
    await runOrQueue('createColumn', [boardId, name, color, 99]);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const postComment = useCallback(async (taskId: string, memberId: string, content: string) => {
    await runOrQueue('addComment', [taskId, memberId, content]);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const addChecklistItem = useCallback(async (taskId: string, text: string, position: number) => {
    await api.addChecklistItem(taskId, text, position);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const removeChecklistItem = useCallback(async (itemId: string) => {
    await api.deleteChecklistItem(itemId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const moveChecklistItem = useCallback(async (items: { id: string; position: number }[], itemId: string, dir: -1 | 1) => {
    const idx = items.findIndex(i => i.id === itemId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= items.length) return;
    const a = items[idx], b = items[swap];
    await Promise.all([
      runOrQueue('updateChecklistItem', [a.id, { position: b.position }]),
      runOrQueue('updateChecklistItem', [b.id, { position: a.position }]),
    ]);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const addTaskLabel = useCallback(async (taskId: string, labelId: string) => {
    await api.addTaskLabel(taskId, labelId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const removeTaskLabel = useCallback(async (taskId: string, labelId: string) => {
    await api.removeTaskLabel(taskId, labelId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const addTaskAssignee = useCallback(async (taskId: string, memberId: string) => {
    await api.addTaskAssignee(taskId, memberId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const removeTaskAssignee = useCallback(async (taskId: string, memberId: string) => {
    await api.removeTaskAssignee(taskId, memberId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const addDocument = useCallback(async (workspaceId: string, title: string, emoji: string, parentId?: string | null, authorId?: string | null) => {
    const { data } = await api.createDocument({ workspace_id: workspaceId, title, emoji, parent_id: parentId, author_id: authorId, position: 99 });
    setState(s => ({ ...s, selectedDocId: data?.id ?? s.selectedDocId, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const updateDocument = useCallback(async (docId: string, updates: { title?: string; content?: unknown[]; emoji?: string }) => {
    await api.updateDocument(docId, updates);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const createBoard = useCallback(async (folderId: string, name: string, color: string, description: string) => {
    await api.createBoard(folderId, name, color, description, 99);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const deleteBoard = useCallback(async (boardId: string) => {
    await api.deleteBoard(boardId);
    setState(s => ({ ...s, screen: 'dashboard', activeBoardId: null, selectedTaskId: null, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const deleteFolder = useCallback(async (folderId: string) => {
    await api.deleteFolder(folderId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const deleteColumn = useCallback(async (columnId: string) => {
    await api.deleteColumn(columnId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const deleteMember = useCallback(async (memberId: string) => {
    await api.deleteMember(memberId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const updateBoard = useCallback(async (boardId: string, updates: { name?: string; color?: string; description?: string }) => {
    await api.updateBoard(boardId, updates);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const updateFolder = useCallback(async (folderId: string, updates: { name?: string }) => {
    await api.updateFolder(folderId, updates);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const updateColumn = useCallback(async (columnId: string, updates: { name?: string; color?: string; wip_limit?: number; position?: number }) => {
    await api.updateColumn(columnId, updates);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const deleteDocument = useCallback(async (docId: string) => {
    await api.deleteDocument(docId);
    setState(s => ({ ...s, selectedDocId: s.selectedDocId === docId ? null : s.selectedDocId, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const deleteAutomation = useCallback(async (automationId: string) => {
    await api.deleteAutomation(automationId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    await api.updateComment(commentId, content);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const removeComment = useCallback(async (commentId: string, taskId: string) => {
    await api.deleteComment(commentId, taskId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const updateMember = useCallback(async (memberId: string, updates: { name?: string; role?: string }) => {
    await api.updateMember(memberId, updates);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const createLabel = useCallback(async (workspaceId: string, name: string, color: string) => {
    await api.createLabel(workspaceId, name, color);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const updateLabel = useCallback(async (labelId: string, updates: { name?: string; color?: string }) => {
    await api.updateLabel(labelId, updates);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const deleteLabel = useCallback(async (labelId: string) => {
    await api.deleteLabel(labelId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const markNotifRead = useCallback(async (id: string) => {
    await api.markNotificationRead(id);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const markAllNotifsRead = useCallback(async (workspaceId: string) => {
    await api.markAllNotificationsRead(workspaceId);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    await api.deleteNotification(id);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const createFolder = useCallback(async (workspaceId: string, name: string) => {
    await api.createFolder(workspaceId, name, 99);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const updateAutomationActive = useCallback(async (automationId: string, active: boolean) => {
    await api.updateAutomation(automationId, { is_active: active });
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const createAutomation = useCallback(async (workspaceId: string, title: string, triggerDesc: string, actionDesc: string) => {
    await api.createAutomation(workspaceId, title, triggerDesc, actionDesc);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const archiveTask = useCallback(async (taskId: string) => {
    await runOrQueue('updateTask', [taskId, { archived_at: new Date().toISOString() }]);
    setState(s => ({ ...s, selectedTaskId: null, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const restoreTask = useCallback(async (taskId: string) => {
    await runOrQueue('updateTask', [taskId, { archived_at: null }]);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  const toggleTaskDone = useCallback(async (taskId: string, isDone: boolean) => {
    setState(s => ({
      ...s,
      taskOverrides: { ...s.taskOverrides, [taskId]: { ...(s.taskOverrides[taskId] || {}), is_done: !isDone } }
    }));
    await runOrQueue('updateTask', [taskId, { is_done: !isDone }]);
    setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      goTo, openBoard, setActiveWorkspace, createWorkspace, deleteWorkspace, setBoardView, openTask, closeTask,
      openAI, closeAI, summarizeTask,
      toggleTheme, toggleDensity, toggleSidebar, toggleWs,
      toggleFilterLabel, clearFilterLabels, setSortMode, setGroupMode, toggleFocus, setAutoTab, toggleBuilder,
      openDoc, setAgendaView, prevMonth, nextMonth, goToday,
      moveTask, moveTaskTo, toggleAutomation, toggleChecklistItem,
      toggleSettings, toggleSearch, toggleCreateFolder,
      openCreateBoard, closeCreateBoard, setPreferredBoard,
      addTask, clearPendingTasks, patchTask, removeTask, addColumn, postComment,
      addChecklistItem, removeChecklistItem, moveChecklistItem,
      addTaskLabel, removeTaskLabel, addTaskAssignee, removeTaskAssignee,
      addDocument, updateDocument, createBoard, deleteBoard, deleteFolder, deleteColumn, deleteMember,
      updateBoard, updateFolder, updateColumn, createFolder,
      deleteDocument, deleteAutomation, updateComment, removeComment, updateMember, createLabel, updateLabel, deleteLabel,
      markNotifRead, markAllNotifsRead, removeNotification,
      updateAutomationActive, createAutomation, refreshAll,
      archiveTask, restoreTask, toggleTaskDone,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
