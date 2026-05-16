export default function BulkUpdateConfirm({ count, fieldLabel, value, onConfirm, onCancel, isUpdating }) {
  const displayValue = value === '' || value === null || value === undefined
    ? '(ריק — ינוקה)'
    : String(value);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, padding: 28 }}>
        <h3 style={{ marginBottom: 14, fontSize: 17 }}>אישור עדכון המוני</h3>

        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 8 }}>
          עומדים לעדכן <strong>{count}</strong> רשומות:
        </p>
        <div style={{
          background: 'var(--bg-page)', borderRadius: 8, padding: '10px 14px',
          fontSize: 13, marginBottom: 16, border: '1px solid var(--border)',
        }}>
          <div><span style={{ color: 'var(--text-2)' }}>שדה: </span><strong>{fieldLabel}</strong></div>
          <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text-2)' }}>ערך חדש: </span><strong>{displayValue}</strong></div>
        </div>

        <p style={{ color: '#F59E0B', fontSize: 12, marginBottom: 20 }}>
          ניתן לבטל את העדכון מיד לאחר ביצועו בלחיצה על "ביטול עדכון".
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={isUpdating}>ביטול</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={isUpdating}>
            {isUpdating ? 'מעדכן...' : `עדכן ${count} רשומות`}
          </button>
        </div>
      </div>
    </div>
  );
}
