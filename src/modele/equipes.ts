// Couche données — Équipes · Accès (périmètre/rôle) · Invitations · Mentions · Liens documents.
import { useEffect, useState } from 'react';
import { supabase } from '../outils/supabase';
import { loadCache, saveCache } from '../outils/cache';
import { cleanInput } from '../outils/sanitizer';
import type { Member, MemberAccess, AccessScope, AccessRole, Invitation, Team, Document, Task, Label } from './types';

// ── Équipes (services) ──
export function useTeams(workspaceId: string | undefined, refreshKey = 0) {
  const [teams, setTeams] = useState<Team[]>(() => loadCache<Team[]>('teams_' + workspaceId, []));
  useEffect(() => {
    if (!workspaceId) return;
    supabase.from('teams').select('*, team_members(member_id, members(*))').eq('workspace_id', workspaceId).order('created_at')
      .then(({ data }) => {
        if (data) {
          const enriched = data.map((t) => ({
            ...t,
            members: ((t.team_members as Array<{ members: Member }>) || []).map((tm) => tm.members).filter(Boolean),
          })) as Team[];
          setTeams(enriched);
          saveCache('teams_' + workspaceId, enriched);
        }
      });
  }, [workspaceId, refreshKey]);
  return teams;
}

export async function createTeam(workspaceId: string, name: string, service: string, color: string) {
  const { data, error } = await supabase.from('teams')
    .insert({ workspace_id: workspaceId, name: cleanInput(name), service: cleanInput(service), color })
    .select().single();
  return { data: data as Team | null, error };
}

export async function updateTeam(teamId: string, updates: { name?: string; service?: string; color?: string }) {
  const clean: Record<string, unknown> = {};
  if (updates.name !== undefined) clean.name = cleanInput(updates.name);
  if (updates.service !== undefined) clean.service = cleanInput(updates.service);
  if (updates.color !== undefined) clean.color = updates.color;
  const { error } = await supabase.from('teams').update(clean).eq('id', teamId);
  return { error };
}

export async function deleteTeam(teamId: string) {
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  return { error };
}

export async function addTeamMember(teamId: string, memberId: string) {
  const { error } = await supabase.from('team_members').insert({ team_id: teamId, member_id: memberId });
  return { error };
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('member_id', memberId);
  return { error };
}

// ── Accès des membres (périmètre + rôle) ──
export function useMemberAccess(workspaceId: string | undefined, refreshKey = 0) {
  const [rows, setRows] = useState<MemberAccess[]>(() => loadCache<MemberAccess[]>('access_' + workspaceId, []));
  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      supabase.from('member_access').select('*').eq('workspace_id', workspaceId),
      supabase.from('member_folder_access').select('*'),
      supabase.from('member_board_access').select('*'),
    ]).then(([a, f, b]) => {
      const fa = (f.data || []) as Array<{ member_id: string; folder_id: string }>;
      const ba = (b.data || []) as Array<{ member_id: string; board_id: string }>;
      const enriched = ((a.data || []) as Array<Record<string, unknown>>).map((r) => ({
        ...(r as unknown as MemberAccess),
        folderIds: fa.filter((x) => x.member_id === r.member_id).map((x) => x.folder_id),
        boardIds: ba.filter((x) => x.member_id === r.member_id).map((x) => x.board_id),
      })) as MemberAccess[];
      setRows(enriched);
      saveCache('access_' + workspaceId, enriched);
    });
  }, [workspaceId, refreshKey]);
  return rows;
}

export async function setMemberAccess(
  workspaceId: string,
  memberId: string,
  opts: { scope: AccessScope; role: AccessRole; folderIds?: string[]; boardIds?: string[] },
) {
  const { error } = await supabase.from('member_access')
    .upsert({ workspace_id: workspaceId, member_id: memberId, scope: opts.scope, role: opts.role }, { onConflict: 'workspace_id,member_id' });
  await supabase.from('member_folder_access').delete().eq('member_id', memberId);
  if (opts.scope === 'folders' && opts.folderIds?.length) {
    await supabase.from('member_folder_access').insert(opts.folderIds.map((fid) => ({ member_id: memberId, folder_id: fid })));
  }
  await supabase.from('member_board_access').delete().eq('member_id', memberId);
  if (opts.scope === 'boards' && opts.boardIds?.length) {
    await supabase.from('member_board_access').insert(opts.boardIds.map((bid) => ({ member_id: memberId, board_id: bid })));
  }
  return { error };
}

// ── Invitations par email ──
export function useInvitations(workspaceId: string | undefined, refreshKey = 0) {
  const [invitations, setInvitations] = useState<Invitation[]>(() => loadCache<Invitation[]>('invites_' + workspaceId, []));
  useEffect(() => {
    if (!workspaceId) return;
    supabase.from('invitations').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) { setInvitations(data as Invitation[]); saveCache('invites_' + workspaceId, data); }
      });
  }, [workspaceId, refreshKey]);
  return invitations;
}

export async function createInvitation(
  workspaceId: string,
  opts: { email: string; role: AccessRole; scope: AccessScope; folderIds?: string[]; boardIds?: string[]; message?: string; invitedBy?: string | null },
) {
  const { data, error } = await supabase.from('invitations').insert({
    workspace_id: workspaceId,
    email: cleanInput(opts.email),
    role: opts.role,
    scope: opts.scope,
    folder_ids: opts.folderIds ?? [],
    board_ids: opts.boardIds ?? [],
    message: opts.message ? cleanInput(opts.message) : null,
    invited_by: opts.invitedBy ?? null,
  }).select().single();
  return { data: data as Invitation | null, error };
}

export async function updateInvitationStatus(id: string, status: 'pending' | 'accepted' | 'revoked') {
  const { error } = await supabase.from('invitations').update({ status }).eq('id', id);
  return { error };
}

export async function deleteInvitation(id: string) {
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  return { error };
}

// ── Mentions sur tâche (tag → notification dans l'espace perso) ──
export async function addTaskMention(taskId: string, memberId: string) {
  const { error } = await supabase.from('task_mentions').insert({ task_id: taskId, member_id: memberId });
  return { error };
}

// ── Liens documents ↔ tâches / bureaux ──
export type LinkTarget = 'task' | 'board';

export function useDocumentLinks(targetType: LinkTarget, targetId: string | null | undefined, refreshKey = 0) {
  const [docs, setDocs] = useState<Array<Document & { linkId: string }>>([]);
  useEffect(() => {
    if (!targetId) { setDocs([]); return; }
    supabase.from('document_links').select('id, documents(*)').eq('target_type', targetType).eq('target_id', targetId)
      .then(({ data }) => {
        if (data) {
          setDocs((data as Array<{ id: string; documents: Document }>)
            .filter(r => r.documents)
            .map(r => ({ ...r.documents, linkId: r.id })));
        }
      });
  }, [targetType, targetId, refreshKey]);
  return docs;
}

export async function linkDocument(documentId: string, targetType: LinkTarget, targetId: string) {
  const { error } = await supabase.from('document_links').insert({ document_id: documentId, target_type: targetType, target_id: targetId });
  return { error };
}

export async function unlinkDocument(linkId: string) {
  const { error } = await supabase.from('document_links').delete().eq('id', linkId);
  return { error };
}

// ── Acceptation des invitations par email ──
// À la connexion, si des invitations « pending » visent l'email du compte :
// on l'ajoute comme membre de l'espace (rôle/périmètre prévus), on marque l'invitation acceptée,
// et on dépose une notification de bienvenue. Renvoie le nombre d'invitations acceptées.
export async function acceptPendingInvitations(authId: string, email: string | null): Promise<number> {
  if (!email) return 0;
  const { data: invs } = await supabase.from('invitations').select('*').eq('email', email).eq('status', 'pending');
  if (!invs || invs.length === 0) return 0;

  let accepted = 0;
  for (const inv of invs as Invitation[]) {
    // Déjà membre de cet espace ?
    const existing = await supabase.from('members').select('id').eq('workspace_id', inv.workspace_id).eq('auth_id', authId).limit(1);
    let memberId = (existing.data?.[0] as { id: string } | undefined)?.id;

    if (!memberId) {
      const base = email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'Membre';
      const initials = base.split(/\s+/).map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
      const ins = await supabase.from('members')
        .insert({ workspace_id: inv.workspace_id, name: base, initials, color: '#0ea5e9', role: 'Membre', email, auth_id: authId })
        .select('id').single();
      memberId = (ins.data as { id: string } | null)?.id;
    }

    if (memberId) {
      await setMemberAccess(inv.workspace_id, memberId, { scope: inv.scope, role: inv.role, folderIds: inv.folder_ids, boardIds: inv.board_ids });
      await supabase.from('invitations').update({ status: 'accepted' }).eq('id', inv.id);
      await supabase.from('notifications').insert({ workspace_id: inv.workspace_id, member_id: memberId, icon: '✉️', message: `Tu as rejoint un espace via une invitation (rôle ${inv.role}).` });
      accepted++;
    }
  }
  return accepted;
}

// ── Liaison de tâches inter-bureaux ──
export interface AccessibleBoard { id: string; name: string; color: string; folderName: string; workspaceName: string; }

// Tous les Bureaux auxquels l'utilisateur a accès (la RLS filtre déjà à ses espaces).
export function useAccessibleBoards(refreshKey = 0) {
  const [boards, setBoards] = useState<AccessibleBoard[]>([]);
  useEffect(() => {
    supabase.from('boards')
      .select('id, name, color, deleted_at, folder:folders!inner(name, workspace:workspaces(name))')
      .is('deleted_at', null)
      .then(({ data }) => {
        if (data) {
          setBoards((data as Array<Record<string, unknown>>).map((b) => {
            const f = b.folder as { name?: string; workspace?: { name?: string } } | undefined;
            return { id: b.id as string, name: b.name as string, color: b.color as string, folderName: f?.name ?? '', workspaceName: f?.workspace?.name ?? '' };
          }));
        }
      });
  }, [refreshKey]);
  return boards;
}

export interface TaskLink { linkId: string; boardId: string; boardName: string; }

// Bureaux auxquels une tâche est liée (vue depuis la tâche).
export function useTaskLinks(taskId: string | null | undefined, refreshKey = 0) {
  const [links, setLinks] = useState<TaskLink[]>([]);
  useEffect(() => {
    if (!taskId) { setLinks([]); return; }
    supabase.from('task_links').select('id, target_board_id, boards(name)').eq('task_id', taskId)
      .then(({ data }) => {
        if (data) {
          setLinks((data as Array<Record<string, unknown>>).map((r) => ({
            linkId: r.id as string,
            boardId: r.target_board_id as string,
            boardName: (r.boards as { name?: string } | undefined)?.name ?? 'Bureau',
          })));
        }
      });
  }, [taskId, refreshKey]);
  return links;
}

// Tâches liées À un Bureau (pour la colonne « Liée »), enrichies pour l'affichage des cartes.
export function useLinkedTasks(boardId: string | null, refreshKey = 0) {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    if (!boardId) { setTasks([]); return; }
    supabase.from('task_links')
      .select('tasks(*, task_labels(label_id, labels(*)), task_assignees(member_id, members(*)), checklist_items(*))')
      .eq('target_board_id', boardId)
      .then(({ data }) => {
        if (data) {
          const ts = (data as Array<{ tasks: Record<string, unknown> | null }>)
            .map((r) => r.tasks).filter(Boolean)
            .map((t) => ({
              ...(t as Task),
              labels: ((t!.task_labels as Array<{ labels: Label }>) || []).map((x) => x.labels).filter(Boolean),
              assignees: ((t!.task_assignees as Array<{ members: Member }>) || []).map((x) => x.members).filter(Boolean),
              checklist_items: (t!.checklist_items as unknown[]) || [],
            })) as Task[];
          setTasks(ts);
        }
      });
  }, [boardId, refreshKey]);
  return tasks;
}

export async function linkTaskToBoard(taskId: string, targetBoardId: string) {
  const { error } = await supabase.from('task_links').insert({ task_id: taskId, target_board_id: targetBoardId });
  return { error };
}

export async function unlinkTaskLink(linkId: string) {
  const { error } = await supabase.from('task_links').delete().eq('id', linkId);
  return { error };
}
