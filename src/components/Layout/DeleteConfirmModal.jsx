/**
 * Shared delete confirmation modal with cascade-impact warning.
 * Props:
 *   title      – dialog heading, e.g. "מחיקת לקוח"
 *   name       – record name shown in bold
 *   cascade    – string describing associated records that will also be deleted
 *   onConfirm  – async fn to call when user confirms
 *   onCancel   – fn to close the modal
 *   isPending  – boolean while mutation is in flight
 */
export default function DeleteConfirmModal({ title, name, cascade, onConfirm, onCancel, isPending }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 460, padding: 28 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(220,38,38,0.1)', color: '#DC2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            <i className="ti ti-trash" aria-hidden="true" />
          </div>
          <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
        </div>

        {/* Name */}
        <p style={{ color: 'var(--text-1)', fontSize: 14, marginBottom: 12 }}>
          האם למחוק את <strong>{name}</strong>?
        </p>

        {/* Cascade warning */}
        {cascade && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: 13,
            color: 'var(--text-2)',
          }}>
            <i className="ti ti-alert-triangle" style={{ color: '#F59E0B', fontSize: 16, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <span>{cascade}</span>
          </div>
        )}

        {/* Irreversible note */}
        <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 22 }}>
          ⚠ פעולה זו אינה הפיכה ולא ניתן לשחזר את הנתונים לאחר המחיקה.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={isPending}>ביטול</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'מוחק...' : 'אישור מחיקה'}
          </button>
        </div>
      </div>
    </div>
  );
}
