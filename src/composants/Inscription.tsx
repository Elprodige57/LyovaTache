import { useState } from 'react';
import { supabase } from '../outils/supabase';
import { signupSchema } from '../outils/validation/auth';
import { isRateLimited, resetRateLimit } from '../outils/rate-limit';
import { AuthShell, champStyle } from './AuthShell';
import { DemoLink } from './Connexion';

// Page d'inscription (création de compte).
export function Inscription({ onSwitch, onGuest }: { onSwitch: () => void; onGuest: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);
    const mail = email.trim();
    const parsed = signupSchema.safeParse({ name: name.trim(), email: mail, password });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Champs invalides.'); return; }

    const rlKey = 'signup:' + mail.toLowerCase();
    if (isRateLimited(rlKey)) { setError('Trop de tentatives. Réessaie dans environ 15 minutes.'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: mail, password, options: { data: { name: name.trim() } } });
      if (error) setError(error.message);
      else {
        resetRateLimit(rlKey);
        if (!data.session) setInfo('Compte créé ! Confirme ton email pour te connecter.');
        // Si la confirmation email est désactivée, App bascule automatiquement (session créée).
      }
    } catch {
      setError('Inscription impossible (serveur injoignable). Réessaie plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Créer un compte" subtitle="Rejoignez votre espace Lyova Tâches">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" autoComplete="name" style={champStyle} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" style={champStyle} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mot de passe (8 caractères min.)" autoComplete="new-password" style={champStyle} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        {error && <div style={{ fontSize: 12.5, color: '#ef4444', fontWeight: 600 }}>{error}</div>}
        {info && <div style={{ fontSize: 12.5, color: 'var(--accent-ink)', fontWeight: 600 }}>{info}</div>}
        <button onClick={submit} disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}>
          {loading ? '…' : 'Créer le compte'}
        </button>
      </div>

      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12.5, color: 'var(--sub2)' }}>
        Déjà un compte ?{' '}
        <span onClick={onSwitch} style={{ color: 'var(--accent-ink)', fontWeight: 700, cursor: 'pointer' }}>Se connecter</span>
      </div>

      <DemoLink onGuest={onGuest} />
    </AuthShell>
  );
}
