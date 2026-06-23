import { useState } from 'react';
import type { Member, Folder, Board } from '../types';
import { useApp } from '../context/AppContext';
import {
  useTeams, useMemberAccess, useInvitations,
  createTeam, updateTeam, deleteTeam, addTeamMember, removeTeamMember,
  setMemberAccess, updateInvitationStatus, deleteInvitation,
} from '../hooks/useData';
import { ROLE_LABELS, SCOPE_LABELS } from '../lib/access';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { InviteWizard } from '../components/InviteWizard';
import { AccessEditor } from '../components/AccessEditor';

interface TeamsProps {
  workspaceId: string;
  members: Member[];
  folders: (Folder & { boards?: Board[] })[];
  currentMemberId: string;
}

const PALETTE = ['#5b50e8', '#0A6655', '#B85C00', '#A12222', '#2D6A0E', '#6B6A67'];

export function Teams({ workspaceId, members, folders, currentMemberId }: TeamsProps) {
  const app = useApp();
  const teams = useTeams(workspaceId, app.refreshCounter);
  const access = useMemberAccess(workspaceId, app.refreshCounter);
  const invitations = useInvitations(workspaceId, app.refreshCounter);
  const [wizard, setWizard] = useState(false);
  const [editAccess, setEditAccess] = useState<Member | null>(null);
  const folderName = new Map(folders.map((f) => [f.id, f.name]));
  const boardName = new Map(folders.flatMap((f) => (f.boards || []).map((b) => [b.id, b.name] as [string, string])));

  function scopeDetail(a: ReturnType<typeof access.find>): string {
    if (!a || a.scope === 'full') return "Tout l'espace";
    if (a.scope === 'folders') return 'Dossiers : ' + (a.folderIds.map((id) => folderName.get(id)).filter(Boolean).join(', ') || '—');
    return 'Tableaux : ' + (a.boardIds.map((id) => boardName.get(id)).filter(Boolean).join(', ') || '—');
  }

  async function newTeam() {
    const name = await promptDialog('Nom de l\'équipe', '');
    if (!name?.trim()) return;
    const service = await promptDialog('Service (optionnel)', '') ?? '';
    await createTeam(workspaceId, name.trim(), service.trim(), PALETTE[teams.length % PALETTE.length]);
    app.refreshAll();
  }
  async function renameTeam(id: string, current: string) {
    const name = await promptDialog('Renommer l\'équipe', current);
    if (name?.trim()) { await updateTeam(id, { name: name.trim() }); app.refreshAll(); }
  }
  async function removeTeam(id: string, name: string) {
    if (await confirmDialog('Supprimer l\'équipe ?', { message: `« ${name} » sera supprimée (les membres restent dans l'espace).`, danger: true })) {
      await deleteTeam(id); app.refreshAll();
    }
  }
  async function onAddMember(teamId: string, memberId: string) {
    if (!memberId) return;
    await addTeamMember(teamId, memberId); app.refreshAll();
  }
  async function onRemoveMember(teamId: string, memberId: string) {
    await removeTeamMember(teamId, memberId); app.refreshAll();
  }
  async function changeRole(memberId: string, role: 'member' | 'editor' | 'viewer', scope: 'full' | 'folders' | 'boards', folderIds: string[], boardIds: string[]) {
    await setMemberAccess(workspaceId, memberId, { role, scope, folderIds, boardIds });
    app.refreshAll();
  }
  async function removeFromSpace(m: Member) {
    if (await confirmDialog('Retirer de l\'espace ?', { message: `${m.name} sera retiré de l'espace : accès, équipes et assignations associés seront supprimés. Action irréversible.`, danger: true, confirmLabel: 'Retirer' })) {
      await app.deleteMember(m.id);
      app.refreshAll();
    }
  }

  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' };
  const th: React.CSSProperties = { fontSize: 10.5, fontWeight: 600, color: 'var(--sub2)', textAlign: 'left', padding: '0 10px 8px 0', borderBottom: '1px solid var(--line)' };
  const td: React.CSSProperties = { fontSize: 12.5, padding: '9px 10px 9px 0', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '22px 26px 40px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Équipes & accès</h1>
          <p style={{ fontSize: 13, color: 'var(--sub2)', marginTop: 2 }}>Gère les équipes par service, les invitations et les accès à l'espace.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={newTeam} style={ghost}>+ Nouvelle équipe</button>
          <button onClick={() => setWizard(true)} style={primary}>Inviter dans l'espace</button>
        </div>
      </div>

      {/* Équipes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {teams.map((t) => {
          const inTeam = new Set((t.members || []).map((m) => m.id));
          const available = members.filter((m) => !inTeam.has(m.id));
          return (
            <div key={t.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: t.color + '22', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{t.name[0]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{t.name}</div>
                  {t.service && <div style={{ fontSize: 11, color: 'var(--sub2)' }}>{t.service}</div>}
                </div>
                <span onClick={() => renameTeam(t.id, t.name)} title="Renommer" style={iconBtn}>✎</span>
                <span onClick={() => removeTeam(t.id, t.name)} title="Supprimer" style={{ ...iconBtn, color: '#ef4444' }}>🗑</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {(t.members || []).map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: m.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.initials}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink)', flex: 1 }}>{m.name}</span>
                    <span onClick={() => onRemoveMember(t.id, m.id)} title="Retirer" style={{ cursor: 'pointer', color: 'var(--sub2)', fontSize: 14 }}>×</span>
                  </div>
                ))}
                {(t.members || []).length === 0 && <div style={{ fontSize: 11.5, color: 'var(--sub2)' }}>Aucun membre.</div>}
              </div>
              {available.length > 0 && (
                <select value="" onChange={(e) => onAddMember(t.id, e.target.value)} style={select}>
                  <option value="">+ Ajouter un membre…</option>
                  {available.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
            </div>
          );
        })}
        {teams.length === 0 && (
          <div style={{ ...card, gridColumn: '1/-1', textAlign: 'center', color: 'var(--sub2)', fontSize: 13, padding: 30 }}>
            Aucune équipe. Clique sur « + Nouvelle équipe » pour en créer une (ex. Dev, Design, Support).
          </div>
        )}
      </div>

      {/* Membres & accès */}
      <div style={card}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Membres & accès à l'espace</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Membre</th><th style={th}>Périmètre</th><th style={th}>Rôle</th><th style={{ ...th, textAlign: 'right' }}>Accès</th></tr></thead>
            <tbody>
              {members.map((m) => {
                const a = access.find((x) => x.member_id === m.id);
                const isOwner = m.role === 'Propriétaire' || m.role === 'Admin';
                return (
                  <tr key={m.id}>
                    <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 24, height: 24, borderRadius: '50%', background: m.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{m.initials}</span><span style={{ color: 'var(--ink)' }}>{m.name}</span></span></td>
                    <td style={{ ...td, color: 'var(--sub)' }}>{isOwner ? 'Tout (propriétaire)' : scopeDetail(a)}</td>
                    <td style={td}>
                      {isOwner ? <span style={{ color: 'var(--sub2)' }}>Propriétaire</span> : (
                        <select value={a?.role ?? 'member'} onChange={(e) => changeRole(m.id, e.target.value as 'member' | 'editor' | 'viewer', a?.scope ?? 'full', a?.folderIds ?? [], a?.boardIds ?? [])} style={{ ...select, width: 'auto', padding: '4px 8px' }}>
                          <option value="member">{ROLE_LABELS.member}</option>
                          <option value="editor">{ROLE_LABELS.editor}</option>
                          <option value="viewer">{ROLE_LABELS.viewer}</option>
                        </select>
                      )}
                    </td>
                    <td style={td}>
                      {!isOwner && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditAccess(m)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: '#5b50e8', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Gérer le périmètre</button>
                          <button onClick={() => removeFromSpace(m)} title="Retirer de l'espace" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Retirer</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Invitations par email</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invitations.map((inv) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{inv.email}</span>
                <span style={{ fontSize: 11, color: 'var(--sub2)' }}>{ROLE_LABELS[inv.role]} · {SCOPE_LABELS[inv.scope]}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, color: inv.status === 'pending' ? '#B85C00' : inv.status === 'accepted' ? '#2D6A0E' : '#A12222', background: (inv.status === 'pending' ? '#B85C00' : inv.status === 'accepted' ? '#2D6A0E' : '#A12222') + '1f' }}>{inv.status === 'pending' ? 'En attente' : inv.status === 'accepted' ? 'Acceptée' : 'Révoquée'}</span>
                {inv.status === 'pending' && <span onClick={async () => { await updateInvitationStatus(inv.id, 'revoked'); app.refreshAll(); }} title="Révoquer" style={iconBtn}>⊘</span>}
                <span onClick={async () => { await deleteInvitation(inv.id); app.refreshAll(); }} title="Supprimer" style={{ ...iconBtn, color: '#ef4444' }}>🗑</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {wizard && (
        <InviteWizard
          workspaceId={workspaceId}
          members={members}
          folders={folders}
          teams={teams}
          currentMemberId={currentMemberId}
          onClose={() => setWizard(false)}
          onDone={() => app.refreshAll()}
        />
      )}

      {editAccess && (
        <AccessEditor
          workspaceId={workspaceId}
          member={editAccess}
          access={access.find((x) => x.member_id === editAccess.id)}
          folders={folders}
          onClose={() => setEditAccess(null)}
          onSaved={() => app.refreshAll()}
        />
      )}
      </div>
    </div>
  );
}

const ghost: React.CSSProperties = { fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--sub)', cursor: 'pointer', fontFamily: 'inherit' };
const primary: React.CSSProperties = { fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#5b50e8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' };
const iconBtn: React.CSSProperties = { cursor: 'pointer', color: 'var(--sub2)', fontSize: 13, padding: 2 };
const select: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer' };
