export interface Workspace {
  id: string;
  name: string;
  plan: string;
  created_at: string;
}

export interface Member {
  id: string;
  workspace_id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  email?: string | null;
  auth_id?: string | null;
  preferred_board_id?: string | null;
  created_at: string;
}

export interface Folder {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  created_at: string;
  boards?: Board[];
}

export interface Board {
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

export interface Column {
  id: string;
  board_id: string;
  name: string;
  color: string;
  position: number;
  wip_limit: number;
  created_at: string;
  tasks?: Task[];
}

export interface Label {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
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

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  member_id: string;
  content: string;
  created_at: string;
  member?: Member;
}

export interface Automation {
  id: string;
  workspace_id: string;
  title: string;
  trigger_desc: string;
  action_desc: string;
  runs_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Document {
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

export interface Notification {
  id: string;
  workspace_id: string;
  member_id: string | null;
  icon: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type AccessScope = 'full' | 'folders' | 'boards';
export type AccessRole = 'member' | 'editor' | 'viewer';

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  service: string | null;
  color: string;
  created_at: string;
  members?: Member[];
}

export interface MemberAccess {
  id: string;
  workspace_id: string;
  member_id: string;
  scope: AccessScope;
  role: AccessRole;
  created_at: string;
  folderIds: string[];
  boardIds: string[];
}

export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: AccessRole;
  scope: AccessScope;
  folder_ids: string[];
  board_ids: string[];
  message: string | null;
  status: 'pending' | 'accepted' | 'revoked';
  invited_by: string | null;
  created_at: string;
}

export type Screen = 'dashboard' | 'board' | 'mytasks' | 'documents' | 'automations' | 'notifications' | 'archives' | 'stats' | 'teams';
export type BoardView = 'kanban' | 'agenda' | 'automations';
export type Theme = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
