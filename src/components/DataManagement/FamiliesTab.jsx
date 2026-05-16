import React, { useState, useRef, useMemo } from 'react';
import { useFamilies, useCreateFamily, useUpdateFamily, useDeleteFamily, useBulkDeleteFamilies, useCategories, useConditions, useFamilyLevels } from '../../hooks/useDataManagement';
import { computeFamilyDepth, getDescendantFamilyIds, getFamilyLevelLabel, getNextChildOrder, formatChildNum, getEffectiveCategoryId } from '../../utils/familyHierarchy';
import { Icon, ICONS } from '../../utils/icons';
import { exportToCSV, importCSV, findColumn } from '../../utils/exportCSV';
import { BulkDeleteBar, BulkDeleteConfirm, SelectCheckbox } from './BulkDeleteBar';
import '../Customers/CustomerModal.css';

const FAMILY_TYPES = [['onetime', 'חד"פ'], ['recurring', 'שוטף']];
const emptyRow = () => ({ famCode: '', famName: '', famType: 'חד"פ', parentCode: '' });

export default function FamiliesTab() {
  const { data, isLoading } = useFamilies();
  const { data: catData } = useCategories();
  const { data: levelData } = useFamilyLevels();
  const createMut = useCreateFamily();
  const updateMut = useUpdateFamily();
  const { data: condData } = useConditions();
  const deleteMut = useDeleteFamily();
  const bulkDeleteMut = useBulkDeleteFamilies();
  const [expandedId, setExpandedId] = useState(null);
  const conditions = condData?.data || [];
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState([emptyRow()]);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const families = data?.data || [];
  const categories = catData?.data || [];
  const levelDefs = levelData?.data || [];
  const getCatName = (id) => categories.find(c => c.id === id)?.name || '—';
  const getFamilyName = (id) => families.find(f => f.id === id)?.name || '—';

  // For the parent_family_id selector while editing: exclude self + descendants (cycle prevention).
  const allowedParentFamilies = useMemo(() => {
    if (!edit) return families;
    if (!edit.id) return families;
    const blocked = getDescendantFamilyIds(edit.id, families);
    blocked.add(edit.id);
    return families.filter(f => !blocked.has(f.id));
  }, [edit, families]);

  const items = families.filter(f =>
    !search || (f.name || '').includes(search) || (f.num || '').includes(search)
  );

  const toggleSel = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(p => p.size === items.length ? new Set() : new Set(items.map(i => i.id)));
  const handleBulkDelete = async () => { await bulkDeleteMut.mutateAsync([...selectedIds]); setSelectedIds(new Set()); setBulkConfirm(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!edit.name?.trim()) { alert('שם משפחה הוא שדה חובה'); return; }
    if (edit.id) await updateMut.mutateAsync({ id: edit.id, ...edit });
    else await createMut.mutateAsync(edit);
    setEdit(null);
  };

  // Import row helpers
  const updRow = (i, k, v) => setImportRows(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const removeRow = (i) => setImportRows(p => p.filter((_, j) => j !== i));

  // Paste from Excel
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return;
    const rows = lines.map(line => {
      const cols = line.split('\t');
      return {
        famCode: (cols[0] || '').trim(),
        famName: (cols[1] || '').trim(),
        famType: (cols[2] || '').trim() || 'חד"פ',
        parentCode: (cols[3] || '').trim(),
      };
    }).filter(r => r.famName);
    if (rows.length) setImportRows(rows);
  };

  // File import
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { rows } = await importCSV(file);
      const mapped = rows.map(row => ({
        famCode: findColumn(row, ['קוד משפחה', 'מספר', 'קוד', 'num', 'code']) || '',
        famName: findColumn(row, ['שם משפחת מוצר', 'שם משפחה', 'שם', 'name', 'משפחה']) || '',
        famType: findColumn(row, ['סוג משפחה', 'סוג', 'type']) || 'חד"פ',
        parentCode: findColumn(row, ['קוד קטגורית אב', 'קטגוריית אב', 'קטגוריה', 'category']) || '',
      })).filter(r => r.famName);
      if (mapped.length) setImportRows(mapped);
    } catch (err) { alert('שגיאה בקריאת הקובץ: ' + err.message); }
    e.target.value = '';
  };

  // Download template
  const downloadTemplate = () => {
    exportToCSV(
      [{ famCode: '1001', famName: 'תקשורת נתונים', famType: 'שוטף', parentCode: '10' }],
      ['famCode', 'famName', 'famType', 'parentCode'],
      ['קוד משפחה', 'שם משפחת מוצר', 'סוג משפחה (חד"פ / שוטף)', 'קוד קטגורית אב'],
      'families_template'
    );
  };

  // Do import
  const doImport = async () => {
    const validRows = importRows.filter(r => r.famName.trim());
    if (!validRows.length) { alert('אין שורות לייבוא'); return; }

    let added = 0, skipped = 0, errors = [];
    for (const row of validRows) {
      const family_type = row.famType.includes('שוטף') || row.famType.toLowerCase().includes('recurring') ? 'recurring' : 'onetime';
      const cat = row.parentCode ? categories.find(c =>
        String(c.num) === String(row.parentCode) || c.name === row.parentCode
      ) : null;
      try {
        await createMut.mutateAsync({
          name: row.famName.trim(),
          num: row.famCode.trim() || null,
          family_type,
          parent_cat_id: cat?.id || null,
        });
        added++;
      } catch (err) {
        skipped++;
        if (errors.length < 5) errors.push(`${row.famName}: ${err.message}`);
      }
    }
    setImportResult({ added, skipped, errors });
    if (added > 0) setImportRows([emptyRow()]);
  };

  return (
    <div>
      <div className="dm-table-header">
        <h3>משפחות מוצר ({items.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, width: 180 }} />
          <button className="btn btn-secondary" onClick={() => {
            const exportData = families.map(f => ({ ...f, parentCatName: getCatName(f.parent_cat_id), familyTypeLabel: f.family_type === 'recurring' ? 'שוטף' : 'חד"פ' }));
            exportToCSV(exportData, ['num', 'name', 'familyTypeLabel', 'parentCatName'], ['מספר', 'שם משפחה', 'סוג משפחה', 'קטגוריית אב'], 'families');
          }} style={{ fontSize: 12 }}>יצוא</button>
          <button className={`btn ${showImport ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowImport(p => !p)} style={{ fontSize: 12 }}>
            ייבוא משפחות
          </button>
          <button className="btn btn-primary" onClick={() => setEdit({ num: '', name: '', family_type: 'onetime', parent_cat_id: '' })} style={{ fontSize: 12 }}>
            <Icon svg={ICONS.plus} size={14} /> משפחה חדשה
          </button>
        </div>
      </div>

      {/* Import Panel */}
      {showImport && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>ייבוא משפחות מוצר מ-Excel</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>ניתן להדביק מ-Excel ישירות לתא הראשון, או לטעון קובץ</div>
            </div>
            <input type="file" ref={fileRef} onChange={handleFile} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>בחר קובץ</button>
            <button className="btn btn-ghost" onClick={downloadTemplate} style={{ fontSize: 12 }}>הורד תבנית</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="dm-table">
              <thead><tr>
                <th style={{ width: 36 }}>#</th>
                <th>קוד משפחה</th>
                <th>שם משפחת מוצר</th>
                <th>סוג משפחה</th>
                <th>קוד קטגורית אב</th>
                <th style={{ width: 36 }}></th>
              </tr></thead>
              <tbody>
                {importRows.map((r, i) => (
                  <tr key={i} onPaste={i === 0 ? handlePaste : undefined}>
                    <td style={{ color: 'var(--text-3)', fontSize: 11, textAlign: 'center' }}>{i + 1}</td>
                    <td><input value={r.famCode} onChange={e => updRow(i, 'famCode', e.target.value)} placeholder="לדוגמה: 1001" dir="ltr"
                      style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} /></td>
                    <td><input value={r.famName} onChange={e => updRow(i, 'famName', e.target.value)} placeholder="שם משפחת מוצר"
                      style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} /></td>
                    <td>
                      <select value={r.famType} onChange={e => updRow(i, 'famType', e.target.value)}
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}>
                        <option value='חד"פ'>חד"פ</option>
                        <option value="שוטף">שוטף</option>
                      </select>
                    </td>
                    <td><input value={r.parentCode} onChange={e => updRow(i, 'parentCode', e.target.value)} placeholder="קוד קטגוריית אב" dir="ltr"
                      style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} /></td>
                    <td style={{ textAlign: 'center' }}>
                      {importRows.length > 1 && (
                        <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16 }} aria-label="הסר שורה"><i className="ti ti-x" aria-hidden="true" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={() => setImportRows(p => [...p, emptyRow()])} style={{ fontSize: 12 }}>+ שורה</button>
            <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1 }}>ניתן להדביק מ-Excel ישירות לתא הראשון</span>
            <button className="btn btn-primary" onClick={doImport} disabled={createMut.isPending} style={{ fontSize: 12 }}>
              ייבא {importRows.filter(r => r.famName.trim()).length} משפחות
            </button>
          </div>

          {importResult && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: importResult.errors.length ? '#F59E0B11' : '#10B98111',
              border: `1px solid ${importResult.errors.length ? '#F59E0B33' : '#10B98133'}`, fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: importResult.errors.length ? '#F59E0B' : '#10B981' }}>
                נוספו {importResult.added} משפחות{importResult.skipped > 0 ? ` | דולגו ${importResult.skipped}` : ''}
              </div>
              {importResult.errors.map((e, i) => (
                <div key={i} style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <BulkDeleteBar selectedCount={selectedIds.size} totalCount={items.length} onSelectAll={toggleAll} onClear={() => setSelectedIds(new Set())} onDelete={() => setBulkConfirm(true)} isDeleting={bulkDeleteMut.isPending} />

      {isLoading ? <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>טוען...</p> : (
        <table className="dm-table">
          <thead><tr>
            <th style={{ width: 36 }}><SelectCheckbox checked={selectedIds.size === items.length && items.length > 0} onChange={toggleAll} /></th>
            <th style={{ width: 90 }}>מספר</th><th>שם משפחה</th><th style={{ width: 130 }}>רמה</th><th style={{ width: 100 }}>סוג</th><th>הורה</th><th style={{ width: 80 }}>פעולות</th>
          </tr></thead>
          <tbody>
            {items.map(f => {
              const isExpanded = expandedId === f.id;
              // Find conditions linked to this family via family_ids or product_family_id
              const linkedConds = conditions.filter(c => {
                if (c.product_family_id === f.id) return true;
                const fids = Array.isArray(c.family_ids) ? c.family_ids : (typeof c.family_ids === 'string' ? (() => { try { return JSON.parse(c.family_ids); } catch { return []; } })() : []);
                return fids.includes(f.id);
              });
              return (
                <React.Fragment key={f.id}>
                  <tr style={{ background: selectedIds.has(f.id) ? 'var(--accent-light)' : isExpanded ? '#FFFBF0' : '', cursor: 'pointer' }}
                    onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                    <td onClick={e => e.stopPropagation()}><SelectCheckbox checked={selectedIds.has(f.id)} onChange={() => toggleSel(f.id)} /></td>
                    <td style={{ fontWeight: 700, color: '#F59E0B' }}>{f.num || '—'}</td>
                    <td style={{ fontWeight: 600 }}>
                      {f.name}
                      {linkedConds.length > 0 && <span style={{ color: 'var(--accent)', fontSize: 11, marginRight: 6 }}>({linkedConds.length} תנאים)</span>}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{getFamilyLevelLabel(f, families, levelDefs)}</td>
                    <td><span className={`badge ${f.family_type === 'recurring' ? 'badge-info' : 'badge-accent'}`}>
                      {f.family_type === 'recurring' ? 'שוטף' : 'חד"פ'}</span></td>
                    <td>{f.parent_family_id ? <span style={{ color: 'var(--accent)' }}><i className="ti ti-folder" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> {getFamilyName(f.parent_family_id)}</span> : (f.parent_cat_id ? <span style={{ color: 'var(--text-2)' }}><i className="ti ti-folder" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> {getCatName(f.parent_cat_id)}</span> : '—')}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="table-actions">
                        <button className="action-btn edit" onClick={() => setEdit({ ...f })} title="ערוך"><i className="ti ti-edit" aria-hidden="true" /></button>
                        <button className="action-btn delete" onClick={() => setDel(f)} title="מחק"><i className="ti ti-trash" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} style={{ background: '#FFFBF0', padding: '14px 20px', borderBottom: '2px solid #F59E0B' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: 8 }}>
                          תנאים משויכים ל-{f.name} ({linkedConds.length})
                        </div>
                        {linkedConds.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {[...linkedConds].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((c, idx) => (
                              <div key={c.id} style={{
                                padding: '12px 16px', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                borderBottom: '1px solid var(--border-light)',
                                borderRight: '3px solid #3B82F6',
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ background: '#3B82F622', color: '#3B82F6', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                                      {c.cond_num || idx + 1}
                                    </span>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{c.name}</span>
                                  </div>
                                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>סדר: {c.display_order || 0}</span>
                                </div>
                                {c.content && (
                                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', paddingRight: 34 }}>
                                    {c.content}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>אין תנאים משויכים למשפחה זו</span>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {items.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>אין משפחות</td></tr>}
          </tbody>
        </table>
      )}

      {/* Edit/Create Modal */}
      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>{edit.id ? 'עריכת משפחה' : 'משפחה חדשה'}</h2>
              <button className="modal-close" onClick={() => setEdit(null)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-field"><label>מספר</label><input value={edit.num || ''} onChange={e => setEdit(p => ({ ...p, num: e.target.value }))} dir="ltr" /></div>
              <div className="form-field"><label>שם משפחה *</label><input value={edit.name || ''} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div className="form-field">
                <label>סוג משפחה</label>
                <select value={edit.family_type || 'onetime'} onChange={e => setEdit(p => ({ ...p, family_type: e.target.value }))}>
                  {FAMILY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>קטגוריית אב</label>
                {edit.parent_family_id ? (() => {
                  const effId = getEffectiveCategoryId(edit, families);
                  const eff = effId ? categories.find(c => c.id === effId) : null;
                  return (
                    <input
                      readOnly
                      value={eff ? `${eff.num ? `${eff.num} — ` : ''}${eff.name}` : '— ללא קטגוריה (תורש דרך משפחת אב) —'}
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
                      title="הקטגוריה נגזרת ממשפחת האב"
                    />
                  );
                })() : (
                  <select value={edit.parent_cat_id || ''} onChange={e => setEdit(p => ({ ...p, parent_cat_id: e.target.value }))}>
                    <option value="">-- ללא --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.num ? `${c.num} — ` : ''}{c.name}</option>)}
                  </select>
                )}
                <small style={{ color: 'var(--text-3)', fontSize: 11 }}>
                  {edit.parent_family_id ? 'הקטגוריה נגזרת אוטומטית ממשפחת האב' : 'אם תבחר משפחת אב למטה — קטגוריה תקבע אוטומטית מההורה'}
                </small>
              </div>
              <div className="form-field">
                <label>משפחת אב (לבניית תת־משפחות)</label>
                <select value={edit.parent_family_id || ''} onChange={e => {
                  const pid = e.target.value;
                  const parent = pid ? families.find(f => f.id === pid) : null;
                  setEdit(p => {
                    const next = {
                      ...p,
                      parent_family_id: pid || null,
                      parent_cat_id: parent ? null : p.parent_cat_id,
                      family_type: parent?.family_type || p.family_type,
                    };
                    // Auto-number sub-family on creation if num field is empty/auto-suggested
                    if (!p.id && parent) {
                      const order = getNextChildOrder(parent.id, null, families);
                      const autoNum = formatChildNum(parent.num, order);
                      if (autoNum) {
                        next.num = autoNum;
                        next.display_order = order;
                      }
                    }
                    return next;
                  });
                }}>
                  <option value="">-- ללא (משפחה ברמה ראשית) --</option>
                  {allowedParentFamilies.map(f => {
                    const d = computeFamilyDepth(f, families);
                    return <option key={f.id} value={f.id}>{'— '.repeat(d - 1)}{f.num ? `${f.num} ` : ''}{f.name}</option>;
                  })}
                </select>
              </div>
              <div className="form-field">
                <label>תווית רמה (אופציונלי, דורסת את שם הרמה הגלובלי)</label>
                <input value={edit.level_label || ''} onChange={e => setEdit(p => ({ ...p, level_label: e.target.value }))} placeholder='לדוגמה: "תת־קבוצת מוצרים טכנית"' />
              </div>
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

      {/* Delete single */}
      {del && (
        <div className="modal-overlay" onClick={() => setDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת משפחה</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את <strong>{del.name}</strong>?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={async () => { await deleteMut.mutateAsync(del.id); setDel(null); }}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete */}
      {bulkConfirm && <BulkDeleteConfirm count={selectedIds.size} entityName="משפחות" onConfirm={handleBulkDelete} onCancel={() => setBulkConfirm(false)} isDeleting={bulkDeleteMut.isPending} />}
    </div>
  );
}
