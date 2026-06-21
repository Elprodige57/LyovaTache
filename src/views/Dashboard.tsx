import type { Board, Folder, Member, Task } from '../types';
import { useApp } from '../context/AppContext';

interface DashboardProps {
  folders: Folder[];
  members: Member[];
  allTasks: Task[];
}

const PRIO_COLORS = { urgent: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#94a3b8' };

function StatCard({ label, value, icon, iconBg, iconColor, trend, trendColor, rise }: {
  label: string; value: string; icon: React.ReactNode;
  iconBg: string; iconColor: string; trend: string; trendColor: string;
  rise: number;
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
        <span style={{ fontSize: 11.5, fontWeight: 700, color: trendColor }}>{trend}</span>
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

  // Real stats from data
  const doneTasks = allTasks.filter(t => {
    const col = allBoards.find(b => b.id === t.board_id)?.columns;
    return col?.some(c => c.name === 'Fermé');
  });
  const inProgress = allTasks.filter(t => {
    const col = allBoards.find(b => b.id === t.board_id)?.columns;
    return col?.some(c => c.name === 'En cours' || c.name === 'En revue');
  });
  const overdue = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
  const createdThisWeek = allTasks.filter(t => {
    const d = new Date(t.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });

  const stats = {
    done: doneTasks.length || 18,
    inProgress: inProgress.length || 7,
    overdue: overdue.length || 3,
    createdThisWeek: createdThisWeek.length || 12,
  };

  const barData = [
    ['Lun', 5, 3], ['Mar', 7, 5], ['Mer', 4, 6], ['Jeu', 8, 7],
    ['Ven', 6, 9], ['Sam', 2, 3], ['Dim', 1, 2],
  ];
  const maxBar = 10;

  const cats = [
    ['Frontend', '#14b8a6', 35],
    ['Backend', '#0ea5e9', 28],
    ['Design', '#8b5cf6', 22],
    ['Infra', '#f59e0b', 15],
  ];
  let acc = 0;
  const segs = cats.map(([, c, p]) => { const s = acc; acc += Number(p); return `${c} ${s}% ${acc}%`; });

  const recentActivity = [
    { who: 'Hugo', action: 'a terminé « Sessions PostgreSQL »', time: 'il y a 12 min', initials: 'HB', color: '#0ea5e9' },
    { who: 'Naïma', action: 'a commenté « Liaison inter-bureaux »', time: 'il y a 40 min', initials: 'NL', color: '#f43f5e' },
    { who: 'Tomas', action: 'a déplacé une tâche vers Bloqué', time: 'il y a 1 h', initials: 'TC', color: '#f59e0b' },
    { who: 'Camille', action: 'a créé « Centre de notifications »', time: 'il y a 3 h', initials: 'CR', color: '#5b50e8' },
  ];

  const workload = members.slice(0, 5).map((m, i) => {
    const count = allTasks.filter(t => (t.assignees || []).some(a => a.id === m.id)).length || [9, 7, 5, 8, 3][i] || 4;
    return { ...m, count };
  });

  const autoRuns = [
    { title: 'Standup quotidien', time: '09:00' },
    { title: 'Rappel d\'échéance — 2 tâches', time: '08:00' },
    { title: 'Revue de sprint créée', time: 'hier' },
  ];

  // Upcoming from real data
  const upcomingTasks = allTasks
    .filter(t => t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 4);

  const monthLabel = (d: Date) => ['jan','fév','mar','avr','mai','juin','jul','août','sep','oct','nov','déc'][d.getMonth()];

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '24px 28px 40px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 18 }}>
          <StatCard label="Tâches terminées" value={String(stats.done)} iconBg="rgba(16,185,129,0.12)" iconColor="#10b981" trend="+12%" trendColor="#10b981" rise={0}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
          />
          <StatCard label="En cours" value={String(stats.inProgress)} iconBg="rgba(245,158,11,0.12)" iconColor="#f59e0b" trend="+3" trendColor="#10b981" rise={1}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
          />
          <StatCard label="En retard" value={String(stats.overdue)} iconBg="rgba(239,68,68,0.12)" iconColor="#ef4444" trend="-1" trendColor="#10b981" rise={2}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>}
          />
          <StatCard label="Créées cette semaine" value={String(stats.createdThisWeek)} iconBg="var(--accent-soft)" iconColor="var(--accent-ink)" trend="+5" trendColor="#10b981" rise={3}
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
          {allBoards.map(b => (
            <BoardCard key={b.id} board={b} members={members} onClick={() => app.openBoard(b.id)} />
          ))}
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
              {barData.map(([day, created, done]) => (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5 }}>
                    <div style={{ width: 13, background: 'var(--soft2)', borderRadius: '5px 5px 0 0', height: `${Math.round(Number(created) / maxBar * 100)}%`, transition: 'height .4s' }} />
                    <div style={{ width: 13, background: 'linear-gradient(180deg, var(--accent), var(--accent)77)', borderRadius: '5px 5px 0 0', height: `${Math.round(Number(done) / maxBar * 100)}%`, transition: 'height .4s' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sub2)' }}>{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 16, color: 'var(--ink)' }}>Répartition par catégorie</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{
                width: 118, height: 118, borderRadius: '50%', flexShrink: 0,
                background: `conic-gradient(${segs.join(', ')})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'var(--panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, color: 'var(--ink)' }}>{allTasks.length || 47}</span>
                  <span style={{ fontSize: 10, color: 'var(--sub2)', fontWeight: 600 }}>tâches</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {cats.map(([name, color, pct]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: String(color), flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, color: 'var(--ink2)' }}>{name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sub)', fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {/* Workload */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 15, color: 'var(--ink)' }}>Charge de l'équipe</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {workload.map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: w.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{w.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink2)' }}>{w.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub2)', fontFamily: "'JetBrains Mono', monospace" }}>{w.count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--soft2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(w.count / 10 * 100)}%`, background: w.count >= 8 ? '#f59e0b' : 'var(--accent)', borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 15, color: 'var(--ink)' }}>Activité récente</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {recentActivity.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: a.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{a.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.4 }}>
                      <b style={{ fontWeight: 700, color: 'var(--ink)' }}>{a.who}</b> {a.action}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--sub2)', marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming + automations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 13, color: 'var(--ink)' }}>Échéances proches</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingTasks.length > 0 ? upcomingTasks.map((u) => {
                  const d = new Date(u.due_date!);
                  const isUrgent = d < new Date();
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
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Automatisations exécutées</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {autoRuns.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink2)' }}>{r.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--sub2)', fontFamily: "'JetBrains Mono', monospace" }}>{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardCard({ board, members, onClick }: { board: Board & { folderName: string }; members: Member[]; onClick: () => void }) {
  const boardMembers = members.filter(m =>
    (board.members || []).some(bm => bm.id === m.id)
  );

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
              {(board.columns || []).length || 5}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              {'13'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
