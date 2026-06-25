import type { Folder, MemberAccess, AccessRole } from '../modele/types';

// Résout les tableaux accessibles d'un membre selon son périmètre.
// Retourne 'all' (accès total) ou la liste des board ids autorisés.
export function accessibleBoardIds(access: MemberAccess | undefined, folders: Folder[]): 'all' | string[] {
  if (!access || access.scope === 'full') return 'all';
  if (access.scope === 'folders') {
    const set = new Set(access.folderIds);
    return folders.filter((f) => set.has(f.id)).flatMap((f) => (f.boards || []).map((b) => b.id));
  }
  return access.boardIds;
}

// Rôle effectif d'un membre (défaut : member). Le Propriétaire/Admin n'est jamais bridé.
export function roleOf(access: MemberAccess | undefined, memberRole?: string): AccessRole | 'owner' {
  if (memberRole === 'Propriétaire' || memberRole === 'Admin') return 'owner';
  return access?.role ?? 'member';
}

export function canEdit(role: AccessRole | 'owner'): boolean {
  return role !== 'viewer';
}

export const ROLE_LABELS: Record<AccessRole, string> = {
  member: 'Membre',
  editor: 'Éditeur',
  viewer: 'Observateur',
};

export const SCOPE_LABELS: Record<string, string> = {
  full: "Tout l'espace",
  folders: 'Certains dossiers',
  boards: 'Certains tableaux',
};
