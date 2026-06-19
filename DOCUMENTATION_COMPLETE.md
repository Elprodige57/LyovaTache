# 📚 LYOVATACHE - DOCUMENTATION COMPLÈTE

**Date:** 19 Juin 2026  
**Projet:** LyovaTache - Application de Gestion de Tâches Collaborative  
**Stack:** React 18 + TypeScript + Vite + Supabase + Tailwind CSS

---

## 📖 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture générale](#architecture-générale)
3. [Flow de l'application](#flow-de-lapplication)
4. [State Management](#state-management)
5. [Data Layer](#data-layer)
6. [Composants React](#composants-react)
7. [Base de Données](#base-de-données)
8. [Patterns & Best Practices](#patterns--best-practices)
9. [Flux Complet des Actions](#flux-complet-des-actions)
10. [Migrations Supabase](#migrations-supabase)
11. [Fonctionnalités Avancées](#fonctionnalités-avancées)
12. [Variables CSS](#variables-css)
13. [Roadmap](#roadmap)

---

## VUE D'ENSEMBLE

### C'est quoi LyovaTache?

**LyovaTache** est une application web collaborative de gestion de tâches et de projets, similaire à Notion/Asana/Monday.com. Elle permet aux équipes de:

- ✅ Gérer des tâches avec un système Kanban visuel
- ✅ Organiser les projets en dossiers et boards
- ✅ Collaborer en temps réel
- ✅ Planifier avec un calendrier/agenda
- ✅ Documenter avec un système wiki
- ✅ Automatiser des workflows
- ✅ Accéder en mode démo sans compte

### Caractéristiques principales

| Fonctionnalité | Description |
|---|---|
| **Boards Kanban** | Colonnes customisables, drag & drop |
| **Tâches riches** | Priorité, due date, estimations, assignés, labels |
| **Hiérarchie** | Workspace > Folders > Boards > Columns > Tasks |
| **Collaboration** | Commentaires, assignation, équipe |
| **Calendrier** | Agenda day/week/month/team |
| **Documents** | Wiki hiérarchique avec contenu riche |
| **Automations** | Règles d'automation (future) |
| **Mode Guest** | Accès démo sans authentification |
| **Thème** | Light/Dark mode dynamique |

---

## ARCHITECTURE GÉNÉRALE

### Vue d'ensemble de l'application

```
┌─────────────────────────────────────────────────────────────┐
│                          BROWSER                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │        React App (App.tsx)                            │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ AppProvider (AppContext)                       │  │  │
│  │  │  - Global state (screen, selectedTask, theme)  │  │  │
│  │  │  - CRUD functions (addTask, patchTask, etc)   │  │  │
│  │  │  - refreshCounter pour cache busting          │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ Data Layer (useData hooks)                     │  │  │
│  │  │  - useWorkspace, useFolders, useBoard          │  │  │
│  │  │  - useTasks, useTask, useLabels...             │  │  │
│  │  │  - Fetch+cache avec useEffect                  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ UI Layer (Composants React)                    │  │  │
│  │  │  - Sidebar, Header, TaskDrawer                 │  │  │
│  │  │  - Kanban, Dashboard, Agenda, Documents        │  │  │
│  │  │  - Modales: Search, Settings, CreateFolder     │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
              ↓ ↑ (fetch/update)
┌─────────────────────────────────────────────────────────────┐
│            SUPABASE (Backend BaaS)                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Database (14 tables)                      │  │
│  │  - workspaces, members, folders, boards             │  │
│  │  - columns, tasks, labels, automations              │  │
│  │  - task_labels, task_assignees, checklist_items     │  │
│  │  - comments, documents                              │  │
│  │                                                      │  │
│  │ Row Level Security (RLS) Policies                   │  │
│  │  - Contrôlent qui peut SELECT/INSERT/UPDATE/DELETE  │  │
│  │  - Ici: Tout public (développement)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Auth (Supabase Auth)                                │  │
│  │  - Google/GitHub OAuth                              │  │
│  │  - Mode guest (localStorage)                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Stack Technologique

**Frontend:**
- **React 18.3.1** - Framework UI
- **TypeScript 5.5.3** - Type safety
- **Vite 5.4.2** - Bundler ultra-rapide
- **Tailwind CSS 3.4.1** - Styling utility
- **Lucide React 0.344.0** - Icons (500+)
- **PostCSS + Autoprefixer** - CSS processing

**Backend:**
- **Supabase PostgreSQL** - BaaS Database
- **Supabase Auth** - Authentification
- **Row Level Security (RLS)** - Sécurité

**Dev Tools:**
- **ESLint** - Linting
- **TypeScript ESLint** - Type checking

### Structure des fichiers

```
src/
├── App.tsx                ← Point d'entrée principal (Orchestrateur)
├── main.tsx               ← Bootstrap React
├── index.css              ← Styles globaux + CSS variables
├── vite-env.d.ts          ← Types Vite
│
├── components/            ← Composants réutilisables
│   ├── AIPanel.tsx        (Panneau IA/Résumé)
│   ├── CreateFolderModal.tsx
│   ├── Header.tsx         (Navbar supérieure)
│   ├── LoginScreen.tsx    (Écran auth)
│   ├── SearchModal.tsx    (Cmd+K)
│   ├── SettingsPanel.tsx
│   ├── Sidebar.tsx        (Navigation gauche)
│   └── TaskDrawer.tsx     (Détail tâche)
│
├── views/                 ← Pages principales
│   ├── Dashboard.tsx      (Accueil)
│   ├── Kanban.tsx         (Boards visuels)
│   ├── Agenda.tsx         (Calendrier)
│   ├── MyTasks.tsx        (Mes tâches)
│   ├── Documents.tsx      (Wiki)
│   ├── Automations.tsx    (Workflows)
│   └── Archives.tsx       (Tâches archivées)
│
├── context/
│   └── AppContext.tsx     (État global + CRUD)
│
├── hooks/
│   └── useData.ts         (Tous les data hooks)
│
├── lib/
│   ├── supabase.ts        (Client Supabase init)
│   └── boardIO.ts         (Import/export)
│
└── types/
    └── index.ts           (Interfaces TypeScript)

supabase/
└── migrations/
    ├── 20260618082318_lyova_initial_schema.sql
    ├── 20260618095911_add_task_archived_at.sql
    ├── 20260618120000_add_member_preferred_board.sql
    └── 20260618130000_auth_setup.sql
```

---

## FLOW DE L'APPLICATION

### Au démarrage (App.tsx)

```typescript
export default function App() {
  // Étape 1: Vérifier session existante
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  
  useEffect(() => {
    // Récupère session si connecté
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    
    // Écoute changements d'auth
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) { 
        localStorage.removeItem('lyova_guest'); 
        setGuest(false); 
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Étape 2: Vérifier si guest mode
  const [guest, setGuest] = useState(() => 
    localStorage.getItem('lyova_guest') === '1'
  );
  
  const enterGuest = () => {
    localStorage.setItem('lyova_guest', '1');
    setGuest(true);
  };

  // Étape 3: Afficher écran approprié
  if (!guest && session === undefined) {
    return <LoadingScreen />;  // Chargement...
  }
  
  if (!guest && !session) {
    return <LoginScreen onGuest={enterGuest} />;  // Login
  }

  // Sinon: App complète
  return (
    <AppProvider>
      <AppContent session={session ?? null} />
    </AppProvider>
  );
}
```

**Ce qui se passe:**
1. App attend que Supabase check la session (async)
2. Si `session === undefined` → Affiche "Chargement..."
3. Si `!guest && !session` → Affiche LoginScreen
4. Sinon → Charge toute l'application

### À l'intérieur d'AppContent

```typescript
function AppContent({ session }: { session: Session | null }) {
  const app = useApp();  // Context global

  // ========== CONSTANTES (DÉMO) ==========
  const WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
  const MAIN_BOARD_ID = '00000000-0000-0000-0003-000000000001';
  const GUEST_MEMBER_ID = '00000000-0000-0000-0001-000000000001';  // Camille

  // ========== DATA FETCHING ==========
  // Charge données basées sur refreshCounter
  const { workspace } = useWorkspace(app.refreshCounter);
  const members = useMembers(WORKSPACE_ID, app.refreshCounter);
  const { folders } = useFolders(WORKSPACE_ID, app.refreshCounter);
  const labels = useLabels(WORKSPACE_ID);
  const { automations } = useAutomations(WORKSPACE_ID, app.refreshCounter);
  const { documents } = useDocuments(WORKSPACE_ID, app.refreshCounter);

  // ========== BOARD ACTIF ==========
  const activeBoardId = app.activeBoardId ?? MAIN_BOARD_ID;
  
  const { board } = useBoard(
    app.screen === 'board' ? activeBoardId : null, 
    app.refreshCounter
  );
  
  const { columns } = useColumns(
    app.screen === 'board' ? activeBoardId : null, 
    app.refreshCounter
  );
  
  const { tasks } = useTasks(
    app.screen === 'board' || app.screen === 'mytasks' || 
    app.screen === 'dashboard' || app.screen === 'archives'
      ? activeBoardId
      : null,
    app.refreshCounter
  );

  // ========== TÂCHES MULTI-BOARDS ==========
  // Pour "Mes tâches": tâches de tous les boards
  const allBoards = folders.flatMap(f => f.boards ?? []);
  const allBoardIds = allBoards.map(b => b.id);
  const { tasks: allTasks } = useAllTasks(
    app.screen === 'mytasks' ? allBoardIds : [], 
    app.refreshCounter
  );

  // ========== TÂCHE SÉLECTIONNÉE ==========
  const { task: selectedTask } = useTask(
    app.selectedTaskId, 
    app.refreshCounter
  );

  // ========== MEMBRE COURANT ==========
  const isGuest = !session;
  
  const authedMember = useCurrentMember(
    session?.user.id ?? null,
    session?.user.email ?? null,
    (session?.user.user_metadata?.name as string | undefined) ?? null,
    WORKSPACE_ID,
    app.refreshCounter,
  );
  
  const currentMember = session 
    ? authedMember 
    : (members.find(m => m.id === GUEST_MEMBER_ID) ?? null);
  
  const currentMemberId = currentMember?.id ?? '';
  const boardMembers = board?.members ?? [];

  // ========== OPTIMISTIC UPDATES ==========
  // Les tâches avec overrides appliqués (UI réactive avant sync DB)
  const effectiveTasks: Task[] = tasks.map(t => {
    const ov = app.taskOverrides[t.id];
    if (!ov) return t;
    return { ...t, ...ov };
  });
  
  const effectiveAllTasks: Task[] = allTasks.map(t => {
    const ov = app.taskOverrides[t.id];
    return ov ? { ...t, ...ov } : t;
  });

  // ========== REDIRECTION AUTOMATIQUE ==========
  // Si membre a un board "préféré", y aller au chargement (une seule fois)
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (didAutoOpen.current) return;
    const pref = currentMember?.preferred_board_id;
    if (pref && allBoardIds.includes(pref)) {
      didAutoOpen.current = true;
      app.openBoard(pref);
    }
  }, [currentMember, allBoardIds, app]);

  // ========== RACCOURCIS CLAVIER ==========
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd+K ou Ctrl+K = Ouvrir Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        app.toggleSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app]);

  // ========== RENDER LAYOUT ==========
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* SIDEBAR - Navigation principale */}
      {!app.collapsed && !app.focus && (
        <Sidebar workspace={workspace} folders={folders} currentMember={currentMember} />
      )}

      {/* MAIN - Contenu principal */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* HEADER - Titre + contrôles */}
        {!app.focus && (
          <Header
            board={board}
            members={boardMembers}
            labels={labels}
            isBoard={app.screen === 'board'}
            folders={folders}
            workspaceId={WORKSPACE_ID}
            currentMemberId={currentMemberId}
          />
        )}

        {/* BODY - Vue active */}
        <div style={{ flex: 1, position: 'relative' }}>
          {app.screen === 'dashboard' && <Dashboard folders={folders} members={members} allTasks={effectiveTasks} />}
          {app.screen === 'mytasks' && <MyTasks tasks={effectiveAllTasks} currentMemberId={currentMemberId} />}
          {app.screen === 'documents' && <DocumentsView documents={documents} />}
          {app.screen === 'archives' && <ArchivesView tasks={effectiveTasks} />}
          {app.screen === 'board' && app.boardView === 'kanban' && <Kanban columns={columns} tasks={effectiveTasks} />}
          {app.screen === 'board' && app.boardView === 'agenda' && <Agenda tasks={effectiveTasks} columns={columns} />}
          {app.screen === 'board' && app.boardView === 'automations' && <AutomationsView automations={automations} />}
        </div>
      </main>

      {/* MODALES / PANNEAUX */}
      {app.selectedTaskId && <TaskDrawer task={selectedTask} columns={columns} currentMember={currentMember} />}
      {app.aiOpen && <AIPanel />}
      {app.settingsOpen && <SettingsPanel boards={allBoards} currentMember={currentMember} />}
      {app.searchOpen && <SearchModal tasks={effectiveTasks} folders={folders} documents={documents} />}
      {app.createFolderOpen && <CreateFolderModal workspaceId={WORKSPACE_ID} />}
    </div>
  );
}
```

---

## STATE MANAGEMENT

### Interface AppState (Complet)

```typescript
interface AppState {
  // ===== NAVIGATION =====
  screen: 'dashboard' | 'board' | 'mytasks' | 'documents' | 'automations' | 'archives'
  boardView: 'kanban' | 'agenda' | 'automations'
  activeBoardId: string | null        // Quel board est ouvert?
  selectedTaskId: string | null       // Tâche sélectionnée?
  
  // ===== MODALES =====
  aiOpen: boolean                     // Panneau IA ouvert?
  aiSummaryForTaskId: string | null   // Résumé pour quelle tâche?
  settingsOpen: boolean               // Settings panel?
  searchOpen: boolean                 // Search modal (Cmd+K)?
  createFolderOpen: boolean           // Create folder modal?
  createBoardOpen: boolean            // Create board modal?
  
  // ===== THÈME & UI =====
  theme: 'light' | 'dark'            // Mode clair/sombre
  density: 'comfortable' | 'compact'  // Espacement des éléments
  collapsed: boolean                  // Sidebar repliée?
  focus: boolean                      // Mode plein écran?
  
  // ===== FILTRAGE & TRI =====
  filterLabelIds: string[]            // Filtrer par labels
  sortMode: 'manual' | 'due' | 'priority' | 'title'  // Comment trier?
  
  // ===== CALENDRIER =====
  agendaView: 'day' | 'week' | 'month' | 'team'
  calMonth: number    // 0-11 (janvier-décembre)
  calYear: number     // 2026
  
  // ===== AUTOMATIONS =====
  autoTab: 'rules' | 'history'
  builderOpen: boolean
  
  // ===== DOCUMENTS =====
  selectedDocId: string | null
  
  // ===== AUTRES =====
  wsOpen: boolean     // Workspace switcher ouvert?
  
  // ===== OPTIMISTIC UPDATES =====
  taskOverrides: Record<string, Partial<Task>>           // Updates locaux
  automationOverrides: Record<string, Partial<Automation>>
  checklistOverrides: Record<string, boolean>            // Pour is_done
  
  // ===== CACHE BUSTING =====
  refreshCounter: number  // Incrémenter = refetch tous les hooks
}
```

### Fonctions du Contexte (100+ méthodes)

**Navigation:**
- `goTo(screen, boardView?)` - Aller à une screen
- `openBoard(boardId)` - Ouvrir un board
- `setBoardView(view)` - Changer kanban/agenda/automations
- `openTask(taskId)` - Afficher TaskDrawer
- `closeTask()` - Fermer TaskDrawer

**Modales:**
- `toggleSearch()` - Cmd+K
- `toggleSettings()` - Settings panel
- `toggleCreateFolder()` - Créer folder
- `openCreateBoard()` / `closeCreateBoard()` - Créer board

**Thème:**
- `toggleTheme()` - Light ↔ Dark
- `toggleDensity()` - Comfortable ↔ Compact

**UI:**
- `toggleSidebar()` - Collapsed
- `toggleFocus()` - Plein écran
- `toggleWs()` - Workspace switcher

**Filtrage:**
- `toggleFilterLabel(id)` - Ajouter/retirer label filtre
- `clearFilterLabels()` - Nettoyer filtres
- `setSortMode(mode)` - Changer tri

**Calendrier:**
- `setAgendaView(view)` - Day/Week/Month/Team
- `prevMonth()` / `nextMonth()` / `goToday()`

**CRUD Tâches:**
- `addTask(columnId, boardId, title)` - Créer
- `patchTask(taskId, updates)` - Modifier
- `removeTask(taskId)` - Supprimer
- `moveTask(taskId, newColumnId)` - Drag & drop
- `archiveTask(taskId)` - Soft-delete
- `restoreTask(taskId)` - Restaurer
- `toggleTaskDone(taskId, isDone)` - Marquer complété

**CRUD Colonnes:**
- `addColumn(boardId, name, color)` - Créer colonne

**CRUD Commentaires:**
- `postComment(taskId, memberId, content)` - Ajouter commentaire

**CRUD Checklist:**
- `addChecklistItem(taskId, text, position)` - Ajouter item
- `removeChecklistItem(itemId)` - Supprimer item
- `toggleChecklistItem(itemId, currentValue)` - Cocher/décocher

**CRUD Labels:**
- `addTaskLabel(taskId, labelId)` - Ajouter label
- `removeTaskLabel(taskId, labelId)` - Retirer label

**CRUD Assignés:**
- `addTaskAssignee(taskId, memberId)` - Assigner
- `removeTaskAssignee(taskId, memberId)` - Retirer assignation

**CRUD Boards & Folders:**
- `createBoard(folderId, name, color, description)` - Créer board
- `createFolder(workspaceId, name)` - Créer folder

**CRUD Documents:**
- `addDocument(workspaceId, title, emoji, parentId, authorId)` - Créer doc
- `updateDocument(docId, updates)` - Modifier doc

**CRUD Automations:**
- `createAutomation(workspaceId, title, triggerDesc, actionDesc)` - Créer auto
- `updateAutomationActive(automationId, active)` - Activer/désactiver
- `toggleAutomation(automationId)` - Toggle

**Autres:**
- `setPreferredBoard(memberId, boardId)` - Sauvegarder board préféré
- `refreshAll()` - Force refresh (refreshCounter++)

### Pattern: Optimistic Updates

```typescript
moveTask: useCallback((taskId: string, newColumnId: string) => {
  // Étape 1: UPDATE LOCAL IMMÉDIAT (optimistic)
  setState(s => ({
    ...s,
    taskOverrides: { 
      ...s.taskOverrides, 
      [taskId]: { 
        ...(s.taskOverrides[taskId] || {}), 
        column_id: newColumnId  // Mise à jour locale!
      } 
    }
  }));
  
  // Étape 2: API CALL ASYNC (pas d'await!)
  api.moveTaskToColumn(taskId, newColumnId);
}, []);
```

**Qu'est-ce que ça fait?**
1. **Immédiatement**: Task se déplace visuellement (override local)
2. **En parallèle**: API appel Supabase (peut prendre du temps)
3. **Résultat**: UI réactive, pas d'attente

---

## DATA LAYER

### Hooks de Lecture

Chaque hook suit ce pattern:

```typescript
export function useFolders(workspaceId: string | undefined, refreshKey = 0) {
  const [folders, setFolders] = useState<Folder[]>([]);

  const reload = useCallback(() => {
    if (!workspaceId) return;  // Guard clause
    
    supabase.from('folders')
      .select('*, boards(*)')  // JOINs implicites
      .eq('workspace_id', workspaceId)
      .order('position')
      .then(({ data }) => {
        setFolders(data || []);
      });
  }, [workspaceId]);

  useEffect(() => { 
    reload(); 
  }, [reload, refreshKey]);

  return { folders, reload };  // Exposer reload pour refresh manuel
}
```

**Pattern clé: refreshKey**
```typescript
// En AppContent
const { folders } = useFolders(WORKSPACE_ID, app.refreshCounter);

// Quand quelque chose change
setState(s => ({ ...s, refreshCounter: s.refreshCounter + 1 }));

// → refreshKey change → useEffect re-run → re-fetch!
```

### Hook Spécial: useTasks (Enrichissement)

```typescript
export function useTasks(boardId: string | null, refreshKey = 0) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!boardId) return;
    setLoading(true);
    
    supabase.from('tasks')
      .select(`
        *,
        task_labels(label_id, labels(*)),      // ← JOIN labels
        task_assignees(member_id, members(*)), // ← JOIN members
        checklist_items(*)                      // ← JOIN checklist_items
      `)
      .eq('board_id', boardId)
      .order('position')
      .then(({ data }) => {
        if (data) {
          // ENRICHISSEMENT: transforme données plates en objets
          const enriched = data.map((t) => ({
            ...t,
            labels: (t.task_labels || [])
              .map((tl: { labels: Label }) => tl.labels)
              .filter(Boolean),
            assignees: (t.task_assignees || [])
              .map((ta: { members: Member }) => ta.members)
              .filter(Boolean),
            checklist_items: (t.checklist_items || [])
              .sort((a: { position: number }, b: { position: number }) => 
                a.position - b.position
              ),
          }));
          setTasks(enriched);
        }
        setLoading(false);
      });
  }, [boardId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);
  
  return { tasks, loading, reload };
}
```

### Fonctions CRUD

```typescript
export async function createTask(payload: {
  column_id: string;
  board_id: string;
  title: string;
  priority?: string;
  due_date?: string | null;
  estimated_hours?: number;
  description?: string | null;
  position?: number;
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select()
    .single();
  
  return { data, error };
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  // Whitelist des champs modifiables
  const allowed: Record<string, unknown> = {};
  const fields = ['title', 'description', 'priority', 'due_date', 
    'estimated_hours', 'spent_hours', 'is_blocked', 'block_reason', 
    'column_id', 'is_done', 'archived_at', 'updated_at'];
  
  for (const f of fields) {
    if (f in updates) allowed[f] = (updates as Record<string, unknown>)[f];
  }
  allowed['updated_at'] = new Date().toISOString();
  
  const { error } = await supabase
    .from('tasks')
    .update(allowed)
    .eq('id', taskId);
  
  return { error };
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  return { error };
}

// JUNCTION TABLES

export async function addTaskLabel(taskId: string, labelId: string) {
  const { error } = await supabase
    .from('task_labels')
    .insert({ task_id: taskId, label_id: labelId });
  
  return { error };
}

export async function removeTaskLabel(taskId: string, labelId: string) {
  const { error } = await supabase
    .from('task_labels')
    .delete()
    .eq('task_id', taskId)
    .eq('label_id', labelId);
  
  return { error };
}

// AVEC TRANSACTIONS

export async function addComment(taskId: string, memberId: string, content: string) {
  // 1. INSERT comment
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, member_id: memberId, content })
    .select('*, member:members(*)')
    .single();
  
  if (!error) {
    // 2. INCREMENT comments_count sur la tâche
    await supabase.rpc('increment_comments_count', { p_task_id: taskId })
      .catch(() => {
        // Fallback si RPC échoue
        supabase.from('tasks')
          .select('comments_count')
          .eq('id', taskId)
          .single()
          .then(({ data: t }) => {
            if (t) supabase.from('tasks')
              .update({ comments_count: (t.comments_count || 0) + 1 })
              .eq('id', taskId);
          });
      });
  }
  
  return { data: data as Comment | null, error };
}
```

---

## COMPOSANTS REACT

### Sidebar.tsx - Navigation Principale

```typescript
export function Sidebar({ workspace, folders, currentMember }: SidebarProps) {
  const app = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', screen: 'dashboard' },
    { id: 'mytasks', label: 'Mes tâches', screen: 'mytasks', badge: 8 },
    { id: 'notifications', label: 'Notifications', screen: 'notifications', badge: 3 },
    { id: 'documents', label: 'Documents', screen: 'documents' },
    { id: 'archives', label: 'Archives', screen: 'archives' },
  ];

  const allBoards = folders.flatMap(f => 
    (f.boards || []).map(b => ({ ...b, folderName: f.name }))
  );

  return (
    <aside style={{ width: 268, height: '100%', background: 'var(--panel2)' }}>
      {/* WORKSPACE SWITCHER */}
      <div style={{ padding: '13px 12px 10px' }}>
        <div onClick={app.toggleWs} style={styles.wsButton}>
          <div style={styles.wsIcon}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              {workspace?.name || 'Lyova Tech'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--sub2)' }}>
              {workspace?.plan}
            </div>
          </div>
          <svg>▾</svg>
        </div>

        {/* WORKSPACE DROPDOWN */}
        {app.wsOpen && (
          <div style={styles.wsDropdown}>
            {[
              { name: 'Lyova Tech', color: '#5b50e8', initial: 'L', active: true },
              { name: 'Studio Perso', color: '#f59e0b', initial: 'S', active: false },
              { name: 'Client — Acme', color: '#10b981', initial: 'A', active: false },
            ].map(w => (
              <div key={w.name} onClick={() => app.toggleWs()}>
                <div style={{ background: w.color }}>
                  {w.initial}
                </div>
                <span>{w.name}</span>
                {w.active && <svg>✓</svg>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEARCH */}
      <div style={{ padding: '0 12px 8px' }}>
        <input onClick={app.toggleSearch} placeholder="Rechercher..." />
      </div>

      {/* MAIN NAV */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {navItems.map(item => (
          <div key={item.id} onClick={() => app.goTo(item.screen)}>
            <span>{item.label}</span>
            {item.badge && <span>{item.badge}</span>}
          </div>
        ))}
      </nav>

      {/* FOLDERS & BOARDS */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--line)' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sub)' }}>
          Bureaux
        </div>
        {folders.map(folder => (
          <Folder key={folder.id} folder={folder} />
        ))}
      </div>

      {/* FOOTER - Profil */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--line)' }}>
        {currentMember && (
          <div style={styles.memberProfile}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: currentMember.color }}>
              {currentMember.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                {currentMember.name}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--sub2)' }}>
                {currentMember.role}
              </div>
            </div>
            <button onClick={app.toggleSettings}>⚙️</button>
          </div>
        )}
      </div>
    </aside>
  );
}
```

### Kanban.tsx - Vue Board Interactive

```typescript
export function Kanban({ columns, tasks }: KanbanProps) {
  const app = useApp();
  
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [addingCardColId, setAddingCardColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const activeBoardId = app.activeBoardId ?? MAIN_BOARD_ID;

  // ===== OBTENIR TÂCHES D'UNE COLONNE =====
  const getTasksForColumn = (colId: string) => {
    return tasks
      .filter(t => {
        const override = app.taskOverrides[t.id];
        const actualColId = override?.column_id ?? t.column_id;
        return actualColId === colId;
      })
      .filter(t => 
        app.filterLabelIds.length === 0 || 
        (t.labels || []).some(l => app.filterLabelIds.includes(l.id))
      )
      .sort((a, b) => {
        switch (app.sortMode) {
          case 'due': {
            const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
            const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
            return da - db || a.position - b.position;
          }
          case 'priority': {
            const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || a.position - b.position;
          }
          case 'title':
            return a.title.localeCompare(b.title, 'fr') || a.position - b.position;
          default:
            return a.position - b.position;
        }
      });
  };

  const handleDrop = (colId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragTaskId) {
      app.moveTask(dragTaskId, colId);
    }
    setDragTaskId(null);
    setDragOverColId(null);
  };

  const handleAddCard = async (colId: string) => {
    const t = newCardTitle.trim();
    if (!t) return;
    
    await app.addTask(colId, activeBoardId, t);
    setNewCardTitle('');
    setAddingCardColId(null);
  };

  const handleAddCol = async () => {
    const n = newColName.trim();
    if (!n) return;
    
    const color = COL_COLORS[columns.length % COL_COLORS.length];
    await app.addColumn(activeBoardId, n, color);
    setNewColName('');
    setAddingCol(false);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 'var(--col-gap)', minWidth: 'max-content' }}>
        
        {/* COLONNES */}
        {columns.map(col => {
          const colTasks = getTasksForColumn(col.id);
          const over = dragOverColId === col.id;
          const wipOver = col.wip_limit > 0 && colTasks.length > col.wip_limit;
          const wipPct = col.wip_limit > 0 
            ? Math.min(100, colTasks.length / col.wip_limit * 100) 
            : 0;

          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOverColId(col.id); }}
              onDrop={handleDrop(col.id)}
              style={{
                width: 'var(--col-w)',
                flexShrink: 0,
                background: 'var(--panel2)',
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: over ? `inset 0 0 0 2px var(--accent)` : 'none',
              }}
            >
              {/* HEADER COLONNE */}
              <div style={{ padding: 'var(--col-head-pad)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: col.color }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {col.name}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: wipOver ? '#ef4444' : 'var(--sub)' }}>
                    {col.wip_limit > 0 ? `${colTasks.length} / ${col.wip_limit}` : colTasks.length}
                  </span>
                  <button onClick={() => setAddingCardColId(col.id)} style={{ marginLeft: 'auto' }}>
                    +
                  </button>
                </div>
                
                {/* WIP PROGRESS BAR */}
                <div style={{ height: 3, background: 'var(--soft2)', borderRadius: 3, marginTop: 9, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${wipPct}%`, background: col.color, transition: 'width .3s' }} />
                </div>
              </div>

              {/* TÂCHES */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '3px 8px', display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={dragTaskId === task.id}
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={() => { setDragTaskId(null); setDragOverColId(null); }}
                    onClick={() => app.openTask(task.id)}
                  />
                ))}
              </div>

              {/* FORM AJOUTER CARTE */}
              {addingCardColId === col.id && (
                <div style={{ background: 'var(--panel)', borderRadius: 10, padding: '8px 10px', margin: '3px 8px 8px' }}>
                  <textarea
                    value={newCardTitle}
                    onChange={e => setNewCardTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCard(col.id);
                      }
                    }}
                    placeholder="Titre..."
                    rows={2}
                  />
                  <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                    <button onClick={() => handleAddCard(col.id)}>Ajouter</button>
                    <button onClick={() => setAddingCardColId(null)}>Annuler</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* AJOUTER COLONNE */}
        {!addingCol ? (
          <button onClick={() => setAddingCol(true)}>
            + Ajouter colonne
          </button>
        ) : (
          <div style={{ width: 'var(--col-w)', flexShrink: 0 }}>
            <input
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCol();
                if (e.key === 'Escape') setAddingCol(false);
              }}
              placeholder="Nom colonne..."
              autoFocus
            />
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={handleAddCol}>Ajouter</button>
              <button onClick={() => setAddingCol(false)}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### TaskDrawer.tsx - Détail Tâche

Le TaskDrawer est un slide-over panel affichant tous les détails d'une tâche:

**Sections:**
1. **Header** - Reference ID + Close button
2. **Title & Description** - Éditable au click
3. **Properties Grid** - Priorité, colonne, date, etc.
4. **Assignés** - Avatar avec option supprimer
5. **Labels** - Tags avec option ajouter/retirer
6. **Checklist** - Items avec checkbox, ajouter nouvelle
7. **Comments** - Thread de discussion
8. **Actions Footer** - Archive, Delete

---

## BASE DE DONNÉES

### Schéma Complet (20260618082318_lyova_initial_schema.sql)

#### Workspaces

```sql
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'Plan Équipe',
  created_at timestamptz DEFAULT now()
);
```

Conteneur top-level. Chaque workspace est indépendant.

#### Members

```sql
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  initials text NOT NULL,
  color text NOT NULL DEFAULT '#5b50e8',
  role text NOT NULL DEFAULT 'Membre',
  created_at timestamptz DEFAULT now()
);
```

Utilisateurs/équipe dans un workspace. Cascade: Si workspace supprimé → tous ses members supprimés.

#### Folders

```sql
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

Organisation hiérarchique (ex: "Produit", "Marketing").

#### Boards

```sql
CREATE TABLE boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#5b50e8',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

Projets/bureaux Kanban. Couleur: Badge affichage.

#### Board Members (Junction)

```sql
CREATE TABLE board_members (
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (board_id, member_id)
);
```

Many-to-many: Un board peut avoir plusieurs members, un member dans plusieurs boards.

#### Columns

```sql
CREATE TABLE columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  position integer NOT NULL DEFAULT 0,
  wip_limit integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

Colonnes Kanban. `wip_limit`: Work In Progress limit (0 = pas de limite).

#### Tasks

```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid REFERENCES columns(id) ON DELETE CASCADE,
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent','high','medium','low')),
  due_date date,
  estimated_hours integer NOT NULL DEFAULT 0,
  spent_hours integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  is_done boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  comments_count integer NOT NULL DEFAULT 0,
  files_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Les tâches/tickets. `archived_at`: NULL si actif, sinon date d'archivage (soft-delete).

#### Labels

```sql
CREATE TABLE labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#5b50e8',
  created_at timestamptz DEFAULT now()
);
```

Catalogue d'étiquettes (globales au workspace).

#### Task Labels (Junction)

```sql
CREATE TABLE task_labels (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  label_id uuid REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);
```

Many-to-many: Une tâche peut avoir plusieurs labels, un label sur plusieurs tâches.

#### Task Assignees (Junction)

```sql
CREATE TABLE task_assignees (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, member_id)
);
```

Qui est assigné à quelle tâche?

#### Checklist Items

```sql
CREATE TABLE checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

Sous-tâches d'une tâche. `position`: Important pour maintenir l'ordre.

#### Comments

```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

Thread de discussion sur une tâche.

#### Automations

```sql
CREATE TABLE automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  trigger_desc text NOT NULL,
  action_desc text NOT NULL,
  runs_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

Règles d'automation (future implémentation).

#### Documents

```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '📄',
  content jsonb NOT NULL DEFAULT '[]',
  author_id uuid REFERENCES members(id),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Wiki/documentation. `parent_id`: Hiérarchie. `content`: jsonb pour éditeur riche.

### Row Level Security (RLS)

Pour CHAQUE table:

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_tasks" ON tasks 
  FOR SELECT TO anon USING (true);

CREATE POLICY "insert_tasks" ON tasks 
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "update_tasks" ON tasks 
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "delete_tasks" ON tasks 
  FOR DELETE TO anon USING (true);
```

**Ici, tout est `true`** = Mode développement, tout le monde a accès.

En production:
```sql
USING (auth.uid() = user_id)  -- Seulement ses propres tâches
```

---

## PATTERNS & BEST PRACTICES

### Pattern: Hook Custom + useEffect + useState

```typescript
export function useBoard(boardId: string | null, refreshKey = 0) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!boardId) return;  // Guard clause
    setLoading(true);
    
    supabase.from('boards')
      .select(`*, folder:folders(*), board_members(...)`)
      .eq('id', boardId)
      .single()
      .then(({ data }) => {
        if (data) {
          const members = (data.board_members || [])
            .map((bm: { members: Member }) => bm.members)
            .filter(Boolean);
          setBoard({ ...data, members });
        }
        setLoading(false);
      });
  }, [boardId]);

  useEffect(() => { 
    reload(); 
  }, [reload, refreshKey]);

  return { board, loading, reload };
}
```

**Pourquoi ce pattern?**
1. **Separation of concerns**: Data fetching isolé
2. **Reusability**: Un hook, utilisé dans 5 composants
3. **Memoization**: `useCallback` évite re-renders inutiles
4. **Error handling**: Pas d'erreurs lancées, juste states
5. **Manual refresh**: Impossible d'avoir "stale data"

### Pattern: Enrichissement de Données

**Base données:** Données plates (normalisées)

**API retour:**
```json
{
  "id": "task-1",
  "title": "Implémenter auth",
  "task_labels": [
    {
      "label_id": "label-1",
      "labels": { "id": "label-1", "name": "Backend" }
    }
  ]
}
```

**Après enrichissement:**
```json
{
  "id": "task-1",
  "title": "Implémenter auth",
  "labels": [
    { "id": "label-1", "name": "Backend" }
  ]
}
```

**Code:**
```typescript
const enriched = data.map((t) => ({
  ...t,
  labels: (t.task_labels || [])
    .map((tl) => tl.labels)
    .filter(Boolean),
}));
```

---

## FLUX COMPLET DES ACTIONS

### Créer une Tâche

```
USER                          KANBAN                          APP CONTEXT              SUPABASE                 DATABASE
  │                                  │                           │                       │                        │
  │ Click "+ Ajouter tâche"          │                           │                       │                        │
  ├─────────────────────────────────>│                           │                       │                        │
  │                          (input field appears)               │                       │                        │
  │                                  │                           │                       │                        │
  │ Type "Implémenter auth" + Enter  │                           │                       │                        │
  ├─────────────────────────────────>│                           │                       │                        │
  │                                  │ handleAddCard('col-1', 'Implémenter auth')
  │                                  ├──────────────────────────>│                       │                        │
  │                                  │ addTask(...)              │                       │                        │
  │                                  │ setState({ refreshCounter++ })
  │                                  │<──────────────────────────┤                       │                        │
  │                          (input disparait)                   │                       │                        │
  │                          (tâche apparait!)                   │ createTask(...)
  │                                  │                           ├───────────────────────────────────────────────>│
  │                                  │                           │                       │                        │
  │                                  │                           │                       INSERT INTO tasks...
  │                                  │                           │                       │                        │
  │                                  │                           │                       ├──────────────────────>│
  │                                  │                           │                       │ Générer UUID, set dates
  │                                  │                           │                       │<──────────────────────┤
  │                                  │  useTasks() detects       │                       │                        │
  │                                  │  refreshCounter change    │                       │ Returns new task
  │                                  │                           │                       │<───────────────────────
  │                                  │ useEffect re-runs         │                       │                        │
  │                                  │ .select() re-fetch        │                       │                        │
  │                                  │                           │                       │                        │
  │                                  │ setTasks(new data)        │                       │                        │
  │                          (re-render with new task)          │                       │                        │
```

**Timeline:**
1. **User Action (10ms)**: Click btn
2. **handleAddCard (11ms)**: Input → title = "Implémenter auth"
3. **app.addTask (12ms)**: AppContext appelé
4. **setState refreshCounter (13ms)**: Immédiat, synchrone
5. **Composant re-render (14ms)**: Kanban re-render
6. **API call starts (15ms)**: Async `supabase.from('tasks').insert()`
7. **useTasks detects (16ms)**: refreshCounter changed
8. **useEffect runs (17ms)**: Fetch data
9. **DB processed (200ms+)**: Supabase insère et retourne
10. **setTasks(200ms+)**: State mis à jour avec vrai data
11. **Re-render final (202ms)**: Tâche affichée avec vrais données

**Résultat:** User voit la tâche immédiatement (~15ms), même si DB met 200ms+

---

## MIGRATIONS SUPABASE

### Comment fonctionnent les migrations

Les fichiers dans `supabase/migrations/` sont exécutés dans l'ordre:

```
20260618082318_lyova_initial_schema.sql
  ↓
20260618095911_add_task_archived_at.sql
  ↓
20260618120000_add_member_preferred_board.sql
  ↓
20260618130000_auth_setup.sql
```

### Migration: add_task_archived_at

```sql
ALTER TABLE tasks ADD COLUMN archived_at timestamptz;
CREATE INDEX idx_tasks_archived_at ON tasks(archived_at);
```

Soft-delete au lieu de DELETE. Utilisation:

```typescript
// Archive
await app.patchTask(taskId, { archived_at: new Date().toISOString() });

// Restaurer
await app.patchTask(taskId, { archived_at: null });

// Filtrer tâches actives
tasks.filter(t => !t.archived_at)
```

### Migration: add_member_preferred_board

```sql
ALTER TABLE members ADD COLUMN preferred_board_id uuid REFERENCES boards(id) ON DELETE SET NULL;
```

Chaque member se souvient de son dernier board consulté.

Utilisation en AppContent:

```typescript
// Au chargement: redirection auto
const pref = currentMember?.preferred_board_id;
if (pref && allBoardIds.includes(pref)) {
  app.openBoard(pref);
}

// Quand utilisateur ouvre un board
await app.setPreferredBoard(memberId, boardId);
```

---

## FONCTIONNALITÉS AVANCÉES

### Filtrage & Tri Kanban

**Filtrage par labels:**
```typescript
const effectiveTasks = tasks
  .filter(t => 
    app.filterLabelIds.length === 0 || 
    (t.labels || []).some(l => app.filterLabelIds.includes(l.id))
  );
```

**Tri plusieurs modes:**
```typescript
.sort((a, b) => {
  switch (app.sortMode) {
    case 'due': {
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return da - db || a.position - b.position;
    }
    case 'priority': {
      const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
    }
    case 'title':
      return a.title.localeCompare(b.title, 'fr');
    default:
      return a.position - b.position;
  }
});
```

### WIP Limits

```typescript
const wipPct = col.wip_limit > 0 
  ? Math.min(100, colTasks.length / col.wip_limit * 100) 
  : 0;

const wipOver = col.wip_limit > 0 && colTasks.length > col.wip_limit;
```

Affichage: "5 / 3" ou juste "5" si pas de limite.

### Progress Bars

**Checklist progress:**
```typescript
const clPct = checklist.length > 0 
  ? Math.round((doneCl.length / checklist.length) * 100) 
  : 0;
```

**Time tracking:**
```typescript
const timePct = task.estimated_hours > 0
  ? Math.min(100, Math.round((task.spent_hours / task.estimated_hours) * 100))
  : 0;
```

---

## VARIABLES CSS

Tailwind + CSS variables pour thème:

```css
:root {
  --bg: white;
  --panel: #f9fafb;
  --panel2: #f3f4f6;
  --ink: #111;
  --sub: #666;
  --sub2: #999;
  --line: #ddd;
  --line2: #eee;
  --accent: #5b50e8;
  --accent-soft: rgba(91, 80, 232, 0.1);
  --soft: #e5e7eb;
  --soft2: #f3f4f6;
  --hover: #f0f1f3;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --bg: #0f0f0f;
  --panel: #1a1a1a;
  --panel2: #222;
  --ink: #fff;
  --sub: #aaa;
  --sub2: #777;
  --accent: #7c3aed;
}

[data-density="compact"] {
  --col-head-pad: 10px;
  --card-gap: 6px;
  --board-pad: 12px;
}

[data-density="comfortable"] {
  --col-head-pad: 16px;
  --card-gap: 10px;
  --board-pad: 16px;
}
```

Appliqué en AppContext:
```typescript
useEffect(() => {
  document.documentElement.setAttribute('data-theme', state.theme);
  document.documentElement.setAttribute('data-density', state.density);
}, [state.theme, state.density]);
```

---

## ROADMAP

### Phase 1: Foundation ✅ DONE
- [x] Setup Vite + React + TypeScript
- [x] Configure Tailwind + PostCSS
- [x] Create database schema (14 tables)
- [x] Setup Supabase client
- [x] Create types/interfaces
- [x] Create AppContext + state management
- [x] Create custom hooks (useData)

### Phase 2: Core Features ✅ DONE
- [x] Auth (Supabase + guest mode)
- [x] Sidebar navigation
- [x] Board/folder structure
- [x] Kanban view + drag & drop
- [x] Task CRUD
- [x] Columns management
- [x] Task details drawer
- [x] Comments system
- [x] Checklist items
- [x] Labels/Tags
- [x] Assignees

### Phase 3: Advanced Features ⚠️ IN PROGRESS
- [ ] Automations (visual builder)
- [ ] Documents (rich editor)
- [ ] Agenda/Calendar full features
- [ ] AI Panel (summarization)
- [ ] Search modal optimization
- [ ] Import/Export (boardIO.ts)
- [ ] Real-time sync (Supabase subscriptions)

### Phase 4: Polish 🔄 TODO
- [ ] Performance optimization (memo, lazy load)
- [ ] Error handling (toast notifications)
- [ ] Loading states (skeletons)
- [ ] Responsive mobile design
- [ ] Accessibility (a11y)
- [ ] Dark mode refinement
- [ ] Animations (transitions)
- [ ] Unit tests
- [ ] E2E tests

### Phase 5: Production 🎯 TODO
- [ ] Environment variables setup
- [ ] Supabase env vars secure
- [ ] Build optimization
- [ ] Deployment (Vercel/Netlify)
- [ ] Analytics
- [ ] Error monitoring (Sentry)
- [ ] Performance monitoring

---

## COMMANDES PRINCIPALES

```bash
# Développement
npm run dev         # Vite dev server (http://localhost:5173)
npm run build       # Build optimisé
npm run preview     # Preview du build
npm run lint        # Lint code
npm run typecheck   # TypeScript check
```

---

## DÉPENDANCES CLÉS

```json
{
  "@supabase/supabase-js": "^2.57.4",  // Backend BaaS
  "react": "^18.3.1",                  // Framework UI
  "react-dom": "^18.3.1",              // DOM binding
  "lucide-react": "^0.344.0",          // Icons (500+)
  "tailwindcss": "^3.4.1",             // CSS utility
  "typescript": "^5.5.3",              // Type safety
  "vite": "^5.4.2"                     // Bundler
}
```

---

## TYPES PRINCIPAUX

```typescript
// Workspace/Organization
interface Workspace {
  id: string;
  name: string;
  plan: string;
  created_at: string;
}

interface Member {
  id: string;
  workspace_id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  preferred_board_id?: string | null;
  created_at: string;
}

// Board Management
interface Folder {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  created_at: string;
  boards?: Board[];
}

interface Board {
  id: string;
  folder_id: string;
  name: string;
  description: string | null;
  color: string;
  position: number;
  created_at: string;
  folder?: Folder;
  members?: Member[];
  columns?: Column[];
}

interface Column {
  id: string;
  board_id: string;
  name: string;
  color: string;
  position: number;
  wip_limit: number;
  created_at: string;
  tasks?: Task[];
}

// Tasks
interface Task {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  due_date: string | null;
  estimated_hours: number;
  spent_hours: number;
  position: number;
  is_blocked: boolean;
  block_reason: string | null;
  is_done: boolean;
  archived_at: string | null;
  comments_count: number;
  files_count: number;
  created_at: string;
  updated_at: string;
  labels?: Label[];
  assignees?: Member[];
  checklist_items?: ChecklistItem[];
  comments?: Comment[];
}

interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_at: string;
}

interface Comment {
  id: string;
  task_id: string;
  member_id: string;
  content: string;
  created_at: string;
  member?: Member;
}

// Meta
interface Label {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

interface Automation {
  id: string;
  workspace_id: string;
  title: string;
  trigger_desc: string;
  action_desc: string;
  runs_count: number;
  is_active: boolean;
  created_at: string;
}

interface Document {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  emoji: string;
  content: unknown[];
  author_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  author?: Member;
  children?: Document[];
}

// UI Types
type Screen = 'dashboard' | 'board' | 'mytasks' | 'documents' | 'automations' | 'archives';
type BoardView = 'kanban' | 'agenda' | 'automations';
type Theme = 'light' | 'dark';
type Density = 'comfortable' | 'compact';
```

---

## DÉTAILS TECHNIQUES AVANCÉS

### 1. Gestion des Dépendances dans useEffect

**Comment éviter les infini loops:**

```typescript
// ❌ MAUVAIS: Infini loop
useEffect(() => {
  reload();
}, [reload]);  // reload change chaque render!

// ✅ BON: Contrôlé
const reload = useCallback(() => {
  // ...
}, [boardId]);  // reload change SEULEMENT si boardId change

useEffect(() => {
  reload();
}, [reload, refreshKey]);  // Seulement quand refresh ou reload change
```

**Pourquoi?** `useCallback` mémorise la fonction. Sans elle, une nouvelle fonction est créée chaque render, ce qui déclenche useEffect, qui appelle reload, qui crée une nouvelle fonction... infini!

### 2. Optimisation des Re-renders

**Pattern: Séparer les états locaux des états globaux**

```typescript
// ❌ MAUVAIS: Trop de dépendances
function Kanban({ columns, tasks }) {
  const [dragTaskId, setDragTaskId] = useState(null);
  
  // Re-render PARTOUT quand tasks change
  const colTasks = tasks.filter(...);
  
  return <div>{colTasks.map(...)}</div>;
}

// ✅ BON: Séparer
function Kanban({ columns, tasks }) {
  const [dragTaskId, setDragTaskId] = useState(null);
  const [filterColId, setFilterColId] = useState(null);
  
  // Memoize: recalcul SEULEMENT si tasks/filterColId change
  const colTasks = useMemo(() => 
    tasks.filter(t => !filterColId || t.column_id === filterColId),
    [tasks, filterColId]
  );
  
  return <div>{colTasks.map(...)}</div>;
}
```

### 3. Handles de Drag & Drop Optimisés

**Comment drag & drop React fonctionne sans library:**

```typescript
// 1. STATE pour tracker le drag
const [dragTaskId, setDragTaskId] = useState<string | null>(null);
const [dragOverColId, setDragOverColId] = useState<string | null>(null);

// 2. HANDLERS
const handleDrop = (colId: string) => (e: React.DragEvent) => {
  e.preventDefault();  // ← Important! Sinon navigation par défaut
  
  if (dragTaskId) {
    app.moveTask(dragTaskId, colId);  // ← Optimistic update IMMÉDIAT
  }
  
  // Cleanup
  setDragTaskId(null);
  setDragOverColId(null);
};

// 3. JSX
<div
  onDragOver={e => {
    e.preventDefault();  // ← Important!
    if (dragOverColId !== col.id) setDragOverColId(col.id);
  }}
  onDrop={handleDrop(col.id)}
  style={{
    boxShadow: dragOverColId === col.id ? 'inset 0 0 0 2px var(--accent)' : 'none'
  }}
>
  {/* contenu */}
</div>
```

**Clés:**
- `e.preventDefault()` sur `onDragOver` pour accepter le drop
- `dragOverColId` pour visual feedback (surligner la colonne)
- Cleanup immédiat après drop

### 4. Enrichissement de Données: Pipeline Complexe

**Comment transformer des données plates en objets nested:**

```typescript
export function useTasks(boardId: string | null, refreshKey = 0) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const reload = useCallback(() => {
    if (!boardId) return;
    
    // ÉTAPE 1: SELECT avec JOINs (notation Supabase spéciale)
    supabase.from('tasks')
      .select(`
        *,
        task_labels(label_id, labels(*)),      // ← SELECT implicite labels
        task_assignees(member_id, members(*)), // ← SELECT implicite members
        checklist_items(*)                      // ← SELECT implicite checklist
      `)
      .eq('board_id', boardId)
      .order('position')
      .then(({ data }) => {
        if (!data) return;
        
        // ÉTAPE 2: Transformation du format Supabase→notre format
        const enriched = data.map((t) => ({
          ...t,
          // Extraire labels du junction
          labels: (t.task_labels || [])
            .map((tl: { labels: Label }) => tl.labels)
            .filter(Boolean),  // Retirer nulls (si referential integrity problème)
          
          // Extraire members du junction
          assignees: (t.task_assignees || [])
            .map((ta: { members: Member }) => ta.members)
            .filter(Boolean),
          
          // Trier par position (pour UI qui depend de l'ordre)
          checklist_items: (t.checklist_items || [])
            .sort((a: { position: number }, b: { position: number }) => 
              a.position - b.position
            ),
        }));
        
        setTasks(enriched);
      });
  }, [boardId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);
  
  return { tasks, loading, reload };
}
```

**Pourquoi ce pattern?**
1. **SELECT dans Supabase** = données plates (difficiles à utiliser)
2. **Transform en client** = flexibilité + facile à typer
3. **Filter(Boolean)** = défense contre referential integrity issues

### 5. Gestion des Overrides Optimistes

**Comment faire optimistic updates SANS erreurs:**

```typescript
// DANS APP CONTEXT
const moveTask = useCallback((taskId: string, newColumnId: string) => {
  // ÉTAPE 1: Update local immédiat
  setState(s => ({
    ...s,
    taskOverrides: { 
      ...s.taskOverrides, 
      [taskId]: { 
        ...(s.taskOverrides[taskId] || {}),  // Merge avec override existant
        column_id: newColumnId
      } 
    }
  }));
  
  // ÉTAPE 2: API call (pas d'await!)
  api.moveTaskToColumn(taskId, newColumnId)
    .catch(err => {
      // Fallback: rollback l'override
      setState(s => {
        const newOverrides = { ...s.taskOverrides };
        delete newOverrides[taskId];
        return { ...s, taskOverrides: newOverrides };
      });
      // En prod: toast error ici
      console.error('Failed to move task', err);
    });
}, []);

// DANS COMPOSANT
const effectiveTasks = tasks.map(t => {
  const ov = app.taskOverrides[t.id];
  if (!ov) return t;
  return { ...t, ...ov };  // Merge override avec données DB
});
```

**Edge cases gérés:**
- ✅ Multiple overrides sur même task (merge avec `...`)
- ✅ Cleanup quand refresh (reset refreshCounter nettoie tout)
- ✅ Fallback si API échoue

### 6. Cache Busting Intelligent

**Comment rafraîchir toutes les données sans tout recharger:**

```typescript
// EN APP CONTEXT
const refreshAll = useCallback(() => {
  setState(s => ({ 
    ...s, 
    refreshCounter: s.refreshCounter + 1,  // ← Clé magique
    taskOverrides: {},                       // ← Nettoyer overrides
    automationOverrides: {},
    checklistOverrides: {},
  }));
}, []);

// DANS LES HOOKS
useEffect(() => { 
  reload(); 
}, [reload, refreshKey]);  // ← Dépend du refreshCounter!

// EN COMPOSANT
const { folders } = useFolders(WORKSPACE_ID, app.refreshCounter);
const { board } = useBoard(activeBoardId, app.refreshCounter);
const { tasks } = useTasks(activeBoardId, app.refreshCounter);
```

**Comment ça marche?**
1. User crée tâche → `addTask()` appelé
2. `addTask()` → API call + `setState({ refreshCounter++ })`
3. TOUS les hooks avec `app.refreshCounter` dans dépendances déclenchent `reload()`
4. `reload()` → `supabase.from(...).select()`
5. Data fraîche arrive → UI re-render

**Avantage:** Un seul signal (`refreshCounter`) pour tout rafraîchir!

### 7. Filtrage et Tri Performants

**Comment filtrer/trier sans re-calculer à chaque render:**

```typescript
const getTasksForColumn = useCallback((colId: string) => {
  return tasks
    // FILTRE 1: Appliquer overrides (optimistic)
    .filter(t => {
      const override = app.taskOverrides[t.id];
      const actualColId = override?.column_id ?? t.column_id;
      return actualColId === colId;
    })
    // FILTRE 2: Appliquer filtres de labels
    .filter(t => 
      app.filterLabelIds.length === 0 ||  // Si pas de filtre: tous
      (t.labels || []).some(l => app.filterLabelIds.includes(l.id))
    )
    // TRI: Selon le mode
    .sort((a, b) => {
      switch (app.sortMode) {
        case 'due': {
          const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return da - db || a.position - b.position;
        }
        case 'priority': {
          const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || a.position - b.position;
        }
        case 'title':
          return a.title.localeCompare(b.title, 'fr') || a.position - b.position;
        default:
          return a.position - b.position;
      }
    });
}, [tasks, app.taskOverrides, app.filterLabelIds, app.sortMode]);
```

**Optimisations:**
- `useCallback` mémorise = pas recalculé chaque render
- Court-circuit logique (`||`) pour conditions rapides
- `?? Infinity` au lieu de `null` pour dates (facile à trier)

### 8. Gestion des États Interconnectés

**Comment gérer des états qui dépendent les uns des autres:**

```typescript
// PROBLÈME: state.screen, state.boardView, state.selectedTaskId sont liés!
// Si screen change → on veut reset selectedTaskId et boardView

// SOLUTION: Fonctions contexte dédiées
const goTo = useCallback((screen: Screen, boardView?: BoardView) => {
  setState(s => ({ 
    ...s, 
    screen, 
    boardView: boardView ?? s.boardView,  // Garder ancien si pas spécifié
    selectedTaskId: null,                  // Reset toujours
    aiOpen: false,                         // Reset toujours
    wsOpen: false,                         // Reset toujours
  }));
}, []);

// Utilisation
app.goTo('board', 'kanban');  // Change les 3 à la fois + reset les autres
```

**Pattern clé:** Les fonctions contexte gèrent les transitions d'état, pas juste le state!

### 9. Keyboard Shortcuts Optimisées

**Comment implémenter Cmd+K sans bugs:**

```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    // ✅ Vérifier métaKey (Mac) OU ctrlKey (Windows)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      // ✅ Empêcher comportement par défaut du navigateur
      e.preventDefault();
      
      // ✅ Appeler l'action
      app.toggleSearch();
    }
  };
  
  // ✅ Ajouter listener
  window.addEventListener('keydown', onKey);
  
  // ✅ Cleanup important! Sinon listeners s'accumulent
  return () => window.removeEventListener('keydown', onKey);
}, [app]);  // ← Dépendre de app pour avoir latest version
```

**Pièges évités:**
- ✅ `metaKey` pour Mac, `ctrlKey` pour Windows
- ✅ `e.preventDefault()` pour éviter comportements du navigateur
- ✅ Cleanup dans return()
- ✅ Dépendre de `app` pour avoir dernière version

### 10. Gestion des Modales Exclusives

**Comment empêcher plusieurs modales ouvertes:**

```typescript
// DANS APP CONTEXT
const toggleSettings = useCallback(() => {
  setState(s => ({ 
    ...s, 
    settingsOpen: !s.settingsOpen,  // Toggle settings
    searchOpen: false,               // Fermer les autres
    createFolderOpen: false,         // Fermer les autres
  }));
}, []);

const toggleSearch = useCallback(() => {
  setState(s => ({ 
    ...s, 
    searchOpen: !s.searchOpen,       // Toggle search
    settingsOpen: false,             // Fermer les autres
    createFolderOpen: false,         // Fermer les autres
  }));
}, []);

// DANS JSX
{app.settingsOpen && <SettingsPanel />}
{app.searchOpen && <SearchModal />}
{app.createFolderOpen && <CreateFolderModal />}
{/* ← Jamais 2 modales ouvertes en même temps */}
```

**Pattern clé:** Quand on ouvre une modale → fermer les autres!

### 11. Validation Blanche (Whitelist)

**Comment accepter SEULEMENT certains champs en UPDATE:**

```typescript
export async function updateTask(taskId: string, updates: Partial<Task>) {
  // ÉTAPE 1: Créer une whitelist de champs modifiables
  const allowed: Record<string, unknown> = {};
  const fields = [
    'title',
    'description',
    'priority',
    'due_date',
    'estimated_hours',
    'spent_hours',
    'is_blocked',
    'block_reason',
    'column_id',
    'is_done',
    'archived_at',
    'updated_at',
  ];
  
  // ÉTAPE 2: Copier SEULEMENT les champs whitelist
  for (const f of fields) {
    if (f in updates) {
      allowed[f] = (updates as Record<string, unknown>)[f];
    }
  }
  
  // ÉTAPE 3: Forcer updated_at
  allowed['updated_at'] = new Date().toISOString();
  
  // ÉTAPE 4: UPDATE SEULEMENT avec champs whitelist
  const { error } = await supabase
    .from('tasks')
    .update(allowed)  // ← Jamais l'objet raw updates!
    .eq('id', taskId);
  
  return { error };
}
```

**Sécurité:** On ne laisse pas le client modifier `id`, `board_id`, `created_at`, etc!

### 12. Gestion des Erreurs Silencieuses

**Comment éviter les erreurs non-catchées:**

```typescript
// ❌ MAUVAIS: Erreur non-catchée
const reload = useCallback(() => {
  supabase.from('tasks').select('*').then(({ data }) => {
    setTasks(data || []);  // Si erreur, `data` est undefined mais pas d'erreur!
  });
}, []);

// ✅ BON: Gérer les erreurs
const reload = useCallback(() => {
  supabase.from('tasks').select('*').then(({ data, error }) => {
    if (error) {
      console.error('Failed to load tasks', error);
      // En prod: Toast error ici
      return;
    }
    setTasks(data || []);
  }).catch(err => {
    console.error('Network error', err);
    // En prod: Toast error ici
  });
}, []);
```

**Pattern clé:** Toujours vérifier `error` dans responses Supabase!

### 13. Gestion des Timeouts et Loading States

**Comment afficher loading sans bloquer l'UI:**

```typescript
export function useTasks(boardId: string | null, refreshKey = 0) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!boardId) return;
    
    // IMPORTANTE: Ne fermer le loading que APRÈS data arrive
    setLoading(true);
    
    supabase.from('tasks')
      .select('...')
      .eq('board_id', boardId)
      .then(({ data }) => {
        if (data) setTasks(data);
      })
      .finally(() => setLoading(false));  // ← Toujours appelé
  }, [boardId]);

  useEffect(() => { reload(); }, [reload, refreshKey]);
  
  return { tasks, loading, reload };
}

// UTILISATION
const { tasks, loading } = useTasks(boardId);

if (loading) return <Skeleton />;
return <TaskList tasks={tasks} />;
```

**Pattern clé:** `finally()` pour cleanup garanti!

### 14. Authentification en Couches

**Comment implémenter guest mode + login:**

```typescript
// ÉTAPE 1: Check session existante
const [session, setSession] = useState<Session | null | undefined>(undefined);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);  // null ou Session
  });
}, []);

// ÉTAPE 2: Écouter changements
useEffect(() => {
  const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
    setSession(s);
  });
  return () => sub.subscription.unsubscribe();
}, []);

// ÉTAPE 3: Fallback guest mode
const [guest, setGuest] = useState(() => 
  localStorage.getItem('lyova_guest') === '1'
);

const enterGuest = () => {
  localStorage.setItem('lyova_guest', '1');
  setGuest(true);
};

// ÉTAPE 4: Router
if (!guest && session === undefined) {
  return <Loading />;  // En train de checker
}

if (!guest && !session) {
  return <LoginScreen onGuest={enterGuest} />;  // Pas authentifié
}

// OK: authé OU guest mode
return <AppContent session={session} />;
```

**Flux:**
1. `session === undefined` → Chargement (Supabase checke)
2. `session === null && !guest` → LoginScreen
3. `session !== null` → Authentifié
4. `guest === true` → Mode démo

### 15. CSS Variables pour Thème Dynamique

**Comment implémenter light/dark mode sans recharger:**

```typescript
// DANS APP CONTEXT
useEffect(() => {
  // Set data-* attributes sur html element
  document.documentElement.setAttribute('data-theme', state.theme);
  document.documentElement.setAttribute('data-density', state.density);
}, [state.theme, state.density]);

// DANS CSS
:root {
  --bg: white;
  --ink: #111;
  --accent: #5b50e8;
  /* ... */
}

[data-theme="dark"] {
  --bg: #0f0f0f;
  --ink: #fff;
  --accent: #7c3aed;
  /* ... */
}

// DANS JSX
<div style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
  {/* Couleurs changent automatiquement quand data-theme change! */}
</div>
```

**Avantage:** Pas besoin de re-render tous les composants, juste les CSS variables changent!

---

## CONCLUSION

**LyovaTache** est une application moderne, scalable et type-safe pour la gestion collaborative de tâches. Elle combine:

✅ **Frontend moderne:** React 18 + TypeScript + Vite (avec Vite HMR ultra-rapide)
✅ **Backend robuste:** Supabase PostgreSQL + RLS + Migrations versionnées
✅ **Architecture clean:** Separation of concerns (context/hooks/components/lib)
✅ **UX réactive:** Optimistic updates + Instant feedback + Drag & drop natif
✅ **Données rich:** Hiérarchie, relations, metadata, soft-deletes
✅ **Fonctionnalités avancées:** Kanban, calendrier, documents, automations
✅ **Patterns avancés:** Enrichissement, cache busting, validation whitelist
✅ **Sécurité:** RLS, validation côté client, pas d'error leaks

**Prêt pour production** avec quelques optimisations:
- Performance: Ajouter memo(), lazy loading, code splitting
- Erreurs: Toast notifications, Sentry monitoring
- Tests: Jest, React Testing Library, E2E avec Playwright
- Déploiement: GitHub Actions CI/CD, Vercel/Netlify

---

**Document généré:** 19 Juin 2026  
**Version:** 2.0 (Avec Détails Techniques Avancés)  
**Auteur:** Documentation Complète LyovaTache
