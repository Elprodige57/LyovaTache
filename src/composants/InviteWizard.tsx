import { useState } from 'react';
import type { Member, Folder, Board, Team, AccessScope, AccessRole } from '../modele/types';
import { setMemberAccess, createInvitation, createNotification } from '../modele/donnees';
import { ROLE_LABELS, SCOPE_LABELS } from '../outils/access';

interface InviteWizardProps {
  workspaceId: string;
  members: Member[];
  folders: (Folder & { boards?: Board[] })[];
  teams: Team[];
  currentMemberId: string;
  onClose: () => void;
  onDone: () => void;
}

const ACCENT = '#5b50e8';
const GREEN = '#3B6D11';

const ROLE_DESC: Record<AccessRole, string> = {
  member: 'Peut voir, créer et modifier les tâches dans son périmètre',
  editor: 'Peut aussi gérer les colonnes et inviter d\'autres membres',
  viewer: 'Lecture seule — ne peut pas créer ni modifier de tâches',
};

const SCOPE_DESC: Record<AccessScope, string> = {
  full: 'Accès à tous les dossiers et tous les tableaux. Idéal pour les membres permanents.',
  folders: 'Accès uniquement aux dossiers sélectionnés et tous leurs tableaux.',
  boards: 'Accès ciblé à un ou plusieurs tableaux précis. Parfait pour les prestataires.',
};

export function InviteWizard({ workspaceId, members, folders, teams, currentMemberId, onClose, onDone }: InviteWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [type, setType] = useState<'person' | 'group'>('person');
  const [persons, setPersons] = useState<Member[]>([]);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [search, setSearch] = useState('');
  const [selTeams, setSelTeams] = useState<Team[]>([]);
  const [scope, setScope] = useState<AccessScope>('full');
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [role, setRole] = useState<AccessRole>('member');
  const [message, setMessage] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const allBoards = folders.flatMap((f) => (f.boards || []).map((b) => ({ ...b, folderName: f.name })));
  const filteredMembers = members.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.email || '').toLowerCase().includes(search.toLowerCase()));

  const targets = [...persons.map((p) => p.name), ...selTeams.map((t) => t.name), ...emails];
  const whoLabel = targets.join(', ') || '—';
  const step1Valid = persons.length > 0 || selTeams.length > 0 || emails.length > 0;

  const togglePerson = (m: Member) => setPersons((p) => p.find((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]);
  const toggleTeam = (t: Team) => setSelTeams((s) => s.find((x) => x.id === t.id) ? s.filter((x) => x.id !== t.id) : [...s, t]);
  const addEmail = () => {
    const v = emailInput.trim();
    if (!v || !v.includes('@') || emails.includes(v)) return;
    setEmails((e) => [...e, v]); setEmailInput('');
  };
  const toggleFolder = (id: string) => setFolderIds((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  const toggleBoard = (id: string) => setBoardIds((b) => b.includes(id) ? b.filter((x) => x !== id) : [...b, id]);

  async function confirm() {
    setSaving(true);
    // Membres cibles : personnes sélectionnées + tous les membres des équipes choisies
    const targetMembers = new Map<string, Member>();
    persons.forEach((p) => targetMembers.set(p.id, p));
    selTeams.forEach((t) => (t.members || []).forEach((m) => targetMembers.set(m.id, m)));

    for (const m of targetMembers.values()) {
      await setMemberAccess(workspaceId, m.id, { scope, role, folderIds, boardIds });
    }
    for (const email of emails) {
      await createInvitation(workspaceId, { email, role, scope, folderIds, boardIds, message, invitedBy: currentMemberId });
    }
    if (notify) {
      const inviter = members.find((m) => m.id === currentMemberId)?.name ?? 'Quelqu\'un';
      const msg = `${inviter} t'a invité — ${SCOPE_LABELS[scope]} · rôle ${ROLE_LABELS[role]}`;
      for (const m of targetMembers.values()) {
        if (m.id === currentMemberId) continue; // ne pas se notifier soi-même
        await createNotification(workspaceId, msg, '✉️', m.id);
      }
    }
    setSaving(false);
    setStep(5);
    onDone();
  }

  const steps = ['Qui inviter', 'Périmètre', 'Rôle & détails', 'Confirmation'];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 560, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--panel)', zIndex: 61, borderRadius: 16, boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--line)', padding: 22,
      }}>
        {/* Barre d'étapes */}
        {step < 5 && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
            {steps.map((s, i) => {
              const n = (i + 1) as 1 | 2 | 3 | 4;
              const done = step > n; const active = step === n;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11.5, fontWeight: 700,
                      background: done ? GREEN : active ? ACCENT : 'transparent',
                      color: done || active ? '#fff' : 'var(--sub2)',
                      border: done || active ? 'none' : '1.5px solid var(--line)',
                    }}>{done ? '✓' : n}</div>
                    <span style={{ fontSize: 11.5, fontWeight: active ? 700 : 500, color: active ? 'var(--ink)' : 'var(--sub2)', whiteSpace: 'nowrap' }}>{s}</span>
                  </div>
                  {i < 3 && <div style={{ flex: 1, height: 1, background: 'var(--line)', margin: '0 8px' }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* ÉTAPE 1 — QUI */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Qui voulez-vous inviter ?</h3>
            <p style={{ fontSize: 12.5, color: 'var(--sub2)', marginBottom: 16 }}>Une personne existante, une équipe, ou un nouvel email.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['person', 'group'] as const).map((t) => (
                <div key={t} onClick={() => setType(t)} style={{
                  border: `1.5px solid ${type === t ? ACCENT : 'var(--line)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                  background: type === t ? 'rgba(91,80,232,.07)' : 'var(--panel2)',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{t === 'person' ? '👤' : '👥'}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t === 'person' ? 'Une personne' : 'Une équipe'}</div>
                  <div style={{ fontSize: 11, color: 'var(--sub2)', marginTop: 2 }}>{t === 'person' ? 'Membre individuel' : 'Tous les membres d\'une équipe'}</div>
                </div>
              ))}
            </div>

            {type === 'person' ? (
              <>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou email…" style={inputStyle} />
                <div style={listStyle}>
                  {filteredMembers.map((m) => {
                    const sel = !!persons.find((x) => x.id === m.id);
                    return (
                      <div key={m.id} onClick={() => togglePerson(m)} style={{ ...rowStyle, background: sel ? 'rgba(91,80,232,.07)' : 'transparent' }}>
                        <span style={{ ...avatarStyle, background: m.color }}>{m.initials}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--ink)' }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--sub2)' }}>{m.email || '—'} · {m.role}</div>
                        </div>
                        {sel && <span style={{ color: GREEN, fontWeight: 700 }}>✓</span>}
                      </div>
                    );
                  })}
                  {filteredMembers.length === 0 && <div style={{ padding: 12, fontSize: 12, color: 'var(--sub2)' }}>Aucun membre trouvé.</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addEmail()} placeholder="ou inviter par email : nouveau@email.com" style={{ ...inputStyle, marginBottom: 0 }} />
                  <button onClick={addEmail} style={ghostBtn}>Ajouter</button>
                </div>
              </>
            ) : (
              <div style={listStyle}>
                {teams.map((t) => {
                  const sel = !!selTeams.find((x) => x.id === t.id);
                  return (
                    <div key={t.id} onClick={() => toggleTeam(t)} style={{ ...rowStyle, background: sel ? 'rgba(91,80,232,.07)' : 'transparent' }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: t.color + '22', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{t.name[0]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)' }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--sub2)' }}>{(t.members || []).length} membre(s){t.service ? ' · ' + t.service : ''}</div>
                      </div>
                      {sel && <span style={{ color: GREEN, fontWeight: 700 }}>✓</span>}
                    </div>
                  );
                })}
                {teams.length === 0 && <div style={{ padding: 12, fontSize: 12, color: 'var(--sub2)' }}>Aucune équipe. Crée-en dans Admin → Équipes.</div>}
              </div>
            )}

            {targets.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
                {persons.map((p) => <Pill key={p.id} label={p.name} onX={() => togglePerson(p)} />)}
                {selTeams.map((t) => <Pill key={t.id} label={t.name} onX={() => toggleTeam(t)} />)}
                {emails.map((e) => <Pill key={e} label={e} onX={() => setEmails((x) => x.filter((y) => y !== e))} />)}
              </div>
            )}

            <Nav onClose={onClose} next={() => setStep(2)} nextDisabled={!step1Valid} />
          </div>
        )}

        {/* ÉTAPE 2 — PÉRIMÈTRE */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Quel niveau d'accès ?</h3>
            <p style={{ fontSize: 12.5, color: 'var(--sub2)', marginBottom: 16 }}>Ce à quoi <strong style={{ color: 'var(--ink)' }}>{whoLabel}</strong> aura accès.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {(['full', 'folders', 'boards'] as const).map((s) => (
                <div key={s} onClick={() => setScope(s)} style={{ ...scopeCard, border: `1.5px solid ${scope === s ? ACCENT : 'var(--line)'}`, background: scope === s ? 'rgba(91,80,232,.06)' : 'transparent' }}>
                  <span style={{ ...radio, borderColor: scope === s ? ACCENT : 'var(--line)', background: scope === s ? ACCENT : 'transparent' }}>{scope === s && <span style={radioDot} />}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{SCOPE_LABELS[s]}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--sub2)', marginTop: 2 }}>{SCOPE_DESC[s]}</div>
                  </div>
                </div>
              ))}
            </div>

            {scope === 'folders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {folders.map((f) => (
                  <label key={f.id} style={pickRow}>
                    <input type="checkbox" checked={folderIds.includes(f.id)} onChange={() => toggleFolder(f.id)} style={{ accentColor: ACCENT }} />
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{f.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--sub2)' }}>{(f.boards || []).length} tableau(x)</span>
                  </label>
                ))}
              </div>
            )}
            {scope === 'boards' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {allBoards.map((b) => (
                  <div key={b.id} onClick={() => toggleBoard(b.id)} style={{ ...pickRow, border: `1px solid ${boardIds.includes(b.id) ? ACCENT : 'var(--line)'}`, borderRadius: 8, background: boardIds.includes(b.id) ? 'rgba(91,80,232,.06)' : 'transparent', cursor: 'pointer' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--sub2)' }}>{b.folderName}</div>
                    </div>
                    {boardIds.includes(b.id) && <span style={{ color: ACCENT, fontWeight: 700 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}

            <Nav onClose={onClose} back={() => setStep(1)} next={() => setStep(3)} />
          </div>
        )}

        {/* ÉTAPE 3 — RÔLE */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Rôle et permissions</h3>
            <p style={{ fontSize: 12.5, color: 'var(--sub2)', marginBottom: 16 }}>Ce que <strong style={{ color: 'var(--ink)' }}>{whoLabel}</strong> peut faire.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(['member', 'editor', 'viewer'] as const).map((r) => (
                <div key={r} onClick={() => setRole(r)} style={{ ...scopeCard, border: `1.5px solid ${role === r ? ACCENT : 'var(--line)'}`, background: role === r ? 'rgba(91,80,232,.06)' : 'transparent' }}>
                  <span style={{ ...radio, borderColor: role === r ? ACCENT : 'var(--line)', background: role === r ? ACCENT : 'transparent' }}>{role === r && <span style={radioDot} />}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{ROLE_LABELS[r]}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--sub2)', marginTop: 2 }}>{ROLE_DESC[r]}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Message d'invitation (optionnel)</div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Bonjour, je t'ajoute à l'espace…" style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ accentColor: ACCENT }} />
              <span style={{ fontSize: 13, color: 'var(--sub)' }}>Notifier la personne / l'équipe sur son espace</span>
            </label>

            <Nav onClose={onClose} back={() => setStep(2)} next={() => setStep(4)} />
          </div>
        )}

        {/* ÉTAPE 4 — RÉCAP */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Récapitulatif</h3>
            <p style={{ fontSize: 12.5, color: 'var(--sub2)', marginBottom: 16 }}>Vérifie avant de valider.</p>

            <div style={{ background: 'var(--panel2)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SummaryLine icon="👥" label="Invité(s)" value={whoLabel} />
              <SummaryLine icon="🏛" label="Périmètre" value={
                scope === 'full' ? "Tout l'espace" :
                scope === 'folders' ? 'Dossiers : ' + (folders.filter((f) => folderIds.includes(f.id)).map((f) => f.name).join(', ') || '—') :
                'Tableaux : ' + (allBoards.filter((b) => boardIds.includes(b.id)).map((b) => b.name).join(', ') || '—')
              } />
              <SummaryLine icon="🛡" label="Rôle" value={ROLE_LABELS[role]} />
              <SummaryLine icon="🔔" label="Notification" value={notify ? 'Oui — notification in-app' : 'Non'} />
              {emails.length > 0 && <SummaryLine icon="✉️" label="Invitations email" value={emails.join(', ') + ' (en attente)'} />}
            </div>

            <Nav onClose={onClose} back={() => setStep(3)} confirm={confirm} saving={saving} />
          </div>
        )}

        {/* SUCCÈS */}
        {step === 5 && (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{ fontSize: 40, color: GREEN, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {selTeams.length ? 'Équipe(s) ajoutée(s) à l\'espace' : 'Accès accordé'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--sub2)', marginBottom: 18 }}>
              {whoLabel} a accès à {scope === 'full' ? "tout l'espace" : scope === 'folders' ? 'certains dossiers' : 'certains tableaux'} en tant que {ROLE_LABELS[role]}.
              {emails.length > 0 && ` ${emails.length} invitation(s) email enregistrée(s).`}
            </div>
            <button onClick={onClose} style={{ ...primaryBtn, margin: '0 auto' }}>Terminé</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── sous-composants & styles ──
function Pill({ label, onX }: { label: string; onX: () => void }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(91,80,232,.1)', color: ACCENT, fontSize: 11.5, padding: '3px 10px', borderRadius: 20 }}>
      {label}<span onClick={onX} style={{ cursor: 'pointer', opacity: .7, fontWeight: 700 }}>×</span>
    </span>
  );
}

function SummaryLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: 'var(--sub2)' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{value}</div>
      </div>
    </div>
  );
}

function Nav({ onClose, back, next, confirm, nextDisabled, saving }: {
  onClose: () => void; back?: () => void; next?: () => void; confirm?: () => void; nextDisabled?: boolean; saving?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
      {back ? <button onClick={back} style={ghostBtn}>← Retour</button> : <button onClick={onClose} style={ghostBtn}>Annuler</button>}
      {confirm
        ? <button onClick={confirm} disabled={saving} style={{ ...primaryBtn, background: GREEN, opacity: saving ? .6 : 1 }}>{saving ? 'Enregistrement…' : '✓ Confirmer'}</button>
        : <button onClick={next} disabled={nextDisabled} style={{ ...primaryBtn, opacity: nextDisabled ? .4 : 1, cursor: nextDisabled ? 'not-allowed' : 'pointer' }}>Suivant →</button>}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--ink)', marginBottom: 8, outline: 'none', fontFamily: 'inherit' };
const listStyle: React.CSSProperties = { border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--line)' };
const avatarStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 };
const scopeCard: React.CSSProperties = { borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' };
const radio: React.CSSProperties = { width: 16, height: 16, borderRadius: '50%', border: '1.5px solid', marginTop: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const radioDot: React.CSSProperties = { width: 6, height: 6, borderRadius: '50%', background: '#fff' };
const pickRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--sub)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };
const primaryBtn: React.CSSProperties = { fontSize: 13, padding: '8px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', display: 'block' };
