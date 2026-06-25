import { useState } from 'react';
import { supabase } from '../outils/supabase';
import { loginSchema, signupSchema } from '../outils/validation/auth';
import { isRateLimited, resetRateLimit } from '../outils/rate-limit';

export function LoginScreen({ onGuest }: { onGuest?: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);
    const mail = email.trim();

    // Validation (Zod)
    const parsed = mode === 'signin'
      ? loginSchema.safeParse({ email: mail, password })
      : signupSchema.safeParse({ name: name.trim(), email: mail, password });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Champs invalides.'); return; }

    // Anti-brute-force (5 essais / 15 min par email)
    const rlKey = 'login:' + mail.toLowerCase();
    if (isRateLimited(rlKey)) { setError('Trop de tentatives. Réessaie dans environ 15 minutes.'); return; }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) setError(error.message);
        else resetRateLimit(rlKey);
        // En cas de succès, App détecte la session via onAuthStateChange.
      } else {
        const { data, error } = await supabase.auth.signUp({ email: mail, password, options: { data: { name: name.trim() } } });
        if (error) setError(error.message);
        else {
          resetRateLimit(rlKey);
          if (!data.session) setInfo('Compte créé. Confirme ton email pour te connecter (ou désactive « Confirm email » dans Supabase → Authentication).');
        }
        // Si la confirmation est désactivée, data.session existe et App bascule automatiquement.
      }
    } finally {
      setLoading(false);
    }
  };

  const field: React.CSSProperties = {
    width: '100%', border: '1px solid var(--line2)', borderRadius: 10, padding: '11px 13px',
    fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none',
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      padding: 20, WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ width: 380, maxWidth: '100%', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, padding: '30px 28px', boxShadow: 'var(--shadow-md)', animation: 'lyRise .3s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>L</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>Lyova Tâches</div>
            <div style={{ fontSize: 12.5, color: 'var(--sub2)', fontWeight: 500 }}>{mode === 'signin' ? 'Connexion à votre espace' : 'Créer un compte'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {mode === 'signup' && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" style={field} />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" style={field}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mot de passe" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} style={field}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }} />

          {error && <div style={{ fontSize: 12.5, color: '#ef4444', fontWeight: 600 }}>{error}</div>}
          {info && <div style={{ fontSize: 12.5, color: 'var(--accent-ink)', fontWeight: 600 }}>{info}</div>}

          <button onClick={submit} disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? '…' : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </div>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12.5, color: 'var(--sub2)' }}>
          {mode === 'signin' ? "Pas encore de compte ? " : 'Déjà un compte ? '}
          <span onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }} style={{ color: 'var(--accent-ink)', fontWeight: 700, cursor: 'pointer' }}>
            {mode === 'signin' ? "S'inscrire" : 'Se connecter'}
          </span>
        </div>

        {onGuest && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>
            <button onClick={onGuest} style={{ width: '100%', background: 'transparent', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              Continuer sans compte (mode démo)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
