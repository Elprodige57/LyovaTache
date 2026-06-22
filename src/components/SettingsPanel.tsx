import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { updateWorkspace } from '../hooks/useData';
import { exportBoard, importBoard, downloadJson } from '../lib/boardIO';
import type { Board, Member, Workspace, Label } from '../types';

interface SettingsPanelProps {
  boards?: Board[];
  members?: Member[];
  labels?: Label[];
  currentMember?: Member | null;
  currentMemberId?: string;
  workspace?: Workspace | null;
  isGuest?: boolean;
}

export function SettingsPanel({ boards = [], members = [], labels = [], currentMember = null, currentMemberId, workspace = null, isGuest = false }: SettingsPanelProps) {
  const app = useApp();
  const [tab, setTab] = useState<'general' | 'notifications' | 'account'>('general');
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? 'Lyova Tech');
  const [planValue, setPlanValue] = useState(workspace?.plan ?? 'Plan Équipe');
  const [emailNotif, setEmailNotif] = useState(true);
  const [slackNotif, setSlackNotif] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ioMsg, setIoMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#5b50e8');

  // Charge le nom d'espace et les préférences de notif existants
  useEffect(() => { if (workspace?.name) setWorkspaceName(workspace.name); }, [workspace?.name]);
  useEffect(() => { if (workspace?.plan) setPlanValue(workspace.plan); }, [workspace?.plan]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lyova_notif_prefs');
      if (raw) { const p = JSON.parse(raw); setEmailNotif(!!p.email); setSlackNotif(!!p.slack); setDailyDigest(!!p.daily); }
    } catch { /* ignore */ }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (workspace?.id) await updateWorkspace(workspace.id, { name: workspaceName.trim(), plan: planValue });
    try { localStorage.setItem('lyova_notif_prefs', JSON.stringify({ email: emailNotif, slack: slackNotif, daily: dailyDigest })); } catch { /* ignore */ }
    app.refreshAll();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const handleExport = async () => {
    const bid = app.activeBoardId;
    if (!bid) { setIoMsg('Ouvre d’abord un Bureau pour l’exporter.'); return; }
    setIoMsg('Export en cours…');
    try {
      const data = await exportBoard(bid);
      downloadJson(`${data.board.name.replace(/[^\w-]+/g, '_')}.json`, data);
      setIoMsg('Bureau exporté ✓');
    } catch (e) {
      setIoMsg('Échec de l’export : ' + (e as Error).message);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIoMsg('Import en cours…');
    try {
      const json = JSON.parse(await file.text());
      const ws = workspace?.id ?? '00000000-0000-0000-0000-000000000001';
      const newId = await importBoard(ws, json);
      app.refreshAll();
      setIoMsg('Bureau importé ✓');
      if (newId) { app.openBoard(newId); app.toggleSettings(); }
    } catch (err) {
      setIoMsg('Échec de l’import : ' + (err as Error).message);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'Général', icon: 'M12 20h9M12 4h9M2 12h9M2 20h9M2 4h9' },
    { id: 'notifications' as const, label: 'Notifications', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.7 21a2 2 0 0 1-3.4 0' },
    { id: 'account' as const, label: 'Compte', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  ];

  return (
    <>
      <div onClick={app.toggleSettings} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 50, animation: 'lyFade .15s ease' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '94vw',
        background: 'var(--panel)', zIndex: 51, boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column',
        animation: 'lySlide .22s cubic-bezier(.2,.8,.2,1)',
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>Paramètres</div>
            <div style={{ fontSize: 11.5, color: 'var(--sub2)' }}>Personnalisez votre espace</div>
          </div>
          <div onClick={app.toggleSettings} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sub)', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <div key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', fontSize: 13, fontWeight: active ? 700 : 600, color: active ? 'var(--accent-ink)' : 'var(--sub2)', borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .1s' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {t.icon.split('|').map((d, i) => <path key={i} d={d} />)}
                </svg>
                {t.label}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {tab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Espace de travail</div>
                <input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 9, padding: '9px 12px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Plan d'équipe</div>
                <select value={planValue} onChange={e => setPlanValue(e.target.value)} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 9, padding: '9px 12px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", cursor: 'pointer' }}>
                  <option value="Gratuit">Gratuit</option>
                  <option value="Plan Équipe">Équipe</option>
                  <option value="Pro">Pro</option>
                  <option value="Entreprise">Entreprise</option>
                </select>
                <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 6 }}>Affiché dans la barre latérale. Clique « Enregistrer » pour appliquer.</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Bureau préféré</div>
                <div style={{ fontSize: 12, color: 'var(--sub2)', marginBottom: 8 }}>À l'ouverture de l'application, vous arrivez directement sur ce Bureau.</div>
                <select
                  value={currentMember?.preferred_board_id ?? ''}
                  onChange={e => { if (currentMemberId) app.setPreferredBoard(currentMemberId, e.target.value || null); }}
                  style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 9, padding: '9px 12px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", cursor: 'pointer' }}
                >
                  <option value="">Aucun (tableau de bord)</option>
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Données</div>
                <div style={{ fontSize: 12, color: 'var(--sub2)', marginBottom: 8 }}>Exporter le Bureau ouvert en JSON, ou importer un Bureau depuis un fichier.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleExport} style={{ flex: 1, background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 9, padding: '9px 12px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    Exporter
                  </button>
                  <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 9, padding: '9px 12px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 9l5-5 5 5M12 4v12" /></svg>
                    Importer
                  </button>
                  <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: 'none' }} />
                </div>
                {ioMsg && <div style={{ fontSize: 12, color: 'var(--accent-ink)', marginTop: 8, fontWeight: 600 }}>{ioMsg}</div>}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Étiquettes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {labels.length === 0 && <div style={{ fontSize: 12, color: 'var(--sub2)' }}>Aucune étiquette pour l'instant.</div>}
                  {labels.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 9px', border: '1px solid var(--line)', borderRadius: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
                      <button onClick={() => { const n = prompt('Nom de l’étiquette', l.name); if (n === null) return; const c = prompt('Couleur (hex, ex #5b50e8)', l.color) ?? l.color; app.updateLabel(l.id, { name: n.trim() || l.name, color: c.trim() || l.color }); }} title="Modifier" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 3, borderRadius: 5 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-ink)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                      </button>
                      <button onClick={() => { if (confirm(`Supprimer l'étiquette « ${l.name} » ?`)) app.deleteLabel(l.id); }} title="Supprimer" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 3, borderRadius: 5 }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newLabelName} onChange={e => setNewLabelName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newLabelName.trim() && workspace?.id) { app.createLabel(workspace.id, newLabelName.trim(), newLabelColor); setNewLabelName(''); } }} placeholder="Nouvelle étiquette" style={{ flex: 1, border: '1px solid var(--line2)', borderRadius: 9, padding: '8px 11px', fontSize: 13, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }} />
                  <input type="color" value={newLabelColor} onChange={e => setNewLabelColor(e.target.value)} title="Couleur" style={{ width: 38, height: 36, border: '1px solid var(--line2)', borderRadius: 9, background: 'var(--soft)', cursor: 'pointer', padding: 2 }} />
                  <button onClick={() => { if (newLabelName.trim() && workspace?.id) { app.createLabel(workspace.id, newLabelName.trim(), newLabelColor); setNewLabelName(''); } }} disabled={!newLabelName.trim()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: newLabelName.trim() ? 1 : 0.5 }}>Ajouter</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Apparence</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div onClick={app.toggleTheme} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${app.theme === 'light' ? 'var(--accent)' : 'var(--line2)'}`, background: app.theme === 'light' ? 'var(--accent-soft)' : 'var(--panel)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Clair</span>
                  </div>
                  <div onClick={app.toggleTheme} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${app.theme === 'dark' ? 'var(--accent)' : 'var(--line2)'}`, background: app.theme === 'dark' ? 'var(--accent-soft)' : 'var(--panel)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Sombre</span>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Densité</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div onClick={app.toggleDensity} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${app.density === 'comfortable' ? 'var(--accent)' : 'var(--line2)'}`, background: app.density === 'comfortable' ? 'var(--accent-soft)' : 'var(--panel)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>☁️</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Confortable</span>
                  </div>
                  <div onClick={app.toggleDensity} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${app.density === 'compact' ? 'var(--accent)' : 'var(--line2)'}`, background: app.density === 'compact' ? 'var(--accent-soft)' : 'var(--panel)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>📦</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Compact</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Toggle label="Notifications par email" desc="Recevoir un email pour chaque événement important" value={emailNotif} onChange={setEmailNotif} />
              <Toggle label="Notifications Slack" desc="Envoyer les alertes vers un canal Slack" value={slackNotif} onChange={setSlackNotif} />
              <Toggle label="Résumé quotidien" desc="Un email récapitulatif chaque matin à 8h" value={dailyDigest} onChange={setDailyDigest} />
            </div>
          )}
          {tab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Profil</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--panel)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: currentMember?.color ?? 'var(--accent)', color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{currentMember?.initials ?? '?'}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{currentMember?.name ?? 'Utilisateur'}</div>
                    <div style={{ fontSize: 12, color: 'var(--sub2)' }}>{currentMember?.role ?? 'Membre'}{currentMember?.email ? ` · ${currentMember.email}` : ''}</div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Plan</div>
                <div style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--accent-soft)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-ink)' }}>{workspace?.plan ?? 'Plan Équipe'}</div>
                  <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 2 }}>5 membres · Automations · Documents</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)', marginBottom: 8 }}>Membres de l'espace</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.color, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{m.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--sub2)' }}>{m.role}{m.id === currentMemberId ? ' · vous' : ''}</div>
                      </div>
                      <button onClick={() => { const n = prompt('Nom du membre', m.name); if (n === null) return; const r = prompt('Rôle (ex: Propriétaire, Membre)', m.role) ?? m.role; app.updateMember(m.id, { name: n.trim() || m.name, role: r.trim() || m.role }); }} title="Modifier le membre" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 4, borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-ink)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                      </button>
                      {m.id !== currentMemberId && (
                        <button onClick={() => { if (confirm(`Retirer ${m.name} de l'espace ? Action irréversible.`)) app.deleteMember(m.id); }} title="Retirer le membre" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sub2)', display: 'flex', padding: 4, borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--sub2)')}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => { if (isGuest) { localStorage.setItem('lyova_mode', 'login'); window.location.reload(); } else { supabase.auth.signOut(); } }} style={{ background: 'transparent', color: isGuest ? 'var(--accent-ink)' : '#ef4444', border: `1px solid ${isGuest ? 'var(--line2)' : 'rgba(239,68,68,0.35)'}`, borderRadius: 10, padding: '10px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                {isGuest ? 'Se connecter (quitter le mode démo)' : 'Se déconnecter'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '14px 20px', flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={app.toggleSettings} style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 9, padding: '8px 16px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ background: saved ? '#10b981' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'background .2s' }}>{saving ? '…' : saved ? 'Enregistré ✓' : 'Enregistrer'}</button>
        </div>
      </div>
    </>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--panel)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--sub2)', marginTop: 2 }}>{desc}</div>
      </div>
      <div onClick={() => onChange(!value)} style={{ width: 42, height: 24, borderRadius: 13, background: value ? 'var(--accent)' : 'var(--line2)', position: 'relative', cursor: 'pointer', transition: 'background .15s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2.5, left: value ? 20 : 2.5, width: 19, height: 19, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .15s' }} />
      </div>
    </div>
  );
}
