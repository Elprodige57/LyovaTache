import { useState } from 'react';
import { supabase } from '../outils/supabase';
import { loginSchema } from '../outils/validation/auth';
import { isRateLimited, resetRateLimit } from '../outils/rate-limit';
import { AuthShell, champStyle } from './AuthShell';

// Page de connexion (compte existant).
export function Connexion({ onSwitch, onGuest }: { onSwitch: () => void; onGuest: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    const mail = email.trim();
    const parsed = loginSchema.safeParse({ email: mail, password });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Champs invalides.'); return; }

    const rlKey = 'login:' + mail.toLowerCase();
    if (isRateLimited(rlKey)) { setError('Trop de tentatives. Réessaie dans environ 15 minutes.'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (error) setError(error.message);
      else resetRateLimit(rlKey); // App bascule via onAuthStateChange
    } catch {
      setError('Connexion impossible (serveur injoignable). Réessaie ou continue en mode démo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre espace Lyova Tâches">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" style={champStyle} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mot de passe" autoComplete="current-password" style={champStyle} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        {error && <div style={{ fontSize: 12.5, color: '#ef4444', fontWeight: 600 }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}>
          {loading ? '…' : 'Se connecter'}
        </button>
      </div>

      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12.5, color: 'var(--sub2)' }}>
        Pas encore de compte ?{' '}
        <span onClick={onSwitch} style={{ color: 'var(--accent-ink)', fontWeight: 700, cursor: 'pointer' }}>Créer un compte</span>
      </div>

      <DemoLink onGuest={onGuest} />
    </AuthShell>
  );
}

export function DemoLink({ onGuest }: { onGuest: () => void }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <button onClick={onGuest} style={{ width: '100%', background: 'transparent', color: 'var(--sub2)', border: '1px solid var(--line2)', borderRadius: 10, padding: '9px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
        Continuer sans compte (mode démo)
      </button>
    </>
  );
}
