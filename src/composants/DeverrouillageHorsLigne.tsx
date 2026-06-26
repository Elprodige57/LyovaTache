import { useState } from 'react';
import { verifyOffline, clearOfflineCredential, type OfflineCredential } from '../outils/offlineAuth';
import { AuthShell, champStyle } from './AuthShell';

// Sas de déverrouillage quand il n'y a pas de réseau : on vérifie le mot de passe
// localement (vérificateur PBKDF2) puis on ouvre l'accès aux données en cache.
export function DeverrouillageHorsLigne({ cred, onUnlock }: { cred: OfflineCredential; onUnlock: (c: OfflineCredential) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    const ok = await verifyOffline(cred.email, password);
    setLoading(false);
    if (ok) onUnlock(ok);
    else setError('Mot de passe incorrect.');
  };

  return (
    <AuthShell title="Accès hors-ligne" subtitle={cred.email}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ fontSize: 12.5, color: '#b45309', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 9, padding: '9px 11px', fontWeight: 600 }}>
          Pas de réseau — entre ton mot de passe pour accéder à tes données en cache.
        </div>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mot de passe" autoComplete="current-password" style={champStyle} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        {error && <div style={{ fontSize: 12.5, color: '#ef4444', fontWeight: 600 }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
          {loading ? '…' : 'Déverrouiller'}
        </button>
      </div>
      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--sub2)' }}>
        <span onClick={() => { clearOfflineCredential(); window.location.reload(); }} style={{ cursor: 'pointer', color: 'var(--accent-ink)', fontWeight: 600 }}>Utiliser un autre compte</span>
      </div>
    </AuthShell>
  );
}
