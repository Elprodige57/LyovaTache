import { useState } from 'react';
import { useApp } from '../controleur/AppContext';

interface CreateFolderModalProps {
  workspaceId: string;
}

export function CreateFolderModal({ workspaceId }: CreateFolderModalProps) {
  const app = useApp();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const n = name.trim();
    if (!n || saving) return;
    setSaving(true);
    await app.createFolder(workspaceId, n);
    setName('');
    app.toggleCreateFolder();
    setSaving(false);
  };

  return (
    <>
      <div onClick={app.toggleCreateFolder} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, animation: 'lyFade .15s ease' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 61, width: 420, background: 'var(--panel)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-md)', animation: 'lyPop .18s ease', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 16 }}>Nouveau dossier</div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') app.toggleCreateFolder(); }}
          placeholder="Nom du dossier…"
          autoFocus
          style={{ width: '100%', border: '1px solid var(--accent)', borderRadius: 9, padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', background: 'var(--soft)', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={app.toggleCreateFolder} style={{ background: 'var(--panel)', color: 'var(--ink2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !name.trim() || saving ? 0.5 : 1 }}>{saving ? '…' : 'Créer'}</button>
        </div>
      </div>
    </>
  );
}
