/**
 * Form Submissions Aggregation Report — "דוח טפסים דיגיטליים"
 *
 * Two pieces:
 *   - SubmissionsReportBuilder: pick form + columns + (optional) customer filter
 *   - SubmissionsReportRunner:  fetch /api/forms/:id/submissions/full and render
 *
 * Column keys:
 *   _meta:submission_num | _meta:status | _meta:submitter |
 *   _meta:submitted_at   | _meta:date   | _meta:time      |
 *   _meta:linked_customer
 *   field:<field_key>    — one column per form field (label = field.label)
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { ReportPermissionsTab } from './ReportPermissionsTab';
import * as XLSX from 'xlsx';

const META_COLUMNS = [
  { key: '_meta:submission_num',  label: 'מס\' הגשה' },
  { key: '_meta:status',          label: 'סטטוס' },
  { key: '_meta:submitter',       label: 'נשלח על ידי' },
  { key: '_meta:submitted_at',    label: 'תאריך + שעה' },
  { key: '_meta:date',            label: 'תאריך' },
  { key: '_meta:time',            label: 'שעה' },
  { key: '_meta:linked_customer', label: 'לקוח מקושר' },
];

const STATUS_LABEL = {
  draft: 'טיוטה',
  submitted: 'הוגש',
  pending: 'ממתין',
  reviewed: 'נסקר',
  approved: 'אושר',
  rejected: 'נדחה',
};

const DISPLAY_FIELD_TYPES = new Set(['heading', 'paragraph', 'divider', 'spacer', 'logo', 'image_display']);

const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(d); }
};
const fmtDateOnly = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('he-IL'); } catch { return String(d); }
};
const fmtTimeOnly = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  } catch { return String(d); }
};

/**
 * Render one cell for a field given its submission value. Returns a string.
 */
function renderFieldCell(field, value) {
  if (!value) return '';
  const type = field.field_type;

  // Signature
  if (type === 'signature') {
    return value.file_data || value.value_text ? 'חתום' : '—';
  }

  // File / image — count of attachments
  if (type === 'file' || type === 'image') {
    let count = 0;
    if (Array.isArray(value.value_json)) count = value.value_json.length;
    else if (value.file_data) count = 1;
    if (!count) return '—';
    return `${count} ${type === 'image' ? 'תמונות' : 'קבצים'}`;
  }

  // Module lookup → show label
  if (type === 'module_lookup') {
    if (value.value_json && typeof value.value_json === 'object' && value.value_json.label) {
      return value.value_json.label;
    }
    return value.value_text || '';
  }

  // Multi-select
  if (type === 'multi_select' && Array.isArray(value.value_json)) {
    const opts = field.options || [];
    return value.value_json.map(v => {
      const opt = opts.find(o => o.value === v || o.value === String(v));
      return opt?.label || v;
    }).join(', ');
  }

  // Select / radio — map to label
  if (type === 'select' || type === 'radio') {
    const raw = value.value_text;
    const opts = field.options || [];
    const opt = opts.find(o => o.value === raw || o.value === String(raw));
    return opt?.label || raw || '';
  }

  // Checkbox / toggle
  if (type === 'checkbox' || type === 'toggle') {
    const truthy = value.value_text === 'true' || value.value_number === 1;
    return truthy ? 'כן' : 'לא';
  }

  // Rating
  if (type === 'rating') {
    const n = Number(value.value_number ?? value.value_text ?? 0);
    const max = Number(field.validation?.max || 5);
    return `${n} / ${max}`;
  }

  // Slider / number / currency / percentage
  if (type === 'currency') {
    const n = Number(value.value_number ?? value.value_text ?? 0);
    return '₪' + n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (type === 'percentage') {
    return Number(value.value_number ?? value.value_text ?? 0).toFixed(1) + '%';
  }
  if (type === 'number' || type === 'slider') {
    const n = value.value_number ?? value.value_text ?? '';
    return n === '' ? '' : Number(n).toLocaleString('he-IL');
  }

  // Date
  if (type === 'date') return fmtDateOnly(value.value_text);
  if (type === 'datetime') return fmtDateTime(value.value_text);
  if (type === 'time') return value.value_text || '—';

  return String(value.value_text ?? value.value_number ?? '');
}

/**
 * Get the cell value for a given column key.
 */
function getCellValue(colKey, sub, fieldsByKey, valueByFieldKey, customerById) {
  if (colKey.startsWith('_meta:')) {
    const m = colKey.slice(6);
    switch (m) {
      case 'submission_num': return sub.submission_num || sub.id?.slice(0, 8) || '';
      case 'status': return STATUS_LABEL[sub.status] || sub.status || '';
      case 'submitter':
        return (sub.submitted_by_name || '').trim()
          || sub.submitted_by_username
          || sub.submitted_by_email
          || (sub.is_public ? 'משתמש ציבורי' : '—');
      case 'submitted_at': return fmtDateTime(sub.submitted_at || sub.created_at);
      case 'date': return fmtDateOnly(sub.submitted_at || sub.created_at);
      case 'time': return fmtTimeOnly(sub.submitted_at || sub.created_at);
      case 'linked_customer': {
        if (sub.linked_module !== 'customers' || !sub.linked_record_id) return '—';
        const c = customerById.get(sub.linked_record_id);
        return c?.company_name || c?.first_name || sub.linked_record_id.slice(0, 8);
      }
      default: return '';
    }
  }
  if (colKey.startsWith('field:')) {
    const fk = colKey.slice(6);
    const field = fieldsByKey.get(fk);
    if (!field) return '';
    return renderFieldCell(field, valueByFieldKey.get(fk));
  }
  return '';
}

// ─────────────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────────────────────────
export function SubmissionsReportBuilder({ report, users = [], onSave, onCancel }) {
  const [rpt, setRpt] = useState({ joinCustomers: false, viewerProfileIds: [], viewerUserIds: [], ...report });
  const [forms, setForms] = useState([]);
  const [formFull, setFormFull] = useState(null);
  const [tab, setTab] = useState('form');
  const [permSearch, setPermSearch] = useState('');

  // Load form list
  useEffect(() => {
    api.get('/api/forms?limit=500')
      .then(r => setForms((r.data || []).filter(f => f.status !== 'archived')))
      .catch(() => setForms([]));
  }, []);

  // When formId changes, load its fields
  useEffect(() => {
    if (!rpt.formId) { setFormFull(null); return; }
    api.get(`/api/forms/${rpt.formId}/full`)
      .then(setFormFull)
      .catch(() => setFormFull(null));
  }, [rpt.formId]);

  const fields = useMemo(
    () => (formFull?.fields || []).filter(f => !DISPLAY_FIELD_TYPES.has(f.field_type)),
    [formFull]
  );

  const upd = (k, v) => setRpt(p => ({ ...p, [k]: v }));

  const toggleColumn = (key) => {
    const cols = rpt.columns || [];
    upd('columns', cols.includes(key) ? cols.filter(c => c !== key) : [...cols, key]);
  };

  const moveColumn = (idx, dir) => {
    const cols = [...(rpt.columns || [])];
    const tgt = idx + dir;
    if (tgt < 0 || tgt >= cols.length) return;
    [cols[idx], cols[tgt]] = [cols[tgt], cols[idx]];
    upd('columns', cols);
  };

  const handleSelectAllMeta = () => {
    const all = META_COLUMNS.map(c => c.key);
    const cols = rpt.columns || [];
    const merged = [...all.filter(c => !cols.includes(c)), ...cols];
    upd('columns', merged);
  };

  const handleSelectAllFields = () => {
    const all = fields.map(f => `field:${f.field_key}`);
    const cols = rpt.columns || [];
    const merged = [...cols, ...all.filter(c => !cols.includes(c))];
    upd('columns', merged);
  };

  const colLabel = (key) => {
    if (key.startsWith('_meta:')) return META_COLUMNS.find(m => m.key === key)?.label || key;
    if (key.startsWith('field:')) {
      const fk = key.slice(6);
      const f = fields.find(ff => ff.field_key === fk);
      return f?.label || fk;
    }
    return key;
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        {rpt.id ? 'עריכת דוח טפסים דיגיטליים' : 'דוח טפסים דיגיטליים — חדש'}
      </h3>

      <div className="form-field" style={{ maxWidth: 400, marginBottom: 20 }}>
        <label>שם הדוח</label>
        <input value={rpt.name || ''} onChange={e => upd('name', e.target.value)} placeholder="הזן שם לדוח..." autoFocus />
      </div>

      <div className="rpt-builder-tabs">
        {[
          ['form',        'בחירת טופס'],
          ['columns',     `עמודות (${(rpt.columns || []).length})`],
          ['filters',     'פילטרים'],
          ['permissions', `הרשאות${(rpt.viewerProfileIds?.length || rpt.viewerUserIds?.length) ? ' ●' : ''}`],
        ].map(([id, label]) => (
          <button key={id} className={`rpt-builder-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="rpt-builder-body">
        {tab === 'form' && (
          <div>
            <p className="rpt-hint">בחר את הטופס שעבורו ייבנה הדוח. כל שדה בטופס יוכל להפוך לעמודה.</p>
            <div className="form-field" style={{ maxWidth: 400, marginBottom: 16 }}>
              <label>טופס</label>
              <select value={rpt.formId || ''} onChange={e => { upd('formId', e.target.value); upd('columns', []); }}>
                <option value="">— בחר טופס —</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.name} ({f.form_num})</option>)}
              </select>
            </div>

            {formFull && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 13 }}>
                <div><strong>{formFull.name}</strong> · {formFull.form_num}</div>
                <div style={{ color: 'var(--text-2)', marginTop: 4 }}>
                  {fields.length} שדות · {(formFull.sections || []).length} אזורים
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <label className="prop-toggle" style={{ fontSize: 14 }}>
                <input type="checkbox"
                  checked={!!rpt.joinCustomers}
                  onChange={e => upd('joinCustomers', e.target.checked)} />
                <span>קשר למודול לקוחות (אפשר לסנן לפי לקוח ולהציג שם לקוח)</span>
              </label>
            </div>
          </div>
        )}

        {tab === 'columns' && (
          <div>
            {!rpt.formId && (
              <div className="rpt-hint" style={{ color: 'var(--warning)' }}>
                בחר תחילה טופס בלשונית "בחירת טופס".
              </div>
            )}
            {rpt.formId && (
              <>
                <p className="rpt-hint">בחר את העמודות שיוצגו בדוח. סדר העמודות ניתן לשינוי בעמודה הימנית.</p>
                <div className="rpt-columns-grid">
                  <div>
                    <div className="rpt-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>מטא-נתונים</span>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={handleSelectAllMeta}>בחר הכל</button>
                    </div>
                    <div className="rpt-field-list">
                      {META_COLUMNS.filter(c => !(rpt.columns || []).includes(c.key)).map(c => (
                        <button key={c.key} className="rpt-field-chip" onClick={() => toggleColumn(c.key)}>+ {c.label}</button>
                      ))}
                    </div>

                    <div className="rpt-subtitle" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>שדות הטופס ({fields.length})</span>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={handleSelectAllFields}>בחר הכל</button>
                    </div>
                    <div className="rpt-field-list">
                      {fields.filter(f => !(rpt.columns || []).includes(`field:${f.field_key}`)).map(f => (
                        <button key={f.field_key} className="rpt-field-chip" onClick={() => toggleColumn(`field:${f.field_key}`)}>
                          + {f.label || f.field_key}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="rpt-subtitle">עמודות נבחרות (לפי סדר)</div>
                    <div className="rpt-selected-list">
                      {(rpt.columns || []).map((k, idx) => (
                        <div key={k} className="rpt-selected-item">
                          <span className="rpt-order-badge">{idx + 1}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                            {colLabel(k)}
                            <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 4 }}>
                              ({k.startsWith('_meta:') ? 'מטא' : 'שדה'})
                            </span>
                          </span>
                          <button className="rpt-move-btn" onClick={() => moveColumn(idx, -1)} disabled={idx === 0}>▲</button>
                          <button className="rpt-move-btn" onClick={() => moveColumn(idx, 1)} disabled={idx === (rpt.columns || []).length - 1}>▼</button>
                          <button className="rpt-remove-btn" onClick={() => toggleColumn(k)} aria-label="הסר עמודה"><i className="ti ti-x" aria-hidden="true" /></button>
                        </div>
                      ))}
                      {(rpt.columns || []).length === 0 && (
                        <div style={{ color: 'var(--text-3)', fontSize: 12, padding: 16, textAlign: 'center' }}>
                          בחר שדות מהרשימה
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'filters' && (
          <div>
            <p className="rpt-hint">סינון מקדים של הגשות לפני הצגתן.</p>

            <div className="form-field" style={{ maxWidth: 300, marginBottom: 12 }}>
              <label>סטטוס</label>
              <select value={rpt.statusFilter || ''} onChange={e => upd('statusFilter', e.target.value)}>
                <option value="">— כל הסטטוסים —</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="form-field" style={{ maxWidth: 300 }}>
              <label>טווח תאריכים — מ</label>
              <input type="date" value={rpt.dateFrom || ''} onChange={e => upd('dateFrom', e.target.value)} />
            </div>
            <div className="form-field" style={{ maxWidth: 300 }}>
              <label>עד</label>
              <input type="date" value={rpt.dateTo || ''} onChange={e => upd('dateTo', e.target.value)} />
            </div>
          </div>
        )}

        {tab === 'permissions' && (
          <ReportPermissionsTab rpt={rpt} upd={(k, v) => setRpt(p => ({ ...p, [k]: v }))} users={users} permSearch={permSearch} setPermSearch={setPermSearch} />
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-primary" onClick={() => {
          if (!rpt.name?.trim()) { alert('יש להזין שם לדוח'); return; }
          if (!rpt.formId) { alert('יש לבחור טופס'); return; }
          if (!(rpt.columns || []).length) { alert('יש לבחור לפחות עמודה אחת'); return; }
          onSave({ ...rpt, type: 'submissions' });
        }}>שמור דוח</button>
        <button className="btn btn-ghost" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────────
export function SubmissionsReportRunner({ report }) {
  const [submissions, setSubmissions] = useState([]);
  const [formFull, setFormFull] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerFilter, setCustomerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [error, setError] = useState(null);

  // Load data
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const [full, subs, custResp] = await Promise.all([
          api.get(`/api/forms/${report.formId}/full`),
          api.get(`/api/forms/${report.formId}/submissions/full`),
          report.joinCustomers ? api.get('/api/customers?limit=2000') : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;
        setFormFull(full);
        setSubmissions(subs.data || []);
        setCustomers(custResp.data || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [report.formId, report.joinCustomers]);

  const customerById = useMemo(() => {
    const m = new Map();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  const fieldsByKey = useMemo(() => {
    const m = new Map();
    for (const f of formFull?.fields || []) m.set(f.field_key, f);
    return m;
  }, [formFull]);

  // Build column descriptors
  const cols = useMemo(() => {
    return (report.columns || []).map(key => {
      let label = key;
      if (key.startsWith('_meta:')) {
        label = META_COLUMNS.find(m => m.key === key)?.label || key;
      } else if (key.startsWith('field:')) {
        const fk = key.slice(6);
        label = fieldsByKey.get(fk)?.label || fk;
      }
      return { key, label };
    });
  }, [report.columns, fieldsByKey]);

  // Filter rows
  const filteredRows = useMemo(() => {
    let rows = submissions.slice();

    if (report.statusFilter) {
      rows = rows.filter(s => s.status === report.statusFilter);
    }
    if (report.dateFrom) {
      const from = new Date(report.dateFrom).getTime();
      rows = rows.filter(s => {
        const t = new Date(s.submitted_at || s.created_at).getTime();
        return !isNaN(t) && t >= from;
      });
    }
    if (report.dateTo) {
      const to = new Date(report.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      rows = rows.filter(s => {
        const t = new Date(s.submitted_at || s.created_at).getTime();
        return !isNaN(t) && t <= to;
      });
    }

    if (customerFilter) {
      rows = rows.filter(s =>
        s.linked_module === 'customers' && s.linked_record_id === customerFilter
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(s => {
        const valuesByFieldKey = new Map();
        for (const v of s.values || []) valuesByFieldKey.set(v.field_key, v);
        return cols.some(c => {
          const cell = getCellValue(c.key, s, fieldsByKey, valuesByFieldKey, customerById);
          return String(cell || '').toLowerCase().includes(q);
        });
      });
    }

    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const va = getCellValueRaw(sortCol, a, fieldsByKey, customerById);
        const vb = getCellValueRaw(sortCol, b, fieldsByKey, customerById);
        const cmp = String(va).localeCompare(String(vb), 'he', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }, [submissions, report.statusFilter, report.dateFrom, report.dateTo, customerFilter, search, cols, fieldsByKey, customerById, sortCol, sortDir]);

  // Sort raw value (for proper date sorting)
  function getCellValueRaw(key, sub) {
    if (key === '_meta:submitted_at' || key === '_meta:date' || key === '_meta:time') {
      return new Date(sub.submitted_at || sub.created_at).getTime() || 0;
    }
    const valuesByFieldKey = new Map();
    for (const v of sub.values || []) valuesByFieldKey.set(v.field_key, v);
    return getCellValue(key, sub, fieldsByKey, valuesByFieldKey, customerById);
  }

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
  };

  const handleExport = () => {
    if (!filteredRows.length) return;
    const headers = cols.map(c => c.label);
    const data = filteredRows.map(sub => {
      const valuesByFieldKey = new Map();
      for (const v of sub.values || []) valuesByFieldKey.set(v.field_key, v);
      return cols.map(c => getCellValue(c.key, sub, fieldsByKey, valuesByFieldKey, customerById));
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
    XLSX.writeFile(wb, `${report.name || 'דוח_הגשות'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return <div className="card" style={{ textAlign: 'center', padding: 60 }}>טוען נתונים...</div>;
  if (error) return <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--danger)' }}>שגיאה: {error}</div>;

  return (
    <div className="card">
      <div className="rpt-run-header">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, display: 'inline', marginLeft: 10 }}>{report.name}</h3>
          <span className="badge badge-accent">טפסים דיגיטליים</span>
          {formFull?.name && <span className="badge badge-info" style={{ marginRight: 4 }}>{formFull.name}</span>}
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 8 }}>
            {filteredRows.length} / {submissions.length} הגשות
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {report.joinCustomers && (
            <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">— כל הלקוחות —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש בתוצאות..." style={{ maxWidth: 220 }} />
          <button className="btn btn-secondary" onClick={handleExport} disabled={!filteredRows.length} style={{ fontSize: 12 }}>
            ייצוא Excel
          </button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
          {submissions.length === 0 ? 'אין הגשות לטופס זה' : 'אין תוצאות תואמות לסינון'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {cols.map(c => (
                  <th key={c.key} onClick={() => handleSort(c.key)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {c.label}
                    {sortCol === c.key && <span style={{ marginRight: 4 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((sub, i) => {
                const valuesByFieldKey = new Map();
                for (const v of sub.values || []) valuesByFieldKey.set(v.field_key, v);
                return (
                  <tr key={sub.id} style={{ background: i % 2 === 0 ? '' : 'var(--bg-elevated)' }}>
                    {cols.map(c => (
                      <td key={c.key} style={{ verticalAlign: 'top' }}>
                        {getCellValue(c.key, sub, fieldsByKey, valuesByFieldKey, customerById)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
