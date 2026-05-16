import { useState, useRef } from 'react';
import { useManufacturers, useCreateManufacturer, useDeleteManufacturer, useBulkDeleteManufacturers } from '../../hooks/useDataManagement';
import { BulkDeleteBar, BulkDeleteConfirm, SelectCheckbox } from './BulkDeleteBar';
import { Icon, ICONS } from '../../utils/icons';
import { exportToCSV, importCSV, findColumn } from '../../utils/exportCSV';
import '../Customers/CustomerModal.css';

export default function ManufacturersTab() {
  const { data, isLoading } = useManufacturers();
  const createMut = useCreateManufacturer();
  const deleteMut = useDeleteManufacturer();
  const bulkDeleteMut = useBulkDeleteManufacturers();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const toggleSel = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(p => p.size === items.length ? new Set() : new Set(items.map(i => i.id)));
  const handleBulkDelete = async () => { await bulkDeleteMut.mutateAsync([...selectedIds]); setSelectedIds(new Set()); setBulkConfirm(false); };
  const [search, setSearch] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const items = (data?.data || []).filter(m =>
    !search || (m.name || '').includes(search)
  );

  // Auto-generate next manufacturer number (M001, M002, ...)
  const genNextNum = () => {
    const allItems = data?.data || [];
    const nums = allItems.map(m => {
      const match = (m.num || '').match(/M(\d+)/i);
      return match ? parseInt(match[1]) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'M' + String(max + 1).padStart(3, '0');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!edit.name?.trim()) { alert('שם יצרן הוא שדה חובה'); return; }
    const toSave = { ...edit };
    if (!toSave.num) toSave.num = genNextNum();
    await createMut.mutateAsync(toSave);
    setEdit(null);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { headers, rows } = await importCSV(file);
      console.log('[Manufacturers Import] Headers:', headers, 'Rows:', rows.length);

      // Calculate starting auto-number (M001, M002, ...)
      const allItems = data?.data || [];
      let nextSeq = Math.max(0, ...allItems.map(m => {
        const match = (m.num || '').match(/M(\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })) + 1;

      let created = 0, skipped = 0, errors = [];
      for (const row of rows) {
        const name = findColumn(row, ['שם יצרן', 'שם', 'name', 'יצרן', 'manufacturer']);
        let num = findColumn(row, ['מספר יצרן', 'מספר', 'num', 'קוד', 'code']);

        if (!name.trim()) { skipped++; continue; }

        // Auto-generate number if not provided (M001, M002, ...)
        if (!num.trim()) {
          num = 'M' + String(nextSeq).padStart(3, '0');
          nextSeq++;
        }

        try {
          await createMut.mutateAsync({ name: name.trim(), num: num.trim() });
          created++;
        } catch (err) {
          skipped++;
          if (errors.length < 3) errors.push(`${name}: ${err.message}`);
        }
      }

      let msg = `יובאו ${created} יצרנים, ${skipped} דולגו`;
      if (errors.length > 0) msg += ` | שגיאות: ${errors.join(', ')}`;
      setImportResult(msg);
      setTimeout(() => setImportResult(null), 8000);
    } catch (err) {
      alert('שגיאה ביבוא: ' + err.message);
    }
    e.target.value = '';
  };

  return (
    <div>
      <div className="dm-table-header">
        <h3>יצרנים ({items.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, width: 180 }} />
          <button className="btn btn-secondary" onClick={() => exportToCSV(items, ['num', 'name'], ['מספר יצרן', 'שם יצרן'], 'manufacturers')} style={{ fontSize: 12 }}>
            יצוא
          </button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>
            יבוא
          </button>
          <input type="file" ref={fileRef} onChange={handleImport} accept=".csv,.xlsx,.xls,.txt" style={{ display: 'none' }} />
          <button className="btn btn-primary" onClick={() => setEdit({ name: '', num: '' })} style={{ fontSize: 12 }}>
            <Icon svg={ICONS.plus} size={14} /> יצרן חדש
          </button>
        </div>
      </div>

      {importResult && (
        <div style={{ background: '#10B98122', border: '1px solid #10B98144', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#10B981', fontWeight: 600 }}>
          {importResult}
        </div>
      )}

      <BulkDeleteBar selectedCount={selectedIds.size} totalCount={items.length} onSelectAll={toggleAll} onClear={() => setSelectedIds(new Set())} onDelete={() => setBulkConfirm(true)} isDeleting={bulkDeleteMut.isPending} />

      {isLoading ? <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>טוען...</p> : (
        <table className="dm-table">
          <thead><tr>
            <th style={{ width: 36 }}><SelectCheckbox checked={selectedIds.size === items.length && items.length > 0} onChange={toggleAll} /></th>
            <th style={{ width: 90 }}>מספר</th><th>שם יצרן</th><th style={{ width: 60 }}>פעולות</th>
          </tr></thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id} style={{ background: selectedIds.has(m.id) ? 'var(--accent-light)' : '' }}>
                <td><SelectCheckbox checked={selectedIds.has(m.id)} onChange={() => toggleSel(m.id)} /></td>
                <td style={{ fontWeight: 700, color: '#7C3AED' }}>{m.num || '—'}</td>
                <td style={{ fontWeight: 600 }}>{m.name}</td>
                <td>
                  <button className="action-btn delete" onClick={() => setDel(m)} title="מחק"><i className="ti ti-trash" aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>אין יצרנים</td></tr>}
          </tbody>
        </table>
      )}

      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>יצרן חדש</h2>
              <button className="modal-close" onClick={() => setEdit(null)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-field"><label>מספר יצרן (אוטומטי אם ריק)</label><input value={edit.num || ''} onChange={e => setEdit(p => ({ ...p, num: e.target.value }))} dir="ltr" placeholder="ממולא אוטומטית" /></div>
              <div className="form-field"><label>שם יצרן *</label><input value={edit.name || ''} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>ביטול</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>{createMut.isPending ? 'שומר...' : 'יצירה'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {del && (
        <div className="modal-overlay" onClick={() => setDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת יצרן</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את <strong>{del.name}</strong>?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={async () => { await deleteMut.mutateAsync(del.id); setDel(null); }}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirm && <BulkDeleteConfirm count={selectedIds.size} entityName="יצרנים" onConfirm={handleBulkDelete} onCancel={() => setBulkConfirm(false)} isDeleting={bulkDeleteMut.isPending} />}
    </div>
  );
}
