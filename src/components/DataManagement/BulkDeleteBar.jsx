/**
 * Shared bulk delete toolbar + confirmation modal
 */
export function BulkDeleteBar({ selectedCount, totalCount, onSelectAll, onClear, onDelete, isDeleting }) {
  if (selectedCount === 0) return null;
  return (
    <div style={{
      background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10,
      padding: '10px 16px', marginBottom: 12,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        נבחרו {selectedCount} מתוך {totalCount}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        {selectedCount < totalCount && (
          <button className="btn btn-ghost" onClick={onSelectAll} style={{ fontSize: 12 }}>בחר הכל ({totalCount})</button>
        )}
        <button className="btn btn-ghost" onClick={onClear} style={{ fontSize: 12 }}>ביטול בחירה</button>
        <button className="btn btn-danger" onClick={onDelete} disabled={isDeleting} style={{ fontSize: 12 }}>
          {isDeleting ? 'מוחק...' : `מחק ${selectedCount} רשומות`}
        </button>
      </div>
    </div>
  );
}

export function BulkDeleteConfirm({ count, entityName, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
        <h3 style={{ marginBottom: 12 }}>מחיקה המונית</h3>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 8 }}>
          האם למחוק <strong>{count}</strong> {entityName}?
        </p>
        <p style={{ color: '#F59E0B', fontSize: 12, marginBottom: 20 }}>פעולה זו אינה הפיכה.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel}>ביטול</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'מוחק...' : `מחק ${count} רשומות`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SelectCheckbox({ checked, onChange }) {
  return (
    <input type="checkbox" checked={checked} onChange={onChange}
      onClick={e => e.stopPropagation()}
      style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
  );
}
