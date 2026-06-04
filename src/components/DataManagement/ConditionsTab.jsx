import React, { useState, useRef, useMemo } from 'react';
import { useConditions, useCreateCondition, useUpdateCondition, useDeleteCondition, useFamilies } from '../../hooks/useDataManagement';
import { Icon, ICONS } from '../../utils/icons';
import { exportToCSV, importCSV, findColumn } from '../../utils/exportCSV';
import { BulkDeleteBar, BulkDeleteConfirm, SelectCheckbox } from './BulkDeleteBar';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import '../Customers/CustomerModal.css';

const COND_POSITIONS = [
  ['', '— ללא הגדרה —'],
  ['first', 'תנאי ראשון מההתחלה'], ['second', 'תנאי שני מההתחלה'],
  ['third', 'תנאי שלישי מההתחלה'], ['fourth', 'תנאי רביעי מההתחלה'],
  ['fifth', 'תנאי חמישי מההתחלה'], ['sixth', 'תנאי שישי מההתחלה'],
  ['sixth_to_last', 'תנאי שישי מהסוף'], ['fifth_to_last', 'תנאי חמישי מהסוף'],
  ['fourth_to_last', 'תנאי רביעי מהסוף'], ['third_to_last', 'תנאי שלישי מהסוף'],
  ['second_to_last', 'תנאי שני מהסוף'], ['last', 'תנאי אחרון'],
];

const SUB_TABS = [
  { id: 'terms', label: 'תנאים' },
  { id: 'families', label: 'שיוך למשפחות' },
  { id: 'import', label: 'יבוא תנאים' },
  { id: 'settings', label: 'הגדרות מיקום' },
];

function useBulkDeleteConditions() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids) => api.post('/api/conditions/bulk-delete', { ids }), onSuccess: () => qc.invalidateQueries({ queryKey: ['conditions'] }) });
}

export default function ConditionsTab({ readOnly = false }) {
  const { data, isLoading } = useConditions();
  const { data: famData } = useFamilies();
  const createMut = useCreateCondition();
  const updateMut = useUpdateCondition();
  const deleteMut = useDeleteCondition();
  const bulkDeleteMut = useBulkDeleteConditions();

  const [subTab, setSubTab] = useState('terms');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const conditions = data?.data || [];
  const families = famData?.data || [];
  const getFamName = (id) => families.find(f => f.id === id)?.name || '—';

  // Position priority mapping (same as original app)
  const posPriority = (p) => ({
    first:1, second:2, third:3, fourth:4, fifth:5, sixth:6,
    sixth_to_last:9994, fifth_to_last:9995, fourth_to_last:9996,
    third_to_last:9997, second_to_last:9998, last:9999,
  })[p] || 5000;

  const items = conditions
    .filter(c => !search || (c.name || '').includes(search) || (c.cond_num || '').includes(search) || (c.content || '').includes(search))
    .sort((a, b) => {
      const ap = posPriority(a.cond_position);
      const bp = posPriority(b.cond_position);
      if (ap !== bp) return ap - bp;
      return (a.display_order || 0) - (b.display_order || 0);
    });

  const toggleSel = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(p => p.size === items.length ? new Set() : new Set(items.map(i => i.id)));
  const handleBulkDelete = async () => { await bulkDeleteMut.mutateAsync([...selectedIds]); setSelectedIds(new Set()); setBulkConfirm(false); };

  // Auto-gen condNum
  const genCondNum = () => {
    const nums = conditions.map(c => { const m = (c.cond_num || '').match(/T-(\d+)/); return m ? parseInt(m[1]) : 0; });
    return 'T-' + String(Math.max(0, ...nums) + 1).padStart(4, '0');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!edit.name?.trim()) { alert('שם תנאי הוא שדה חובה'); return; }
    const toSave = { ...edit };
    if (!toSave.cond_num) toSave.cond_num = genCondNum();
    if (edit.id) await updateMut.mutateAsync({ id: edit.id, ...toSave });
    else await createMut.mutateAsync(toSave);
    setEdit(null);
  };

  // Export
  const handleExport = () => {
    const exportData = conditions.map(c => ({
      ...c,
      familyName: getFamName(c.product_family_id),
      posLabel: (COND_POSITIONS.find(([k]) => k === c.cond_position) || ['', ''])[1],
    }));
    exportToCSV(exportData, ['cond_num', 'name', 'content', 'familyName', 'display_order', 'posLabel'],
      ['מספר תנאי', 'שם התנאי', 'תיאור', 'משפחת מוצר', 'סדר הצגה', 'מיקום קבוע'], 'conditions');
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: subTab === t.id ? 600 : 400,
              color: subTab === t.id ? 'var(--accent)' : 'var(--text-2)',
              borderBottom: subTab === t.id ? '2px solid var(--accent)' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Terms Tab ──────────────────────────────────────────────── */}
      {subTab === 'terms' && (
        <>
          <div className="dm-table-header">
            <h3>תנאים כלליים ({items.length})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, width: 180 }} />
              <button className="btn btn-secondary" onClick={handleExport} style={{ fontSize: 12 }}>יצוא</button>
              {!readOnly && (
                <button className="btn btn-primary" onClick={() => setEdit({ cond_num: '', name: '', content: '', product_family_id: '', display_order: 0 })} style={{ fontSize: 12 }}>
                  <Icon svg={ICONS.plus} size={14} /> תנאי חדש
                </button>
              )}
            </div>
          </div>

          {!readOnly && <BulkDeleteBar selectedCount={selectedIds.size} totalCount={items.length} onSelectAll={toggleAll} onClear={() => setSelectedIds(new Set())} onDelete={() => setBulkConfirm(true)} isDeleting={bulkDeleteMut.isPending} />}

          {isLoading ? <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>טוען...</p> : (
            <table className="dm-table">
              <thead><tr>
                <th style={{ width: 36 }}><SelectCheckbox checked={selectedIds.size === items.length && items.length > 0} onChange={toggleAll} /></th>
                <th style={{ width: 60 }}>מספר</th><th style={{ width: 120 }}>סדר</th><th>שם התנאי</th>
                <th>תיאור</th><th style={{ width: 180 }}>משפחות מוצר</th>
                <th style={{ width: 80 }}>פעולות</th>
              </tr></thead>
              <tbody>
                {items.map(c => {
                  const isExpanded = expandedId === c.id;
                  // Find ALL families linked to this condition (from family_ids array or product_family_id)
                  const famIds = Array.isArray(c.family_ids) ? c.family_ids : (typeof c.family_ids === 'string' ? (() => { try { return JSON.parse(c.family_ids); } catch { return []; } })() : []);
                  const allFamIds = [...new Set([...famIds, ...(c.product_family_id ? [c.product_family_id] : [])])];
                  const linkedFams = allFamIds.map(id => families.find(f => f.id === id)).filter(Boolean);
                  const famDisplay = linkedFams.length > 0
                    ? linkedFams.map(f => f.name).join(', ')
                    : '—';
                  return (
                    <React.Fragment key={c.id}>
                      <tr style={{ background: selectedIds.has(c.id) ? 'var(--accent-light)' : isExpanded ? '#F0F0FF' : '', cursor: 'pointer' }}
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                        <td onClick={e => e.stopPropagation()}><SelectCheckbox checked={selectedIds.has(c.id)} onChange={() => toggleSel(c.id)} /></td>
                        <td style={{ fontWeight: 700, color: '#3B82F6', fontSize: 12 }}>{c.cond_num || '—'}</td>
                        <td style={{ textAlign: 'center', fontSize: 11 }}>
                          {c.cond_position
                            ? <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 600 }}>
                                {(COND_POSITIONS.find(([k]) => k === c.cond_position) || ['', '—'])[1]}
                              </span>
                            : <span style={{ color: 'var(--text-3)' }}>{c.display_order || 0}</span>
                          }
                        </td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{(c.content || '').substring(0, 60)}{(c.content || '').length > 60 ? '...' : ''}</td>
                        <td style={{ fontSize: 12 }}>
                          {linkedFams.length > 0
                            ? <span title={famDisplay}>
                                {linkedFams[0].name}{linkedFams.length > 1 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> +{linkedFams.length - 1}</span>}
                              </span>
                            : '—'}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {!readOnly && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => setEdit({ ...c })} title="ערוך"
                                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #BFDBFE', background: 'transparent', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                                <i className="ti ti-edit" aria-hidden="true" />
                              </button>
                              <button onClick={() => setDel(c)} title="מחק"
                                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #FECACA', background: 'transparent', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                                <i className="ti ti-trash" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ background: '#FAFAFF', padding: '16px 20px', borderBottom: '2px solid var(--accent)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>תיאור מלא</div>
                                <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                  {c.content || 'אין תיאור'}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>
                                  משפחות מוצר משויכות ({linkedFams.length})
                                </div>
                                {linkedFams.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {linkedFams.map(f => (
                                      <span key={f.id} style={{
                                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                        background: '#F59E0B22', color: '#F59E0B',
                                      }}>{f.num ? `${f.num} — ` : ''}{f.name}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>לא משויך למשפחת מוצר</span>
                                )}
                                <div style={{ marginTop: 12 }}>
                                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>פרטים</div>
                                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                    מספר: <strong style={{ color: '#3B82F6' }}>{c.cond_num || '—'}</strong>
                                    {' | '}סדר הצגה: <strong>{c.display_order || 0}</strong>
                                    {c.cond_position && <>{' | '}מיקום: <strong style={{ color: 'var(--accent)' }}>{(COND_POSITIONS.find(([k]) => k === c.cond_position) || ['', '—'])[1]}</strong></>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {items.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>אין תנאים</td></tr>}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── Families Tab ───────────────────────────────────────────── */}
      {subTab === 'families' && <FamiliesLinkTab conditions={conditions} families={families} updateMut={updateMut} readOnly={readOnly} />}

      {/* ── Import Tab ─────────────────────────────────────────────── */}
      {subTab === 'import' && <ImportTab conditions={conditions} families={families} createMut={createMut} genCondNum={genCondNum} />}

      {/* ── Settings Tab ───────────────────────────────────────────── */}
      {subTab === 'settings' && <SettingsCondTab conditions={conditions} updateMut={updateMut} />}

      {/* Edit/Create Modal */}
      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{edit.id ? 'עריכת תנאי' : 'תנאי חדש'}</h2>
              <button className="modal-close" onClick={() => setEdit(null)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label>מספר תנאי</label>
                  <input value={edit.cond_num || ''} onChange={e => setEdit(p => ({ ...p, cond_num: e.target.value }))} dir="ltr" placeholder="T-0001 (אוטומטי)" />
                </div>
                <div className="form-field">
                  <label>שם התנאי *</label>
                  <input value={edit.name || ''} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))} autoFocus />
                </div>
                <div className="form-field">
                  <label>סדר הצגה</label>
                  <input type="number" value={edit.display_order || 0} onChange={e => setEdit(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} dir="ltr" min="0" />
                </div>
                <div className="form-field">
                  <label>הוסף משפחת מוצר</label>
                  <select value="" onChange={e => {
                    if (!e.target.value) return;
                    const fid = e.target.value;
                    setEdit(p => {
                      const ids = Array.isArray(p.family_ids) ? [...p.family_ids] : (typeof p.family_ids === 'string' ? (() => { try { return JSON.parse(p.family_ids); } catch { return []; } })() : []);
                      if (!ids.includes(fid)) ids.push(fid);
                      return { ...p, family_ids: ids, product_family_id: p.product_family_id || fid };
                    });
                    e.target.value = '';
                  }}>
                    <option value="">-- בחר משפחה להוספה --</option>
                    {families.filter(f => {
                      const ids = Array.isArray(edit.family_ids) ? edit.family_ids : (typeof edit.family_ids === 'string' ? (() => { try { return JSON.parse(edit.family_ids); } catch { return []; } })() : []);
                      return !ids.includes(f.id);
                    }).map(f => <option key={f.id} value={f.id}>{f.num ? `${f.num} — ` : ''}{f.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Linked families display */}
              {(() => {
                const ids = Array.isArray(edit.family_ids) ? edit.family_ids : (typeof edit.family_ids === 'string' ? (() => { try { return JSON.parse(edit.family_ids); } catch { return []; } })() : []);
                const linked = ids.map(id => families.find(f => f.id === id)).filter(Boolean);
                return linked.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, marginBottom: 6, display: 'block' }}>
                      משפחות מוצר משויכות ({linked.length})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {linked.map(f => (
                        <span key={f.id} style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: '#F59E0B22', color: '#F59E0B', display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                          {f.num ? `${f.num} — ` : ''}{f.name}
                          <button type="button" onClick={() => {
                            setEdit(p => {
                              const newIds = ids.filter(id => id !== f.id);
                              return { ...p, family_ids: newIds, product_family_id: newIds[0] || null };
                            });
                          }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }} aria-label="הסר שיוך"><i className="ti ti-x" aria-hidden="true" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="form-field" style={{ marginTop: 12 }}>
                <label>תיאור / תוכן התנאי</label>
                <textarea value={edit.content || ''} onChange={e => setEdit(p => ({ ...p, content: e.target.value }))} rows={5} style={{ fontSize: 14, lineHeight: 1.6 }} />
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

      {del && (
        <div className="modal-overlay" onClick={() => setDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת תנאי</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את <strong>{del.name}</strong>?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={async () => { await deleteMut.mutateAsync(del.id); setDel(null); }}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirm && <BulkDeleteConfirm count={selectedIds.size} entityName="תנאים" onConfirm={handleBulkDelete} onCancel={() => setBulkConfirm(false)} isDeleting={bulkDeleteMut.isPending} />}
    </div>
  );
}

// ── Families Link Sub-Tab ────────────────────────────────────────────────────

function FamiliesLinkTab({ conditions, families, updateMut, readOnly = false }) {
  const [selFamId, setSelFamId] = useState('');

  const selFamily = families.find(f => f.id === selFamId);
  const linkedConds = selFamily ? conditions.filter(c => c.product_family_id === selFamId).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) : [];
  const unlinkedConds = conditions.filter(c => c.product_family_id !== selFamId);

  const linkCond = async (condId) => {
    await updateMut.mutateAsync({ id: condId, product_family_id: selFamId });
  };
  const unlinkCond = async (condId) => {
    await updateMut.mutateAsync({ id: condId, product_family_id: null });
  };

  return (
    <div>
      <div className="form-field" style={{ maxWidth: 400, marginBottom: 20 }}>
        <label style={{ fontWeight: 600 }}>בחר משפחת מוצר</label>
        <select value={selFamId} onChange={e => setSelFamId(e.target.value)}>
          <option value="">-- בחר משפחה --</option>
          {families.map(f => <option key={f.id} value={f.id}>{f.num ? `${f.num} — ` : ''}{f.name}</option>)}
        </select>
      </div>

      {selFamily && (
        <>
          <h4 style={{ marginBottom: 10 }}>תנאים משויכים ל-{selFamily.name} ({linkedConds.length})</h4>
          {linkedConds.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>אין תנאים משויכים למשפחה זו</p>
          ) : (
            <table className="dm-table" style={{ marginBottom: 16 }}>
              <thead><tr><th style={{ width: 50 }}>#</th><th>שם התנאי</th><th style={{ width: 250 }}>תיאור</th><th style={{ width: 60 }}></th></tr></thead>
              <tbody>
                {linkedConds.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: '#3B82F6' }}>{c.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.content || '—'}</td>
                    <td>{!readOnly && <button className="action-btn delete" onClick={() => unlinkCond(c.id)} title="הסר שיוך"><i className="ti ti-x" aria-hidden="true" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!readOnly && (
            <div className="form-field" style={{ maxWidth: 400 }}>
              <label>הוסף תנאי למשפחה</label>
              <select onChange={e => { if (e.target.value) { linkCond(e.target.value); e.target.value = ''; } }}>
                <option value="">-- בחר תנאי להוספה --</option>
                {unlinkedConds.map(c => <option key={c.id} value={c.id}>{c.cond_num ? `${c.cond_num} — ` : ''}{c.name}</option>)}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Import Sub-Tab ───────────────────────────────────────────────────────────

function ImportTab({ conditions, families, createMut, genCondNum }) {
  const [importRows, setImportRows] = useState([{ condNum: '', condName: '', condContent: '', famCode: '' }]);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const fileRef = useRef(null);
  const qc = useQueryClient();

  const emptyRow = () => ({ condNum: '', condName: '', condContent: '', famCode: '' });
  const updRow = (i, k, v) => setImportRows(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const handlePaste = (e) => {
    e.preventDefault();
    const lines = e.clipboardData.getData('text').trim().split('\n').filter(l => l.trim());
    const rows = lines.map(line => {
      const cols = line.split('\t');
      return { condNum: (cols[0] || '').trim(), condName: (cols[1] || '').trim(), condContent: (cols[2] || '').trim(), famCode: (cols[3] || '').trim() };
    }).filter(r => r.condName);
    if (rows.length) setImportRows(rows);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { rows } = await importCSV(file);
      const mapped = rows.map(row => ({
        condNum: findColumn(row, ['מספר תנאי', "מס' תנאי", 'מספר', 'num']) || '',
        condName: findColumn(row, ['שם התנאי', 'שם תנאי', 'שם', 'name']) || '',
        condContent: findColumn(row, ['תיאור', 'תיאור התנאי', 'תוכן', 'content']) || '',
        famCode: findColumn(row, ['קוד משפחה', 'קודי משפחות', 'קוד', 'משפחה', 'family']) || '',
      })).filter(r => r.condName);
      if (mapped.length) setImportRows(mapped);
    } catch (err) { alert('שגיאה: ' + err.message); }
    e.target.value = '';
  };

  const downloadTemplate = () => {
    exportToCSV(
      [{ condNum: 'T-0001', condName: 'תנאי לדוגמה', condContent: 'תוכן התנאי', famCode: '1001' }],
      ['condNum', 'condName', 'condContent', 'famCode'],
      ['מספר תנאי', 'שם התנאי', 'תיאור התנאי', 'קוד משפחת מוצר'],
      'conditions_template'
    );
  };

  const doImport = async () => {
    const valid = importRows.filter(r => r.condName.trim());
    if (!valid.length) { alert('אין שורות לייבוא'); return; }

    setImporting(true);
    setImportResult(null);
    setProgress(`מייבא 0 מתוך ${valid.length}...`);

    // Calc next num
    const nums = conditions.map(c => { const m = (c.cond_num || '').match(/T-(\d+)/); return m ? parseInt(m[1]) : 0; });
    let nextNum = Math.max(0, ...nums) + 1;

    let added = 0, skipped = 0, errors = [];
    for (let idx = 0; idx < valid.length; idx++) {
      const row = valid[idx];
      let condNum = row.condNum.trim();
      if (!condNum) { condNum = 'T-' + String(nextNum++).padStart(4, '0'); }
      // Split comma-separated family codes and find ALL matches
      let matchedFams = [];
      if (row.famCode) {
        const codes = row.famCode.split(/[,،;]+/).map(s => s.trim()).filter(Boolean);
        let notFound = [];
        for (const code of codes) {
          const f = families.find(f => String(f.num) === code || String(f.num) === code.replace(/-/g, '') || f.name === code);
          if (f && !matchedFams.find(m => m.id === f.id)) matchedFams.push(f);
          else if (!f) notFound.push(code);
        }
        if (idx < 3) console.log(`[Import] "${row.condName}": ${codes.length} codes → ${matchedFams.length} matched, ${notFound.length} not found`, notFound.length <= 5 ? notFound : `(${notFound.length} codes)`);
      }
      const familyIdsArr = matchedFams.map(f => f.id);
      try {
        await api.post('/api/conditions', {
          cond_num: condNum,
          name: row.condName.trim(),
          content: row.condContent.trim() || null,
          product_family_id: matchedFams[0]?.id || null,
          family_ids: familyIdsArr,
          display_order: 0,
        });
        added++;
      } catch (err) {
        skipped++;
        if (errors.length < 5) errors.push(`שורה ${idx + 1} (${row.condName}): ${err.message}`);
      }
      setProgress(`מייבא ${idx + 1} מתוך ${valid.length}... (${added} הצליחו, ${skipped} נכשלו)`);
    }
    setImportResult({ added, skipped, errors, total: valid.length });
    setImporting(false);
    setProgress('');
    if (added > 0) {
      setImportRows([emptyRow()]);
      qc.invalidateQueries({ queryKey: ['conditions'] });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>ייבוא תנאים כלליים מ-Excel</div>
          <div style={{ color: 'var(--text-3)', fontSize: 12 }}>ניתן להדביק מ-Excel ישירות, או לטעון קובץ. מספר תנאי ימולא אוטומטית אם לא הוזן.</div>
        </div>
        <input type="file" ref={fileRef} onChange={handleFile} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>בחר קובץ</button>
        <button className="btn btn-ghost" onClick={downloadTemplate} style={{ fontSize: 12 }}>הורד תבנית</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="dm-table">
          <thead><tr>
            <th style={{ width: 36 }}>#</th>
            <th style={{ width: 100 }}>מספר תנאי</th>
            <th>שם התנאי</th>
            <th>תיאור התנאי</th>
            <th style={{ width: 130 }}>קוד משפחת מוצר</th>
            <th style={{ width: 36 }}></th>
          </tr></thead>
          <tbody>
            {importRows.map((r, i) => (
              <tr key={i} onPaste={i === 0 ? handlePaste : undefined}>
                <td style={{ color: 'var(--text-3)', fontSize: 11, textAlign: 'center' }}>{i + 1}</td>
                <td><input value={r.condNum} onChange={e => updRow(i, 'condNum', e.target.value)} placeholder="אוטומטי" dir="ltr"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} /></td>
                <td><input value={r.condName} onChange={e => updRow(i, 'condName', e.target.value)} placeholder="שם התנאי"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} /></td>
                <td><input value={r.condContent} onChange={e => updRow(i, 'condContent', e.target.value)} placeholder="תיאור"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} /></td>
                <td><input value={r.famCode} onChange={e => updRow(i, 'famCode', e.target.value)} placeholder="קוד משפחה" dir="ltr"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} /></td>
                <td>{importRows.length > 1 && <button onClick={() => setImportRows(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16 }} aria-label="הסר שורה"><i className="ti ti-x" aria-hidden="true" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
        <button className="btn btn-ghost" onClick={() => setImportRows(p => [...p, emptyRow()])} style={{ fontSize: 12 }}>+ שורה</button>
        <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1 }}>ניתן להדביק מ-Excel ישירות לתא הראשון</span>
        <button className="btn btn-primary" onClick={doImport} disabled={importing} style={{ fontSize: 12 }}>
          {importing ? 'מייבא...' : `ייבא ${importRows.filter(r => r.condName.trim()).length} תנאים`}
        </button>
      </div>

      {/* Progress */}
      {progress && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#3B82F611', border: '1px solid #3B82F633', fontSize: 13, color: '#3B82F6', fontWeight: 600 }}>
          {progress}
        </div>
      )}

      {/* Result */}
      {importResult && (
        <div style={{ marginTop: 12, padding: '14px 18px', borderRadius: 10,
          background: importResult.skipped > 0 ? '#F59E0B11' : '#10B98111',
          border: `1px solid ${importResult.skipped > 0 ? '#F59E0B33' : '#10B98133'}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: importResult.added > 0 ? '#10B981' : '#EF4444', marginBottom: 6 }}>
            תוצאות הייבוא
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, marginBottom: importResult.errors.length ? 8 : 0 }}>
            <span>סה"כ בקובץ: <strong>{importResult.total}</strong></span>
            <span style={{ color: '#10B981' }}>יובאו בהצלחה: <strong>{importResult.added}</strong></span>
            {importResult.skipped > 0 && <span style={{ color: '#EF4444' }}>נכשלו: <strong>{importResult.skipped}</strong></span>}
          </div>
          {importResult.errors.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 4 }}>פירוט שגיאות:</div>
              {importResult.errors.map((e, i) => <div key={i} style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>• {e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Settings Sub-Tab ─────────────────────────────────────────────────────────

function SettingsCondTab({ conditions, updateMut }) {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(null);
  const qc = useQueryClient();

  const filtered = conditions.filter(c =>
    !search || (c.name || '').includes(search) || (c.cond_num || '').includes(search)
  );

  const setPosition = async (condId, pos) => {
    setSaving(condId);
    try {
      await api.put(`/api/conditions/${condId}`, { cond_position: pos || null });
      qc.invalidateQueries({ queryKey: ['conditions'] });
    } catch (err) {
      alert('שגיאה בשמירה: ' + err.message);
    }
    setSaving(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 4 }}>הגדרות מיקום תנאים</h4>
        <p style={{ color: 'var(--text-3)', fontSize: 12 }}>
          הגדר מיקום קבוע לתנאים — תנאי עם מיקום קבוע יופיע תמיד במיקום שנקבע בהצעת המחיר.
        </p>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש תנאי..." style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, width: 250, marginBottom: 12 }} />

      <table className="dm-table">
        <thead><tr>
          <th style={{ width: 80 }}>מספר</th>
          <th>שם התנאי</th>
          <th style={{ width: 220 }}>מיקום קבוע</th>
        </tr></thead>
        <tbody>
          {filtered.map(c => (
            <tr key={c.id}>
              <td style={{ fontWeight: 700, color: '#3B82F6', fontSize: 12 }}>{c.cond_num || '—'}</td>
              <td style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</td>
              <td>
                <select value={c.cond_position || ''} onChange={e => setPosition(c.id, e.target.value)}
                  disabled={saving === c.id}
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12,
                    color: c.cond_position ? 'var(--accent)' : 'var(--text-3)', fontWeight: c.cond_position ? 600 : 400,
                    opacity: saving === c.id ? 0.5 : 1 }}>
                  {COND_POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
