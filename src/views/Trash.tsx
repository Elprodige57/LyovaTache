import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTrashedBoards, restoreBoard, purgeBoard, purgeExpiredBoards } from '../hooks/useData';
import { confirmDialog } from '../lib/dialog';

interface TrashProps { workspaceId: string; }

export function Trash({ workspaceId }: TrashProps) {
  const app = useApp();
  const boards = useTrashedBoards(workspaceId, app.refreshCounter);

  // Purge automatique des Bureaux en corbeille depuis plus de 30 jours.
  useEffect(() => {
    purgeExpiredBoards(workspaceId).then((n) => { if (n > 0) app.refreshAll(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const daysLeft = (deletedAt: string) => {
    const elapsed = (Date.now() - new Date(deletedAt).getTime()) / (24 * 3600 * 1000);
    return Math.max(0, Math.ceil(30 - elapsed));
  };

  async function onRestore(id: string) {
    await restoreBoard(id);
    app.refreshAll();
  }
  async function onPurge(id: string, name: string) {
    if (await confirmDialog('Supprimer définitivement ?', { message: `« ${name} » et toutes ses informations (colonnes, tâches…) seront supprimées pour toujours. Action irréversible.`, danger: true, confirmLabel: 'Supprimer définitivement' })) {
      await purgeBoard(id);
      app.refreshAll();
    }
  }

  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow)' };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '22px 26px 40px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Corbeille</h1>
        <p style={{ fontSize: 13, color: 'var(--sub2)', marginTop: 2, marginBottom: 18 }}>
          Les Bureaux supprimés restent ici <strong>30 jours</strong> avec toutes leurs informations, puis sont supprimés définitivement.
        </p>

        {boards.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--sub2)', fontSize: 13, padding: 40 }}>
            La corbeille est vide.
          </div>
        ) : (
          <div style={{ ...card, overflow: 'hidden' }}>
            {boards.map((b, i) => {
              const left = daysLeft(b.deleted_at!);
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < boards.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{b.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--sub2)' }}>
                      {b.folder?.name ? b.folder.name + ' · ' : ''}supprimé le {new Date(b.deleted_at!).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: left <= 3 ? '#ef4444' : '#B85C00', background: (left <= 3 ? '#ef4444' : '#B85C00') + '1f', whiteSpace: 'nowrap' }}>
                    {left} jour{left > 1 ? 's' : ''} restant{left > 1 ? 's' : ''}
                  </span>
                  <button onClick={() => onRestore(b.id)} style={{ fontSize: 12, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: '#2D6A0E', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Restaurer</button>
                  <button onClick={() => onPurge(b.id, b.name)} title="Supprimer définitivement" style={{ fontSize: 12, padding: '6px 13px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Supprimer</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
