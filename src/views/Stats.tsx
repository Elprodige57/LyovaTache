import { useState } from 'react';
import type { Folder, Member } from '../types';
import { useApp } from '../context/AppContext';
import { useStatsData, type StatTask } from '../hooks/useData';
import { columnStatus, loadColCats, type Status } from '../lib/status';

interface StatsProps {
  folders: Folder[];
  members: Member[];
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const C = { done: '#10b981', progress: '#f59e0b', todo: '#94a3b8' } as const;

function sameMonth(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function Card({ title, sub, children, span }: { title: string; sub?: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14,
      padding: 16, boxShadow: 'var(--shadow)', gridColumn: span ? '1 / -1' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
        {sub && <span style={{ fontSize: 11.5, color: 'var(--sub2)', fontWeight: 600 }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function Kpi({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, color: color || 'var(--sub2)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--sub2)', marginTop: 5, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function Pill({ kind, children }: { kind: 'done' | 'prog' | 'todo'; children: React.ReactNode }) {
  const map = { done: C.done, prog: C.progress, todo: C.todo };
  const c = map[kind];
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, color: c, background: c + '1f' }}>{children}</span>;
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 72, height: 5, borderRadius: 3, background: 'var(--soft2)', overflow: 'hidden', display: 'inline-block' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </span>
      <span style={{ fontSize: 11, color: 'var(--sub2)', fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
    </span>
  );
}

export function Stats({ folders, members }: StatsProps) {
  const app = useApp();
  const [tab, setTab] = useState<'boards' | 'users' | 'monthly'>('boards');

  const allBoards = folders.flatMap(f => (f.boards || []).map(b => ({ ...b, folderName: f.name })));
  const boardIds = allBoards.map(b => b.id);
  const { columns, tasks } = useStatsData(boardIds, app.refreshCounter);

  const cats = loadColCats();
  const colById = new Map(columns.map(c => [c.id, c]));
  const statusOf = (t: StatTask): Status => {
    const c = colById.get(t.column_id);
    return c ? columnStatus(c, cats) : (t.is_done ? 'done' : 'todo');
  };

  const now = new Date();

  // ── Totaux globaux ──
  let gDone = 0, gProg = 0, gTodo = 0;
  tasks.forEach(t => { const s = statusOf(t); if (s === 'done') gDone++; else if (s === 'progress') gProg++; else gTodo++; });
  const gTotal = tasks.length;

  // ── Par tableau ──
  const perBoard = allBoards.map(b => {
    const bt = tasks.filter(t => t.board_id === b.id);
    let d = 0, p = 0, td = 0;
    bt.forEach(t => { const s = statusOf(t); if (s === 'done') d++; else if (s === 'progress') p++; else td++; });
    const total = bt.length;
    const pct = total ? Math.round((d / total) * 100) : 0;
    return { ...b, d, p, td, total, pct };
  }).sort((a, b) => b.total - a.total);

  // ── Par utilisateur ──
  const perUser = members.map(m => {
    const mt = tasks.filter(t => t.assigneeIds.includes(m.id));
    let d = 0, p = 0, td = 0;
    mt.forEach(t => { const s = statusOf(t); if (s === 'done') d++; else if (s === 'progress') p++; else td++; });
    const total = mt.length;
    const perf = total ? Math.round((d / total) * 100) : 0;
    return { ...m, d, p, td, total, perf };
  }).sort((a, b) => b.d - a.d);
  const activeMembers = perUser.filter(u => u.total > 0).length;
  const top = perUser[0];
  const maxUserDone = Math.max(1, ...perUser.map(u => u.d));

  // ── Hebdo : 8 dernières semaines (terminées par updated_at) ──
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - (7 * (7 - i)));
    const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    return { start, end };
  });
  const weekly = weeks.map((w, i) => ({
    label: 'S' + (i + 1),
    done: tasks.filter(t => statusOf(t) === 'done' && new Date(t.updated_at) >= w.start && new Date(t.updated_at) <= w.end).length,
  }));
  const maxWeekly = Math.max(1, ...weekly.map(w => w.done));

  // ── Mensuel : 6 derniers mois ──
  const monthsArr = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return d;
  });
  const monthly = monthsArr.map(mDate => {
    const created = tasks.filter(t => sameMonth(t.created_at, mDate)).length;
    const done = tasks.filter(t => statusOf(t) === 'done' && sameMonth(t.updated_at, mDate)).length;
    return { label: MONTHS[mDate.getMonth()], year: mDate.getFullYear(), created, done, date: mDate };
  });
  const maxMonthly = Math.max(1, ...monthly.flatMap(m => [m.created, m.done]));
  const daysElapsed = now.getDate();
  const doneThisMonth = tasks.filter(t => statusOf(t) === 'done' && sameMonth(t.updated_at, now)).length;
  const createdThisMonth = tasks.filter(t => sameMonth(t.created_at, now)).length;
  const velocity = (doneThisMonth / Math.max(1, daysElapsed)).toFixed(1);

  // ── Récap du mois par personne ──
  const monthlyPerUser = members.map(m => {
    const mt = tasks.filter(t => t.assigneeIds.includes(m.id));
    return {
      ...m,
      created: mt.filter(t => sameMonth(t.created_at, now)).length,
      done: mt.filter(t => statusOf(t) === 'done' && sameMonth(t.updated_at, now)).length,
      progress: mt.filter(t => statusOf(t) === 'progress').length,
    };
  }).filter(u => u.created || u.done || u.progress).sort((a, b) => b.done - a.done);

  // Donut (répartition globale)
  const dist: [string, string, number][] = [['Terminées', C.done, gDone], ['En cours', C.progress, gProg], ['À faire', C.todo, gTodo]];
  let acc = 0;
  const stops = dist.map(([, c, v]) => { const s = acc; const pct = gTotal ? (v / gTotal) * 100 : 0; acc += pct; return `${c} ${s}% ${acc}%`; }).join(', ');

  const thStyle: React.CSSProperties = { fontSize: 10.5, fontWeight: 600, color: 'var(--sub2)', textAlign: 'left', padding: '0 10px 8px 0', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { fontSize: 12.5, padding: '9px 10px 9px 0', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' };

  const empty = gTotal === 0;

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '22px 26px 40px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Statistiques</h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--sub2)', marginBottom: 18 }}>
        {gTotal} tâche{gTotal > 1 ? 's' : ''} sur {allBoards.length} tableau{allBoards.length > 1 ? 'x' : ''} · données réelles, pilotées par la catégorie de chaque colonne
      </p>

      {/* Sous-onglets */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 18 }}>
        {([['boards', 'Par tableau'], ['users', 'Par utilisateur'], ['monthly', 'Récap mensuel']] as const).map(([id, lbl]) => (
          <div key={id} onClick={() => setTab(id)} style={{
            fontSize: 12.5, fontWeight: 600, padding: '8px 16px', cursor: 'pointer',
            color: tab === id ? 'var(--accent)' : 'var(--sub2)',
            borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1,
          }}>{lbl}</div>
        ))}
      </div>

      {empty && (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--sub2)', fontSize: 13 }}>
          Aucune tâche pour l'instant. Crée des tâches et catégorise tes colonnes (À faire / En cours / Terminé) pour voir les statistiques.
        </div>
      )}

      {/* ═══ PAR TABLEAU ═══ */}
      {!empty && tab === 'boards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <Kpi label="✓ Terminées" value={String(gDone)} color={C.done} />
            <Kpi label="⟳ En cours" value={String(gProg)} color={C.progress} />
            <Kpi label="○ À faire" value={String(gTodo)} color={C.todo} />
            <Kpi label="∑ Total" value={String(gTotal)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 12 }}>
            <Card title="Tâches terminées / semaine" sub="8 dernières semaines">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, padding: '6px 2px' }}>
                {weekly.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%' }}>
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <div title={`${w.done} terminée(s)`} style={{ width: '100%', height: `${(w.done / maxWeekly) * 100}%`, minHeight: w.done ? 4 : 0, background: 'var(--accent)', borderRadius: '5px 5px 0 0', transition: 'height .3s' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--sub2)' }}>{w.label}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}>{w.done}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Répartition globale" sub={`${gTotal} tâches`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', flexShrink: 0, background: `conic-gradient(${stops})`, WebkitMask: 'radial-gradient(transparent 56%, #000 57%)', mask: 'radial-gradient(transparent 56%, #000 57%)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dist.map(([label, c, v]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />
                      <span style={{ color: 'var(--sub)' }}>{label}</span>
                      <span style={{ fontWeight: 700, color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                      <span style={{ color: 'var(--sub2)', fontSize: 11 }}>{gTotal ? Math.round((v / gTotal) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card title="Détail par tableau" sub={`${allBoards.length} tableau${allBoards.length > 1 ? 'x' : ''}`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thStyle}>Tableau</th><th style={thStyle}>Dossier</th>
                  <th style={thStyle}>✓ Term.</th><th style={thStyle}>⟳ En cours</th><th style={thStyle}>○ À faire</th>
                  <th style={thStyle}>Total</th><th style={thStyle}>Avancement</th><th style={thStyle}>Statut</th>
                </tr></thead>
                <tbody>
                  {perBoard.map(b => {
                    const st = b.pct >= 80 ? ['done', 'Quasi fini'] as const : b.pct >= 40 ? ['prog', 'En cours'] as const : ['todo', 'À démarrer'] as const;
                    return (
                      <tr key={b.id}>
                        <td style={tdStyle}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} /><strong style={{ color: 'var(--ink)' }}>{b.name}</strong></span></td>
                        <td style={{ ...tdStyle, color: 'var(--sub2)' }}>{b.folderName}</td>
                        <td style={{ ...tdStyle, color: C.done, fontWeight: 700 }}>{b.d}</td>
                        <td style={{ ...tdStyle, color: C.progress, fontWeight: 700 }}>{b.p}</td>
                        <td style={{ ...tdStyle, color: C.todo, fontWeight: 700 }}>{b.td}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--ink)' }}>{b.total}</td>
                        <td style={tdStyle}><MiniBar pct={b.pct} color={C.done} /></td>
                        <td style={tdStyle}><Pill kind={st[0]}>{st[1]}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ PAR UTILISATEUR ═══ */}
      {!empty && tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <Kpi label="👥 Membres actifs" value={String(activeMembers)} sub={`sur ${members.length}`} />
            <Kpi label="✓ Terminées" value={String(gDone)} color={C.done} />
            <Kpi label="⟳ En cours" value={String(gProg)} color={C.progress} />
            <Kpi label="⭐ Top contributeur" value={top?.d ? top.name : '—'} sub={top?.d ? `${top.d} terminées` : 'aucune'} />
          </div>

          <Card title="Tâches terminées par utilisateur">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {perUser.filter(u => u.total > 0).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: u.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{u.initials}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink)', width: 110, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                  <span style={{ flex: 1, height: 14, background: 'var(--soft2)', borderRadius: 4, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${(u.d / maxUserDone) * 100}%`, background: C.done, borderRadius: 4, minWidth: u.d ? 6 : 0 }} />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', width: 28, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{u.d}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Statistiques par utilisateur" sub="tous les tableaux">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thStyle}>Utilisateur</th><th style={thStyle}>Rôle</th>
                  <th style={thStyle}>✓ Term.</th><th style={thStyle}>⟳ En cours</th><th style={thStyle}>○ À faire</th>
                  <th style={thStyle}>Total</th><th style={thStyle}>Perf.</th>
                </tr></thead>
                <tbody>
                  {perUser.map(u => {
                    const pc = u.perf >= 70 ? 'done' : u.perf >= 40 ? 'prog' : 'todo';
                    return (
                      <tr key={u.id}>
                        <td style={tdStyle}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 24, height: 24, borderRadius: '50%', background: u.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{u.initials}</span><span style={{ color: 'var(--ink)' }}>{u.name}</span></span></td>
                        <td style={{ ...tdStyle, color: 'var(--sub2)' }}>{u.role}</td>
                        <td style={{ ...tdStyle, color: C.done, fontWeight: 700 }}>{u.d}</td>
                        <td style={{ ...tdStyle, color: C.progress, fontWeight: 700 }}>{u.p}</td>
                        <td style={{ ...tdStyle, color: C.todo, fontWeight: 700 }}>{u.td}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--ink)' }}>{u.total}</td>
                        <td style={tdStyle}><Pill kind={pc}>{u.perf}%</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ RÉCAP MENSUEL ═══ */}
      {!empty && tab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <Kpi label="📆 Mois courant" value={`${MONTHS[now.getMonth()]} ${now.getFullYear()}`} sub={`${daysElapsed} jours écoulés`} />
            <Kpi label="✓ Terminées ce mois" value={String(doneThisMonth)} color={C.done} />
            <Kpi label="✚ Créées ce mois" value={String(createdThisMonth)} color="var(--accent)" />
            <Kpi label="📈 Vélocité" value={`${velocity}/j`} sub="terminées par jour" />
          </div>

          <Card title="Récapitulatif par mois — 6 derniers mois" sub="créées vs terminées">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 150, paddingTop: 8 }}>
              {monthly.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%' }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                    <div title={`${m.created} créées`} style={{ width: '42%', height: `${(m.created / maxMonthly) * 100}%`, minHeight: m.created ? 4 : 0, background: 'var(--accent)', borderRadius: '4px 4px 0 0' }} />
                    <div title={`${m.done} terminées`} style={{ width: '42%', height: `${(m.done / maxMonthly) * 100}%`, minHeight: m.done ? 4 : 0, background: C.done, borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--sub2)' }}>{m.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--sub2)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--accent)' }} />Créées</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: C.done }} />Terminées</span>
            </div>
          </Card>

          <Card title="Récap du mois par personne" sub={`${MONTHS[now.getMonth()]} ${now.getFullYear()}`}>
            {monthlyPerUser.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--sub2)', padding: '8px 0' }}>Aucune activité assignée ce mois-ci.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={thStyle}>Personne</th><th style={thStyle}>✓ Terminées</th>
                    <th style={thStyle}>✚ Créées</th><th style={thStyle}>⟳ En cours</th>
                  </tr></thead>
                  <tbody>
                    {monthlyPerUser.map(u => (
                      <tr key={u.id}>
                        <td style={tdStyle}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 24, height: 24, borderRadius: '50%', background: u.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{u.initials}</span><span style={{ color: 'var(--ink)' }}>{u.name}</span></span></td>
                        <td style={{ ...tdStyle, color: C.done, fontWeight: 700 }}>{u.done}</td>
                        <td style={{ ...tdStyle, color: 'var(--accent)', fontWeight: 700 }}>{u.created}</td>
                        <td style={{ ...tdStyle, color: C.progress, fontWeight: 700 }}>{u.progress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
