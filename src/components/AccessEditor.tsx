import { useState } from 'react';
import type { Member, Folder, Board, MemberAccess, AccessScope } from '../types';
import { setMemberAccess } from '../hooks/useData';
import { SCOPE_LABELS } from '../lib/access';

interface AccessEditorProps {
  workspaceId: string;
  member: Member;
  access: MemberAccess | undefined;
  folders: (Folder & { boards?: Board[] })[];
  onClose: () => void;
  onSaved: () => void;
}

const ACCENT = '#5b50e8';

const SCOPE_DESC: Record<AccessScope, string> = {
  full: 'Accès à tous les dossiers et tableaux de l\'espace.',
  folders: 'Accès aux dossiers cochés (et tous leurs tableaux).',
  boards: 'Accès uniquement aux tableaux cochés.',
};

// Icône dossier (pour distinguer dossier vs tableau)
function FolderIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h6l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function AccessEditor({ workspaceId, member, access, folders, onClose, onSaved }: AccessEditorProps) {
  const [scope, setScope] = useState<AccessScope>(access?.scope ?? 'full');
  const [folderIds, setFolderIds] = useState<string[]>(access?.folderIds ?? []);
  const [boardIds, setBoardIds] = useState<string[]>(access?.boardIds ?? []);
  const [saving, setSaving] = useState(false);

  const allBoards = folders.flatMap((f) => (f.boards || []).map((b) => ({ ...b, folderName: f.name })));
  const toggleFolder = (id: string) => setFolderIds((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  const toggleBoard = (id: string) => setBoardIds((b) => b.includes(id) ? b.filter((x) => x !== id) : [...b, id]);

  const invalid = (scope === 'folders' && folderIds.length === 0) || (scope === 'boards' && boardIds.length === 0);

  async function save() {
    setSaving(true);
    await setMemberAccess(workspaceId, member.id, { scope, role: access?.role ?? 'member', folderIds, boardIds });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 520, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto',
        background: 'var(--panel)', zIndex: 61, borderRadius: 16, boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--line)', padding: 22,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: member.color, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{member.initials}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Périmètre de {member.name}</div>
            <div style={{ fontSize: 12, color: 'var(--sub2)' }}>Choisis ce à quoi cette personne a accès.</div>
          </div>
        </div>

        {/* Choix du périmètre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {(['full', 'folders', 'boards'] as const).map((s) => (
            <div key={s} onClick={() => setScope(s)} style={{
              borderRadius: 10, padding: '11px 14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
              border: `1.5px solid ${scope === s ? ACCENT : 'var(--line)'}`, background: scope === s ? 'rgba(91,80,232,.06)' : 'transparent',
            }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${scope === s ? ACCENT : 'var(--line)'}`, background: scope === s ? ACCENT : 'transparent', marginTop: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {scope === s && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{SCOPE_LABELS[s]}</div>
                <div style={{ fontSize: 11.5, color: 'var(--sub2)', marginTop: 2 }}>{SCOPE_DESC[s]}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sélection dossiers (icône dossier) */}
        {scope === 'folders' && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
            {folders.map((f) => {
              const on = folderIds.includes(f.id);
              return (
                <div key={f.id} onClick={() => toggleFolder(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--line)', background: on ? 'rgba(91,80,232,.06)' : 'transparent' }}>
                  <Check on={on} />
                  <FolderIcon color={ACCENT} />
                  <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--sub2)' }}>{(f.boards || []).length} tableau(x)</span>
                </div>
              );
            })}
            {folders.length === 0 && <div style={{ padding: 12, fontSize: 12, color: 'var(--sub2)' }}>Aucun dossier.</div>}
          </div>
        )}

        {/* Sélection tableaux (pastille couleur) */}
        {scope === 'boards' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {allBoards.map((b) => {
              const on = boardIds.includes(b.id);
              return (
                <div key={b.id} onClick={() => toggleBoard(b.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', cursor: 'pointer', borderRadius: 8, border: `1px solid ${on ? ACCENT : 'var(--line)'}`, background: on ? 'rgba(91,80,232,.06)' : 'transparent' }}>
                  <Check on={on} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--sub2)' }}>{b.folderName}</div>
                  </div>
                </div>
              );
            })}
            {allBoards.length === 0 && <div style={{ gridColumn: '1/-1', padding: 12, fontSize: 12, color: 'var(--sub2)' }}>Aucun tableau.</div>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
          <button onClick={onClose} style={ghostBtn}>Annuler</button>
          <button onClick={save} disabled={saving || invalid} style={{ ...primaryBtn, opacity: saving || invalid ? .5 : 1, cursor: saving || invalid ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer le périmètre'}
          </button>
        </div>
      </div>
    </>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${on ? ACCENT : 'var(--line)'}`, background: on ? ACCENT : 'transparent', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {on && '✓'}
    </span>
  );
}

const ghostBtn: React.CSSProperties = { fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--sub)', cursor: 'pointer', fontFamily: 'inherit' };
const primaryBtn: React.CSSProperties = { fontSize: 13, padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontFamily: 'inherit' };
