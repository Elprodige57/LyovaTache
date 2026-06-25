import type { ReactNode, CSSProperties } from 'react';

// Cadre commun aux pages Connexion / Inscription :
// colonne gauche = vitrine animée (démos de fonctionnalités), colonne droite = formulaire.
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="lyo-auth">
      <style>{`
        .lyo-auth{min-height:100vh;display:flex;background:var(--bg);color:var(--ink);font-family:'Hanken Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
        .lyo-auth-show{flex:1;background:linear-gradient(135deg,#4b40d8,#7a52ec 55%,#9b6cf2);color:#fff;padding:48px 52px;display:flex;flex-direction:column;justify-content:center;gap:26px;position:relative;overflow:hidden}
        .lyo-auth-show h1{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
        .lyo-auth-show p.lead{font-size:14.5px;opacity:.9;line-height:1.6;max-width:420px}
        .lyo-auth-form{width:440px;max-width:100%;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:24px}
        .lyo-auth-card{width:384px;max-width:100%;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:30px 28px;box-shadow:var(--shadow-md);animation:lyRise .3s ease both}
        .lyo-feats{display:flex;flex-direction:column;gap:12px;max-width:430px}
        .lyo-feat{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:13px 15px;backdrop-filter:blur(4px)}
        .lyo-feat .ft{flex:1}
        .lyo-feat .ft-t{font-size:13.5px;font-weight:700}
        .lyo-feat .ft-s{font-size:11.5px;opacity:.82;margin-top:1px}
        .lyo-mini{width:64px;height:46px;border-radius:9px;background:rgba(255,255,255,.14);flex-shrink:0;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;gap:3px}
        /* démo Kanban : carte qui se déplace */
        .lyo-col{width:13px;height:34px;border-radius:3px;background:rgba(255,255,255,.30)}
        .lyo-card{position:absolute;width:13px;height:9px;border-radius:2px;background:#fff;top:10px;left:9px;animation:lyMove 3s ease-in-out infinite}
        @keyframes lyMove{0%,15%{left:9px;top:10px}40%,55%{left:26px;top:14px}80%,100%{left:42px;top:9px}}
        /* démo checklist : coches qui apparaissent */
        .lyo-chk{display:flex;flex-direction:column;gap:4px}
        .lyo-chk span{display:block;width:34px;height:5px;border-radius:3px;background:rgba(255,255,255,.35);position:relative}
        .lyo-chk span::after{content:'';position:absolute;inset:0;width:0;background:#fff;border-radius:3px;animation:lyFill 3s ease-in-out infinite}
        .lyo-chk span:nth-child(2)::after{animation-delay:.5s}
        .lyo-chk span:nth-child(3)::after{animation-delay:1s}
        @keyframes lyFill{0%,10%{width:0}40%,100%{width:100%}}
        /* démo stats : barres qui montent */
        .lyo-bars{display:flex;align-items:flex-end;gap:4px;height:32px}
        .lyo-bars i{width:8px;background:#fff;border-radius:2px 2px 0 0;animation:lyGrow 2.6s ease-in-out infinite}
        .lyo-bars i:nth-child(1){animation-delay:0s}
        .lyo-bars i:nth-child(2){animation-delay:.3s}
        .lyo-bars i:nth-child(3){animation-delay:.6s}
        @keyframes lyGrow{0%,100%{height:8px}50%{height:30px}}
        @media (max-width:880px){.lyo-auth-show{display:none}.lyo-auth-form{flex:1}}
      `}</style>

      {/* Vitrine animée */}
      <div className="lyo-auth-show">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>L</div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Lyova Tâches</span>
        </div>
        <div>
          <h1>Organisez tout votre travail,<br />au même endroit.</h1>
          <p className="lead">Kanban, documents type Word, statistiques en temps réel, équipes et accès — votre espace de travail complet, même hors-ligne.</p>
        </div>
        <div className="lyo-feats">
          <div className="lyo-feat">
            <div className="lyo-mini"><span className="lyo-col" /><span className="lyo-col" /><span className="lyo-col" /><span className="lyo-card" /></div>
            <div className="ft"><div className="ft-t">Kanban fluide</div><div className="ft-s">Glissez-déposez vos tâches et colonnes</div></div>
          </div>
          <div className="lyo-feat">
            <div className="lyo-mini"><div className="lyo-chk"><span /><span /><span /></div></div>
            <div className="ft"><div className="ft-t">Documents & checklists</div><div className="ft-s">Éditeur type traitement de texte</div></div>
          </div>
          <div className="lyo-feat">
            <div className="lyo-mini"><div className="lyo-bars"><i /><i /><i /></div></div>
            <div className="ft"><div className="ft-t">Statistiques en direct</div><div className="ft-s">Suivez l'avancement par tableau et par personne</div></div>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="lyo-auth-form">
        <div className="lyo-auth-card">
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
    </div>
  );
}

export const champStyle: CSSProperties = {
  width: '100%', border: '1px solid var(--line2)', borderRadius: 10, padding: '11px 13px',
  fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none',
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
};
