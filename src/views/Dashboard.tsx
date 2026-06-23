import type { Board, Folder, Member, Task } from '../types';
import { useApp } from '../context/AppContext';

interface DashboardProps {
  folders: Folder[];
  members: Member[];
  allTasks: Task[];
}

const PRIO_COLORS = { urgent: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#94a3b8' };
const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

type Status = 'done' | 'progress' | 'todo';

// Classe une tâche par son état (drapeau is_done puis nom de colonne).
function classify(t: Task, colName?: string): Status {
  if (t.is_done) return 'done';
  const n = (colName || '').toLowerCase();
  if (/ferm|termin|done|fini|livr/.test(n)) return 'done';
  if (/cours|revue|progress|review|doing|test|valid/.test(n)) return 'progress';
  return 'todo';
}

function sameMonth(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function StatCard({ label, value, icon, iconBg, iconColor, sub, rise }: {
  label: string; value: string; icon: React.ReactNode;
  iconBg: string; iconColor: string; sub: string; rise: number;
}) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line)',
      borderRadius: 14, padding: '16px 17px', boxShadow: 'var(--shadow)',
      animation: `lyRise .3s ease ${rise * 0.08}s both`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sub2)' }}>{sub}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, color: 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--sub2)', fontWeight: 600, marginTop: 5 }}>{label}</div>
    </div>
  );
}

export function Dashboard({ folders, members, allTasks }: DashboardProps) {
  const app = useApp();
  const allBoards: (Board & { folderName: string })[] = folders.flatMap(f =>
    (f.boards || []).map(b => ({ ...b, folderName: f.name }))
  );

  // Carte column_id -> nom (pour classer chaque tâche).
  const colName = new Map<string, string>();
  allBoards.forEach(b => (b.columns || []).forEach(c => colName.set(c.id, c.name)));
  const statusOf = (t: Task): Status => classify(t, colName.get(t.column_id));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Stats globales réelles
  let done = 0, progress = 0, todo = 0;
  allTasks.forEach(t => { const s = statusOf(t); if (s === 'done') done++; else if (s === 'progress') progress++; else todo++; });
  const overdue = allTasks.filter(t => t.due_date && new Date(t.due_date) < now && statusOf(t) !== 'done').length;
  const createdThisWeek = allTasks.filter(t => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.created_at) >= weekAgo;
  }).length;
  const total = allTasks.length;

  // Productivité 7 derniers jours (créées vs terminées par jour)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const sameDay = (iso: string, d: Date) => { const x = new Date(iso); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate(); };
  const barData = days.map(d => ({
    label: WEEKDAYS[d.getDay()],
    created: allTasks.filter(t => sameDay(t.created_at, d)).length,
    done: allTasks.filter(t => t.is_done && sameDay(t.updated_at, d)).length,
  }));
  const maxBar = Math.max(1, ...barData.flatMap(b => [b.created, b.done]));

  // Répartition réelle par état
  const dist: [string, string, number][] = [
    ['Terminées', '#10b981', done],
    ['En cours', '#f59e0b', progress],
    ['À faire', '#94a3b8', todo],
  ];
  let acc = 0;
  const segs = dist.map(([, c, v]) => { const s = acc; const pct = total ? (v / total) * 100 : 0; acc += pct; return `${c} ${s}% ${acc}%`; });

  // Charge de l'équipe (tâches actives assignées)
  const workload = members.map(m => ({
    ...m,
    count: allTasks.filter(t => statusOf(t) !== 'done' && (t.assignees || []).some(a => a.id === m.id)).length,
  })).sort((a, b) => b.count - a.count).slice(0, 6);
  const maxLoad = Math.max(1, ...workload.map(w => w.count));

  // Récap mensuel par personne
  const recap = members.map(m => {
    const mine = allTasks.filter(t => (t.assignees || []).some(a => a.id === m.id));
    return {
      ...m,
      created: mine.filter(t => sameMonth(t.created_at, now)).length,
      done: mine.filter(t => t.is_done && sameMonth(t.updated_at, now)).length,
      active: mine.filter(t => statusOf(t) !== 'done').length,
    };
  }).sort((a, b) => b.done - a.done || b.active - a.active);

  // Échéances proches (réel)
  const upcomingTasks = allTasks
    .filter(t => t.due_date && statusOf(t) !== 'done')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  const monthLabel = (d: Date) => ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'jul', 'août', 'sep', 'oct', 'nov', 'déc'][d.getMonth()];

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 28px 40px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 18 }}>
          <StatCard label="Tâches terminées" value={String(done)} iconBg="rgba(16,185,129,0.12)" iconColor="#10b981" sub={total ? `${Math.round(done / total * 100)}% du total` : '—'} rise={0}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
          />
          <StatCard label="En cours" value={String(progress)} iconBg="rgba(245,158,11,0.12)" iconColor="#f59e0b" sub={`${todo} à faire`} rise={1}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
          />
          <StatCard label="En retard" value={String(overdue)} iconBg="rgba(239,68,68,0.12)" iconColor="#ef4444" sub={overdue ? 'à traiter' : 'tout est à jour'} rise={2}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>}
          />
          <StatCard label="Créées cette semaine" value={String(createdThisWeek)} iconBg="var(--accent-soft)" iconColor="var(--accent-ink)" sub="7 derniers jours" rise={3}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>}
          />
        </div>

        {/* Bureaux */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="2">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Vos Bureaux</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sub2)', background: 'var(--soft2)', borderRadius: 6, padding: '1px 8px' }}>{allBoards.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14, marginBottom: 22 }}>
          {allBoards.map(b => {
            const bt = allTasks.filter(t => t.board_id === b.id);
            const s = { done: 0, progress: 0, todo: 0 };
            bt.forEach(t => { s[statusOf(t)]++; });
            return <BoardCard key={b.id} board={b} members={members} stats={s} onClick={() => app.openBoard(b.id)} />;
          })}
          <div
            onClick={() => app.openCreateBoard()}
            style={{
              border: '1.5px dashed var(--line2)', borderRadius: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 7, minHeight: 140, color: 'var(--sub2)', cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--faint)'; e.currentTarget.style.color = 'var(--ink2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line2)'; e.currentTarget.style.color = 'var(--sub2)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Nouveau Bureau</span>
          </div>
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginBottom: 18 }}>
          {/* Bar chart */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Productivité hebdomadaire</div>
                <div style={{ fontSize: 12, color: 'var(--sub2)', fontWeight: 500, marginTop: 2 }}>Tâches créées vs terminées</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                {[['Terminées', 'var(--accent)'], ['Créées', 'var(--soft2)']].map(([label, color]) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--sub)' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />{label}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 160 }}>
              {barData.map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5 }}>
                    <div title={`${b.created} créées`} style={{ width: 13, background: 'var(--soft2)', borderRadius: '5px 5px 0 0', height: `${Math.round(b.created / maxBar * 100)}%`, transition: 'height .4s' }} />
                    <div title={`${b.done} terminées`} style={{ width: 13, background: 'linear-gradient(180deg, var(--accent), var(--accent)77)', borderRadius: '5px 5px 0 0', height: `${Math.round(b.done / maxBar * 100)}%`, transition: 'height .4s' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sub2)' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut — répartition réelle par état */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 16, color: 'var(--ink)' }}>Répartition par état</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{
                width: 118, height: 118, borderRadius: '50%', flexShrink: 0,
                background: total ? `conic-gradient(${segs.join(', ')})` : 'var(--soft2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'var(--panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, color: 'var(--ink)' }}>{total}</span>
                  <span style={{ fontSize: 10, color: 'var(--sub2)', fontWeight: 600 }}>tâches</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {dist.map(([name, color, v]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, color: 'var(--ink2)' }}>{name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sub)', fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 16 }}>
          {/* Workload */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 15, color: 'var(--ink)' }}>Charge de l'équipe</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {workload.length === 0 && <div style={{ fontSize: 12, color: 'var(--sub2)' }}>Aucun membre.</div>}
              {workload.map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: w.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{w.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink2)' }}>{w.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub2)', fontFamily: "'JetBrains Mono', monospace" }}>{w.count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--soft2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(w.count / maxLoad * 100)}%`, background: w.count >= maxLoad && maxLoad > 4 ? '#f59e0b' : 'var(--accent)', borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Récap mensuel par personne */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Récap du mois</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--sub2)', textTransform: 'capitalize' }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0 14px', alignItems: 'center' }}>
              <span />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textAlign: 'right' }}>TERMINÉES</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-ink)', textAlign: 'right' }}>CRÉÉES</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', textAlign: 'right' }}>EN COURS</span>
              {recap.length === 0 && <span style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--sub2)', marginTop: 8 }}>Aucun membre.</span>}
              {recap.map(r => (
                <div key={r.id} style={{ display: 'contents' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 11, minWidth: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: r.color, color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.initials}</div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink2)' }}>{r.name}</span>
                  </div>
                  <span style={{ marginTop: 11, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: r.done ? '#10b981' : 'var(--sub2)' }}>{r.done}</span>
                  <span style={{ marginTop: 11, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: 'var(--ink)' }}>{r.created}</span>
                  <span style={{ marginTop: 11, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: r.active ? '#f59e0b' : 'var(--sub2)' }}>{r.active}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 13, color: 'var(--ink)' }}>Échéances proches</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingTasks.length > 0 ? upcomingTasks.map((u) => {
                const d = new Date(u.due_date!);
                const isUrgent = d < now;
                const color = PRIO_COLORS[u.priority as keyof typeof PRIO_COLORS] || '#6366f1';
                return (
                  <div key={u.id} onClick={() => app.openTask(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div style={{ width: 38, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, color: isUrgent ? '#dc2626' : 'var(--ink)' }}>{d.getDate()}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--sub2)', textTransform: 'uppercase' }}>{monthLabel(d)}</div>
                    </div>
                    <span style={{ width: 3, height: 30, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: 'var(--ink2)' }}>{u.title}</span>
                  </div>
                );
              }) : (
                <div style={{ fontSize: 12, color: 'var(--sub2)', padding: '10px 0', textAlign: 'center' }}>Aucune échéance proche</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardCard({ board, members, stats, onClick }: { board: Board & { folderName: string }; members: Member[]; stats: { done: number; progress: number; todo: number }; onClick: () => void }) {
  const boardMembers = members.filter(m =>
    (board.members || []).some(bm => bm.id === m.id)
  );
  const totalT = stats.done + stats.progress + stats.todo;
  const pctDone = totalT ? Math.round(stats.done / totalT * 100) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        boxShadow: 'var(--shadow)', transition: 'box-shadow .15s, transform .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ height: 5, background: board.color }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sub2)', marginBottom: 5 }}>{board.folderName}</div>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 5, color: 'var(--ink)' }}>{board.name}</div>
        <div style={{ fontSize: 12, color: 'var(--sub2)', lineHeight: 1.45, height: 34, overflow: 'hidden' }}>{board.description}</div>

        {/* Stats par tableau */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[['À faire', stats.todo, '#94a3b8'], ['En cours', stats.progress, '#f59e0b'], ['Terminées', stats.done, '#10b981']].map(([lbl, v, c]) => (
            <div key={lbl as string} style={{ flex: 1, background: 'var(--soft2)', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, color: c as string }}>{v as number}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--sub2)', marginTop: 3 }}>{lbl as string}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 5, background: 'var(--soft2)', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', width: `${pctDone}%`, background: '#10b981', borderRadius: 3, transition: 'width .4s' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
          <div style={{ display: 'flex' }}>
            {boardMembers.slice(0, 4).map((m, i) => (
              <div key={m.id} title={m.name} style={{
                width: 25, height: 25, borderRadius: '50%',
                background: m.color, color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2.5px solid var(--panel)', marginLeft: i > 0 ? -7 : 0,
              }}>{m.initials}</div>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 11.5, fontWeight: 600, color: 'var(--sub2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="14" rx="1" />
              </svg>
              {(board.columns || []).length}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              {totalT}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
