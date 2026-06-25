import { useState, useRef, useEffect } from 'react';
import { useApp } from '../controleur/AppContext';

interface Message {
  isAI?: boolean;
  isUser?: boolean;
  text: string;
  hasCard?: boolean;
  cardTitle?: string;
  cardItems?: { text: string; est: string }[];
}

const INITIAL_MESSAGES: Message[] = [
  {
    isAI: true,
    text: 'Bonjour Camille ! Je peux résumer des tâches, générer des sous-tâches, estimer des durées, planifier un sprint ou détecter les blocages. Que faisons-nous ?',
  },
];

const AI_CHIPS = [
  { label: 'Générer un sprint', icon: 'M13 2 3 14h7l-1 8 10-12h-7z' },
  { label: 'Tâches critiques', icon: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22v-7' },
  { label: 'Résumer la semaine', icon: 'M21 6H3M15 12H3M17 18H3' },
  { label: 'Détecter les blocages', icon: 'M12 6v6l4 2' },
];

const AI_RESPONSES: Record<string, Message> = {
  default: {
    isAI: true,
    text: 'Je note votre demande. Dans une version complète, je pourrais analyser vos données en temps réel et vous fournir une réponse détaillée. Pour l\'instant, voici ce que je peux faire : résumer des tâches, détecter les blocages, planifier des sprints.',
  },
  sprint: {
    isAI: true,
    text: 'Voici un sprint frontend d\'une semaine (~38 h) basé sur vos tâches ouvertes et la charge actuelle de l\'équipe :',
    hasCard: true,
    cardTitle: 'Sprint Frontend · 23–27 juin',
    cardItems: [
      { text: 'Finaliser le drag & drop @dnd-kit', est: '6 h' },
      { text: 'Vue agenda — mode semaine', est: '8 h' },
      { text: 'Centre de notifications (Socket.io)', est: '10 h' },
      { text: 'Drawer de tâche — éditeur riche', est: '9 h' },
      { text: 'Tests e2e des écrans clés', est: '5 h' },
    ],
  },
  critique: {
    isAI: true,
    text: 'J\'ai analysé vos 27 tâches actives. Voici les 3 tâches les plus critiques : \n\n1. **Authentification JWT** — en retard de 2 jours, bloquée par la config OAuth\n2. **Sessions PostgreSQL** — assignée à Hugo, aucune mise à jour depuis 5 jours\n3. **Web Push (Service Worker)** — date d\'échéance dépassée',
  },
  resume: {
    isAI: true,
    text: 'Résumé de la semaine (16–22 juin) :\n\n• 6 tâches terminées (+2 vs semaine précédente)\n• 3 tâches en retard signalées\n• 2 sprints actifs — charge équipe à 78%\n• Hugo : charge élevée (92%)\n• Naïma : disponible pour plus de travail',
  },
  blocage: {
    isAI: true,
    text: 'J\'ai détecté 2 blocages potentiels dans votre projet :\n\n⚠️ **Authentification** — dépend de la config serveur non terminée\n⚠️ **Liaison inter-bureaux** — en attente d\'une décision architecture depuis 4 jours\n\nJe recommande de tenir un point équipe sur ces deux points.',
  },
};

function getAIResponse(text: string): Message {
  const t = text.toLowerCase();
  if (t.includes('sprint') || t.includes('semaine prochaine')) return AI_RESPONSES.sprint;
  if (t.includes('critiqu') || t.includes('urgent') || t.includes('priorité')) return AI_RESPONSES.critique;
  if (t.includes('résum') || t.includes('semaine') || t.includes('recap')) return AI_RESPONSES.resume;
  if (t.includes('blocage') || t.includes('bloqué') || t.includes('block')) return AI_RESPONSES.blocage;
  return AI_RESPONSES.default;
}

export function AIPanel() {
  const app = useApp();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const userMsg: Message = { isUser: true, text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages(prev => [...prev, getAIResponse(trimmed)]);
    }, 900 + Math.random() * 600);
  };

  return (
    <>
      <div onClick={app.closeAI} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 50, animation: 'lyFade .15s ease' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 440, maxWidth: '94vw',
        background: 'var(--panel)', zIndex: 51,
        boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column',
        animation: 'lySlide .22s cubic-bezier(.2,.8,.2,1)',
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Lyova IA</div>
            <div style={{ fontSize: 11.5, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              {thinking ? 'En train de réfléchir…' : 'En ligne'}
            </div>
          </div>
          <div onClick={app.closeAI} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sub)', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, i) => (
            <div key={i}>
              {m.isUser ? (
                <div style={{ alignSelf: 'flex-end', maxWidth: '82%', marginLeft: 'auto', background: 'var(--accent)', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '10px 14px', fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>{m.text}</div>
              ) : (
                <div style={{ alignSelf: 'flex-start', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: '14px 14px 14px 4px', padding: '12px 14px', fontSize: 13, lineHeight: 1.55, color: 'var(--ink2)', whiteSpace: 'pre-line' }}>{m.text}</div>
                  {m.hasCard && (
                    <div style={{ background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 12, padding: '13px 14px', boxShadow: 'var(--shadow)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent-ink)', marginBottom: 9 }}>{m.cardTitle}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {m.cardItems?.map((it, j) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 15, height: 15, borderRadius: 5, border: '2px solid var(--line2)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12.5, color: 'var(--ink2)', flex: 1 }}>{it.text}</span>
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sub2)', fontFamily: "'JetBrains Mono', monospace" }}>{it.est}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                        <button style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: 8, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Créer le sprint</button>
                        <button style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 13px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Modifier</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div style={{ display: 'flex', gap: 5, padding: '8px 12px', background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: '14px 14px 14px 4px', width: 'fit-content' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: `lyDot .9s ${i * 0.2}s infinite ease-in-out` }} />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chips */}
        <div style={{ flexShrink: 0, padding: '0 20px 8px' }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
            {AI_CHIPS.map((chip, i) => (
              <div key={i} onClick={() => send(chip.label)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 18, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'filter .1s' }} onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.97)')} onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {chip.icon.split('|').map((d, di) => <path key={di} d={d} />)}
                </svg>
                {chip.label}
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 12, padding: '4px 4px 4px 13px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Demandez à Lyova IA…"
              disabled={thinking}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", padding: '7px 0' }}
            />
            <div
              onClick={() => send(input)}
              style={{ width: 32, height: 32, borderRadius: 9, background: input.trim() && !thinking ? 'var(--accent)' : 'var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !thinking ? 'pointer' : 'default', transition: 'background .15s', flexShrink: 0 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
