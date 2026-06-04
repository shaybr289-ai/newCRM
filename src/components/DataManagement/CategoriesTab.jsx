import { useState, useRef } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useBulkDeleteCategories } from '../../hooks/useDataManagement';
import { BulkDeleteBar, BulkDeleteConfirm, SelectCheckbox } from './BulkDeleteBar';
import { Icon, ICONS } from '../../utils/icons';
import { exportToCSV, importCSV, findColumn } from '../../utils/exportCSV';
import '../Customers/CustomerModal.css';

export default function CategoriesTab({ readOnly = false }) {
  const { data, isLoading } = useCategories();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  const bulkDeleteMut = useBulkDeleteCategories();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const toggleSel = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(p => p.size === items.length ? new Set() : new Set(items.map(i => i.id)));
  const handleBulkDelete = async () => { await bulkDeleteMut.mutateAsync([...selectedIds]); setSelectedIds(new Set()); setBulkConfirm(false); };
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { headers, rows } = await importCSV(file);
      console.log('[Categories Import] Headers:', headers, 'Rows:', rows.length);
      let created = 0, skipped = 0, errors = [];
      for (const row of rows) {
        const name = findColumn(row, ['שם קטגוריה', 'שם', 'name', 'קטגוריה', 'category']);
        const num = findColumn(row, ['מספר', 'מספר קטגוריה', 'num', 'קוד', 'code']);
        const desc = findColumn(row, ['תיאור', 'description', 'הערה', 'מסר']);
        if (!name.trim()) { skipped++; continue; }
        try {
          await createMut.mutateAsync({ name: name.trim(), num: num.trim() || null, description: desc.trim() || null });
          created++;
        } catch (err) {
          skipped++;
          if (errors.length < 3) errors.push(`${name}: ${err.message}`);
        }
      }
      let msg = `יובאו ${created} קטגוריות, ${skipped} דולגו`;
      if (errors.length > 0) msg += ` | שגיאות: ${errors.join(', ')}`;
      setImportResult(msg);
      setTimeout(() => setImportResult(null), 5000);
    } catch (err) {
      alert('שגיאה ביבוא: ' + err.message);
    }
    e.target.value = '';
  };

  const items = (data?.data || []).filter(c =>
    !search || (c.name || '').includes(search) || (c.num || '').includes(search)
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!edit.name?.trim()) { alert('שם קטגוריה הוא שדה חובה'); return; }
    if (edit.id) await updateMut.mutateAsync({ id: edit.id, ...edit });
    else await createMut.mutateAsync(edit);
    setEdit(null);
  };

  return (
    <div>
      <div className="dm-table-header">
        <h3>קטגוריות אב ({items.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, width: 180 }} />
          {!readOnly && (
            <>
              <button className="btn btn-secondary" onClick={() => exportToCSV(items, ['num','name','description'], ['מספר','שם קטגוריה','תיאור'], 'categories')} style={{ fontSize: 12 }}>
                יצוא
              </button>
              <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>
                יבוא
              </button>
              <input type="file" ref={fileRef} onChange={handleImport} accept=".csv,.xlsx,.xls,.txt" style={{ display: 'none' }} />
            </>
          )}
          {!readOnly && (
            <button className="btn btn-primary" onClick={() => setEdit({ num: '', name: '', description: '' })} style={{ fontSize: 12 }}>
              <Icon svg={ICONS.plus} size={14} /> קטגוריה חדשה
            </button>
          )}
        </div>
      </div>

      {importResult && (
        <div style={{ background: '#10B98122', border: '1px solid #10B98144', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#10B981', fontWeight: 600 }}>
          {importResult}
        </div>
      )}

      {!readOnly && <BulkDeleteBar selectedCount={selectedIds.size} totalCount={items.length} onSelectAll={toggleAll} onClear={() => setSelectedIds(new Set())} onDelete={() => setBulkConfirm(true)} isDeleting={bulkDeleteMut.isPending} />}

      {isLoading ? <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>טוען...</p> : (
        <table className="dm-table">
          <thead><tr>
            <th style={{ width: 36 }}><SelectCheckbox checked={selectedIds.size === items.length && items.length > 0} onChange={toggleAll} /></th>
            <th style={{ width: 90 }}>מספר</th><th>שם קטגוריה</th><th>תיאור</th><th style={{ width: 80 }}>פעולות</th>
          </tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} style={{ background: selectedIds.has(c.id) ? 'var(--accent-light)' : '' }}>
                <td><SelectCheckbox checked={selectedIds.has(c.id)} onChange={() => toggleSel(c.id)} /></td>
                <td style={{ fontWeight: 700, color: '#10B981' }}>{c.num || '—'}</td>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{c.description || '—'}</td>
                <td>
                  {!readOnly && (
                    <div className="table-actions">
                      <button className="action-btn edit" onClick={() => setEdit({ ...c })} title="ערוך"><i className="ti ti-edit" aria-hidden="true" /></button>
                      <button className="action-btn delete" onClick={() => setDel(c)} title="מחק"><i className="ti ti-trash" aria-hidden="true" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>אין קטגוריות</td></tr>}
          </tbody>
        </table>
      )}

      {/* Edit/Create Modal */}
      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>{edit.id ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</h2>
              <button className="modal-close" onClick={() => setEdit(null)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-field"><label>מספר</label><input value={edit.num || ''} onChange={e => setEdit(p => ({ ...p, num: e.target.value }))} dir="ltr" /></div>
              <div className="form-field"><label>שם קטגוריה *</label><input value={edit.name || ''} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div className="form-field"><label>תיאור</label><textarea value={edit.description || ''} onChange={e => setEdit(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>ביטול</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                  {(createMut.isPending || updateMut.isPending) ? 'שומר...' : edit.id ? 'עדכון' : 'יצירה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete */}
      {del && (
        <div className="modal-overlay" onClick={() => setDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת קטגוריה</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את <strong>{del.name}</strong>?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={async () => { await deleteMut.mutateAsync(del.id); setDel(null); }}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirm && <BulkDeleteConfirm count={selectedIds.size} entityName="קטגוריות" onConfirm={handleBulkDelete} onCancel={() => setBulkConfirm(false)} isDeleting={bulkDeleteMut.isPending} />}
    </div>
  );
}
