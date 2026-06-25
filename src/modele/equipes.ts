// Couche données — Équipes · Accès (périmètre/rôle) · Invitations · Mentions · Liens documents.
import { useEffect, useState } from 'react';
import { supabase } from '../outils/supabase';
import { loadCache, saveCache } from '../outils/cache';
import { cleanInput } from '../outils/sanitizer';
import type { Member, MemberAccess, AccessScope, AccessRole, Invitation, Team, Document } from './types';

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
