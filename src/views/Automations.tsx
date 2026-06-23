import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { confirmDialog } from '../lib/dialog';
import type { Automation } from '../types';

interface AutomationsViewProps {
  automations: Automation[];
}

const HISTORY = [
  { time: '17/06 09:00', status: 'OK', rule: 'Standup quotidien', detail: '1 tâche créée', ok: true },
  { time: '17/06 08:00', status: 'OK', rule: 'Rappel d\'échéance', detail: '2 emails envoyés', ok: true },
  { time: '16/06 14:32', status: 'ERREUR', rule: 'Webhook CRM', detail: 'HTTP 503 — réessai', ok: false },
  { time: '16/06 09:00', status: 'OK', rule: 'Standup quotidien', detail: '1 tâche créée', ok: true },
  { time: '15/06 08:00', status: 'OK', rule: 'Revue de sprint', detail: '1 tâche créée', ok: true },
];

export function AutomationsView({ automations }: AutomationsViewProps) {
  const app = useApp();
  const [newTitle, setNewTitle] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newAction, setNewAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggleId, setToggleId] = useState<string | null>(null);

  const effective = automations.map(a => {
    const ov = app.automationOverrides[a.id];
    return { ...a, is_active: ov?.is_active !== undefined ? ov.is_active : a.is_active };
  });

  const handleCreate = async () => {
    if (!newTitle.trim() || !newTrigger.trim() || !newAction.trim() || saving) return;
    setSaving(true);
    await app.createAutomation('00000000-0000-0000-0000-000000000001', newTitle.trim(), newTrigger.trim(), newAction.trim());
    setNewTitle('');
    setNewTrigger('');
    setNewAction('');
    setSaving(false);
  };

  const handleToggle = async (a: Automation) => {
    if (toggleId) return;
    setToggleId(a.id);
    app.toggleAutomation(a.id);
    await app.updateAutomationActive(a.id, !a.is_active);
    setToggleId(null);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '22px 28px 40px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', background: 'var(--soft)', borderRadius: 9, padding: 3 }}>
            {(['rules', 'history'] as const).map(tab => {
              const active = app.autoTab === tab;
              return (
                <div
                  key={tab}
                  onClick={() => app.setAutoTab(tab)}
                  style={{
                    padding: '7px 15px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: active ? 'var(--ink)' : 'var(--sub2)',
                    background: active ? 'var(--panel)' : 'transparent',
                    boxShadow: active ? 'var(--shadow)' : 'none',
                    transition: 'all .1s',
                  }}
                >
                  {tab === 'rules' ? 'Règles' : 'Historique'}
                </div>
              );
            })}
          </div>
          <button
            onClick={app.toggleBuilder}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9,
              padding: '9px 15px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'filter .1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.93)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nouvelle règle
          </button>
        </div>

        {/* Create form */}
        {app.builderOpen && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--accent)',
            borderRadius: 16, padding: 22, marginBottom: 20,
            boxShadow: '0 10px 30px var(--accent-soft)',
            animation: 'lyPop .18s ease',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 16, color: 'var(--ink)' }}>
              Nouvelle règle d'automatisation
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 6 }}>Titre</div>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="ex: Standup quotidien"
                  style={{
                    width: '100%', border: '1px solid var(--line2)', outline: 'none',
                    borderRadius: 9, padding: '9px 12px',
                    fontSize: 13.5, fontWeight: 600, color: 'var(--ink)',
                    background: 'var(--soft)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 6 }}>Déclencheur (SI)</div>
                  <input
                    value={newTrigger}
                    onChange={e => setNewTrigger(e.target.value)}
                    placeholder="ex: Tâche en retard de 2 j"
                    style={{
                      width: '100%', border: '1px solid var(--line2)', outline: 'none',
                      borderRadius: 9, padding: '9px 12px',
                      fontSize: 13.5, fontWeight: 600, color: 'var(--ink)',
                      background: 'var(--soft)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 6 }}>Action (ALORS)</div>
                  <input
                    value={newAction}
                    onChange={e => setNewAction(e.target.value)}
                    placeholder="ex: Envoyer rappel par email"
                    style={{
                      width: '100%', border: '1px solid var(--line2)', outline: 'none',
                      borderRadius: 9, padding: '9px 12px',
                      fontSize: 13.5, fontWeight: 600, color: 'var(--ink)',
                      background: 'var(--soft)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                onClick={app.toggleBuilder}
                style={{
                  background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)',
                  borderRadius: 9, padding: '9px 16px',
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >Annuler</button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newTrigger.trim() || !newAction.trim() || saving}
                style={{
                  background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9,
                  padding: '9px 16px',
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', opacity: (!newTitle.trim() || !newTrigger.trim() || !newAction.trim() || saving) ? 0.5 : 1,
                }}
              >{saving ? '…' : 'Enregistrer la règle'}</button>
            </div>
          </div>
        )}

        {/* Rules list */}
        {app.autoTab === 'rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {effective.map(a => (
              <div key={a.id} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow)' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: a.is_active ? 'var(--accent-soft)' : 'var(--soft2)',
                  color: a.is_active ? 'var(--accent-ink)' : 'var(--sub2)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5, color: 'var(--ink)' }}>{a.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', background: 'rgba(14,165,233,0.12)', padding: '2px 8px', borderRadius: 6 }}>SI</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{a.trigger_desc}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 6 }}>ALORS</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{a.action_desc}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: 'var(--sub2)', background: 'var(--soft)', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap' }}>{a.runs_count} exéc.</span>
                {/* Toggle */}
                <div
                  onClick={() => handleToggle(a)}
                  style={{
                    width: 42, height: 24, borderRadius: 13,
                    background: a.is_active ? 'var(--accent)' : 'var(--line2)',
                    position: 'relative', cursor: toggleId ? 'not-allowed' : 'pointer',
                    transition: 'background .15s', flexShrink: 0,
                    opacity: toggleId ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2.5,
                    left: a.is_active ? 20 : 2.5,
                    width: 19, height: 19, borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    transition: 'left .15s',
                  }} />
                </div>
                <button onClick={async () => { if (await confirmDialog('Supprimer l’automatisation ?', { message: `« ${a.title} »`, danger: true })) app.deleteAutomation(a.id); }} title="Supprimer l'automatisation" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 4, borderRadius: 6, flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            ))}
            {effective.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--sub2)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                  <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
                </svg>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune règle pour l'instant</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Créez votre première automatisation</div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {app.autoTab === 'history' && (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)', fontFamily: "'JetBrains Mono', monospace" }}>
            {HISTORY.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < HISTORY.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.ok ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'var(--sub2)', width: 108, flexShrink: 0 }}>{h.time}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                  background: h.ok ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
                  color: h.ok ? '#10b981' : '#ef4444',
                  width: 64, textAlign: 'center', flexShrink: 0,
                }}>{h.status}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>{h.rule}</span>
                <span style={{ fontSize: 11, color: 'var(--sub2)' }}>{h.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
