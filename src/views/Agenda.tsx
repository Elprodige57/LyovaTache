import { useApp } from '../context/AppContext';
import type { Task, Column } from '../types';

interface AgendaProps {
  tasks: Task[];
  columns: Column[];
}

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const WEEKDAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const FULL_DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const TODAY = new Date();

const PRIO_COLORS: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#94a3b8',
};

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function getWeekStart(d: Date) {
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function Agenda({ tasks, columns }: AgendaProps) {
  const app = useApp();
  const view = app.agendaView;

  const agendaTabs = [
    { key: 'day' as const, label: 'Jour' },
    { key: 'week' as const, label: 'Semaine' },
    { key: 'month' as const, label: 'Mois' },
    { key: 'team' as const, label: 'Équipe' },
  ];


  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 22px 26px', display: 'flex', flexDirection: 'column', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', minWidth: 155, color: 'var(--ink)' }}>
          {view === 'month' ? `${MONTH_NAMES[app.calMonth]} ${app.calYear}` : view === 'week' ? 'Cette semaine' : view === 'day' ? 'Aujourd\'hui' : 'Vue équipe'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ label: '‹', action: app.prevMonth }, { label: '›', action: app.nextMonth }].map(({ label, action }) => (
            <div key={label} onClick={action} style={{ width: 32, height: 32, border: '1px solid var(--line2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--panel)', fontSize: 16, color: 'var(--ink2)', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel)')}>{label}</div>
          ))}
        </div>
        <div onClick={app.goToday} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '7px 13px', cursor: 'pointer', background: 'var(--panel)', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel)')}>Aujourd'hui</div>

        <div style={{ marginLeft: 'auto', display: 'flex', background: 'var(--soft)', borderRadius: 9, padding: 3 }}>
          {agendaTabs.map(tab => {
            const active = view === tab.key;
            return (
              <div key={tab.key} onClick={() => app.setAgendaView(tab.key)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: active ? 'var(--ink)' : 'var(--sub2)', background: active ? 'var(--panel)' : 'transparent', boxShadow: active ? 'var(--shadow)' : 'none', transition: 'all .1s' }}>
                {tab.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Views */}
      {view === 'month' && <MonthView tasks={tasks} columns={columns} app={app} />}
      {view === 'week' && <WeekView tasks={tasks} columns={columns} app={app} />}
      {view === 'day' && <DayView tasks={tasks} columns={columns} app={app} />}
      {view === 'team' && <TeamView tasks={tasks} columns={columns} app={app} />}
    </div>
  );
}

function MonthView({ tasks, columns, app }: { tasks: Task[]; columns: Column[]; app: ReturnType<typeof useApp> }) {
  const colMap = Object.fromEntries(columns.map(c => [c.id, c]));
  const first = new Date(app.calYear, app.calMonth, 1).getDay();
  const offset = (first + 6) % 7;
  const dim = new Date(app.calYear, app.calMonth + 1, 0).getDate();
  const prevD = new Date(app.calYear, app.calMonth, 0).getDate();

  const dueBy: Record<number, Task[]> = {};
  tasks.forEach(t => {
    if (t.due_date) {
      const d = new Date(t.due_date);
      if (d.getFullYear() === app.calYear && d.getMonth() === app.calMonth) {
        const day = d.getDate();
        dueBy[day] = [...(dueBy[day] || []), t];
      }
    }
  });

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dn = i - offset + 1;
    const inM = dn >= 1 && dn <= dim;
    let disp = dn;
    if (dn < 1) disp = prevD + dn;
    else if (dn > dim) disp = dn - dim;
    const isToday = inM && dn === TODAY.getDate() && app.calMonth === TODAY.getMonth() && app.calYear === TODAY.getFullYear();

    const evs = inM && dueBy[dn] ? dueBy[dn].map(t => {
      const lbl = (t.labels || [])[0];
      const col = colMap[t.column_id];
      const color = lbl?.color ?? col?.color ?? '#64748b';
      return { title: t.title, color, tint: color + '1e', onOpen: () => app.openTask(t.id) };
    }) : [];

    cells.push({ day: disp, tasks: evs, inM, isToday });
  }

  const weeks = [];
  for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));

  return (
    <div style={{ flex: 1, minHeight: 480, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--line)' }}>
        {WEEKDAYS.map(wd => <div key={wd} style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sub2)' }}>{wd}</div>)}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateRows: 'repeat(6,1fr)' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--line)' }}>
            {week.map((cell, ci) => (
              <div key={ci} style={{ borderRight: '1px solid var(--line)', padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', minHeight: 74, background: cell.inM ? 'var(--panel)' : 'var(--panel2)' }}>
                <span style={{ fontSize: 12, fontWeight: cell.isToday ? 700 : (cell.inM ? 600 : 500), color: cell.isToday ? '#fff' : (cell.inM ? 'var(--ink2)' : 'var(--faint)'), width: 23, height: 23, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: cell.isToday ? 'var(--accent)' : 'transparent' }}>
                  {cell.day}
                </span>
                {cell.tasks.map((ev, ei) => (
                  <div key={ei} onClick={ev.onOpen} style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 5, cursor: 'pointer', background: ev.tint, color: ev.color, borderLeft: `2.5px solid ${ev.color}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'filter .1s' }} onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.95)')} onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
                    {ev.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({ tasks, columns, app }: { tasks: Task[]; columns: Column[]; app: ReturnType<typeof useApp> }) {
  const colMap = Object.fromEntries(columns.map(c => [c.id, c]));
  const weekStart = getWeekStart(new Date(app.calYear, app.calMonth, 15));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const tasksByDay = days.map(d => tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), d)));
  const maxTasks = Math.max(...tasksByDay.map(a => a.length), 0);
  const dayHeights = maxTasks > 0 ? Math.max(120, maxTasks * 38 + 40) : 120;

  return (
    <div style={{ flex: 1, minHeight: 400, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--line)' }}>
        {days.map((d, i) => {
          const isToday = isSameDay(d, TODAY);
          return (
            <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid var(--line)', background: isToday ? 'var(--accent-soft)' : 'var(--panel)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{WEEKDAYS[i]}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? 'var(--accent)' : 'var(--ink)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', flex: 1, minHeight: dayHeights }}>
        {days.map((d, i) => {
          const isToday = isSameDay(d, TODAY);
          const dayTasks = tasksByDay[i];
          return (
            <div key={i} style={{ borderRight: '1px solid var(--line)', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 6, background: isToday ? 'var(--accent-soft)' : 'var(--panel)', minHeight: dayHeights }}>
              {dayTasks.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', padding: '20px 0' }}>—</div>
              )}
              {dayTasks.map(t => {
                const lbl = (t.labels || [])[0];
                const col = colMap[t.column_id];
                const color = lbl?.color ?? col?.color ?? '#64748b';
                const ref = 'LYO-' + t.id.slice(-4).toUpperCase();
                return (
                  <div key={t.id} onClick={() => app.openTask(t.id)} style={{ background: color + '1e', border: `1px solid ${color}44`, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', transition: 'filter .1s' }} onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.95)')} onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--faint)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{ref}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: color, lineHeight: 1.35 }}>{t.title}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ tasks, columns, app }: { tasks: Task[]; columns: Column[]; app: ReturnType<typeof useApp> }) {
  const colMap = Object.fromEntries(columns.map(c => [c.id, c]));
  const day = new Date(app.calYear, app.calMonth, 15);
  const dayTasks = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));
  const isToday = isSameDay(day, TODAY);


  return (
    <div style={{ flex: 1, minHeight: 400, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: isToday ? 'var(--accent)' : 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}>{day.getDate()}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{FULL_DAYS[day.getDay() === 0 ? 6 : day.getDay() - 1]} {MONTH_NAMES[day.getMonth()]}</div>
          <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 1 }}>{dayTasks.length} tâche{dayTasks.length > 1 ? 's' : ''}</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {dayTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--sub2)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune tâche pour cette date</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayTasks.map(t => {
              const col = colMap[t.column_id];
              const color = PRIO_COLORS[t.priority] ?? '#64748b';
              const ref = 'LYO-' + t.id.slice(-4).toUpperCase();
              return (
                <div key={t.id} onClick={() => app.openTask(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel2)')}>
                  <div style={{ width: 4, height: 40, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--faint)' }}>{ref}</span>
                      {col && <span style={{ fontSize: 10, fontWeight: 600, color: col.color, background: col.color + '1e', padding: '1px 7px', borderRadius: 5 }}>{col.name}</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>{t.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--sub2)' }}>
                      <span style={{ fontWeight: 600, color }}>{t.priority}</span>
                      <span>{t.estimated_hours}h estimée</span>
                    </div>
                  </div>
                  {(t.assignees || []).length > 0 && (
                    <div style={{ display: 'flex', flexShrink: 0 }}>
                      {(t.assignees || []).map((a, i) => (
                        <div key={a.id} style={{ width: 26, height: 26, borderRadius: '50%', background: a.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--panel)', marginLeft: i > 0 ? -6 : 0 }}>{a.initials}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamView({ tasks, columns, app }: { tasks: Task[]; columns: Column[]; app: ReturnType<typeof useApp> }) {
  const colMap = Object.fromEntries(columns.map(c => [c.id, c]));
  const assignees = new Map<string, { member: NonNullable<Task['assignees']>[0]; tasks: Task[] }>();

  tasks.forEach(t => {
    (t.assignees || []).forEach(a => {
      if (!assignees.has(a.id)) assignees.set(a.id, { member: a, tasks: [] });
      assignees.get(a.id)!.tasks.push(t);
    });
  });

  const entries = Array.from(assignees.values()).sort((a, b) => b.tasks.length - a.tasks.length);

  return (
    <div style={{ flex: 1, minHeight: 400, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'auto', boxShadow: 'var(--shadow)', padding: '16px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {entries.map(({ member, tasks }) => (
          <div key={member.id} style={{ background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: member.color, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{member.initials}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{member.name}</div>
                <div style={{ fontSize: 11, color: 'var(--sub2)', marginTop: 1 }}>{tasks.length} tâche{tasks.length > 1 ? 's' : ''}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800, color: 'var(--faint)', fontFamily: "'JetBrains Mono', monospace" }}>{member.initials}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.slice(0, 6).map(t => {
                const col = colMap[t.column_id];
                const color = PRIO_COLORS[t.priority] ?? '#64748b';
                const ref = 'LYO-' + t.id.slice(-4).toUpperCase();
                return (
                  <div key={t.id} onClick={() => app.openTask(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 3, height: 24, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--sub2)', marginTop: 2 }}>
                        <span style={{ fontWeight: 700, color }}>{t.priority}</span>
                        {col && <span>{col.name}</span>}
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{ref}</span>
                      </div>
                    </div>
                    {t.due_date && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--sub2)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {new Date(t.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                );
              })}
              {tasks.length > 6 && (
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)', textAlign: 'center', padding: '4px 0', cursor: 'pointer' }} onClick={() => app.goTo('mytasks')}>
                  + {tasks.length - 6} tâche{tasks.length > 7 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--sub2)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune tâche assignée pour l'équipe</div>
          </div>
        )}
      </div>
    </div>
  );
}
