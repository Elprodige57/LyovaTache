import type { ReactNode, CSSProperties } from 'react';

// Cadre commun aux pages Connexion / Inscription (logo + carte centrée).
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", padding: 20, WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ width: 384, maxWidth: '100%', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, padding: '30px 28px', boxShadow: 'var(--shadow-md)', animation: 'lyRise .3s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>L</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--sub2)', fontWeight: 500 }}>{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export const champStyle: CSSProperties = {
  width: '100%', border: '1px solid var(--line2)', borderRadius: 10, padding: '11px 13px',
  fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none',
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
};
