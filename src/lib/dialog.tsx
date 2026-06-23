import { useEffect, useState } from 'react';

// Dialogues « propres » (remplacent confirm()/prompt() natifs du navigateur).
// API impérative : await confirmDialog(...) / await promptDialog(...).
interface DialogReq {
  id: number;
  kind: 'confirm' | 'prompt';
  title: string;
  message?: string;
  defaultValue?: string;
  danger?: boolean;
  confirmLabel?: string;
  resolve: (value: boolean | string | null) => void;
}

let listeners: ((d: DialogReq) => void)[] = [];
let counter = 0;

export function confirmDialog(title: string, opts?: { message?: string; danger?: boolean; confirmLabel?: string }): Promise<boolean> {
  return new Promise(resolve => {
    const req: DialogReq = { id: ++counter, kind: 'confirm', title, message: opts?.message, danger: opts?.danger, confirmLabel: opts?.confirmLabel, resolve: (v) => resolve(v === true) };
    listeners.forEach(l => l(req));
  });
}

export function promptDialog(title: string, defaultValue = '', opts?: { message?: string; confirmLabel?: string }): Promise<string | null> {
  return new Promise(resolve => {
    const req: DialogReq = { id: ++counter, kind: 'prompt', title, message: opts?.message, defaultValue, confirmLabel: opts?.confirmLabel, resolve: (v) => resolve(typeof v === 'string' ? v : null) };
    listeners.forEach(l => l(req));
  });
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 200, animation: 'lyFade .15s ease' };
const panel: React.CSSProperties = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 201, width: 420, maxWidth: '92vw', background: 'var(--panel)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-md)', animation: 'lyPop .18s ease', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" };
const btnGhost: React.CSSProperties = { background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 16px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' };

export function DialogHost() {
  const [req, setReq] = useState<DialogReq | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    const l = (d: DialogReq) => { setReq(d); if (d.kind === 'prompt') setValue(d.defaultValue ?? ''); };
    listeners.push(l);
    return () => { listeners = listeners.filter(x => x !== l); };
  }, []);

  if (!req) return null;
  const cancel = () => { req.resolve(req.kind === 'confirm' ? false : null); setReq(null); };
  const ok = () => { req.resolve(req.kind === 'confirm' ? true : value); setReq(null); };

  return (
    <>
      <div onClick={cancel} style={overlay} />
      <div style={panel} role="dialog" aria-modal="true">
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: req.message || req.kind === 'prompt' ? 8 : 16 }}>{req.title}</div>
        {req.message && <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.5, marginBottom: 16, whiteSpace: 'pre-line' }}>{req.message}</div>}
        {req.kind === 'prompt' && (
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') cancel(); }}
            style={{ width: '100%', border: '1px solid var(--accent)', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", marginBottom: 16 }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={cancel} style={btnGhost}>Annuler</button>
          <button onClick={ok} style={{ background: req.danger ? '#ef4444' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {req.confirmLabel ?? (req.danger ? 'Supprimer' : 'Valider')}
          </button>
        </div>
      </div>
    </>
  );
}
