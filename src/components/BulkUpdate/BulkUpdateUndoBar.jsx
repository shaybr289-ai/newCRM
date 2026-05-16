import { useBulkUpdateUndo } from '../../hooks/useBulkUpdate';

export default function BulkUpdateUndoBar({ updatedCount, sessionId, entity, onDismiss }) {
  const undoMut = useBulkUpdateUndo(entity);

  if (!sessionId) return null;

  async function handleUndo() {
    try {
      await undoMut.mutateAsync({ sessionId });
      onDismiss();
    } catch (err) {
      alert('שגיאה בביטול: ' + err.message);
    }
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      zIndex: 1000, minWidth: 360,
    }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>
          ✓ עודכנו {updatedCount} רשומות בהצלחה
        </span>
      </div>
      <button
        className="btn btn-ghost"
        onClick={handleUndo}
        disabled={undoMut.isPending}
        style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', whiteSpace: 'nowrap' }}
      >
        {undoMut.isPending ? 'מבטל...' : '↩ ביטול עדכון'}
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-2)', fontSize: 16, padding: '2px 6px',
        }}
        title="סגור"
      >✕</button>
    </div>
  );
}
