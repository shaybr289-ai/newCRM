/**
 * TaskSubmissionsReport — "דוח דיווחי משימות"
 *
 * Filters: employee, customer, task number, free text, date range + clear button
 * Results grouped by task, showing each form submission per status.
 * Submissions expand to show field values. "הצג טופס" opens full printable preview.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../api/client';
import SubmissionPreviewModal, { buildSubmissionHTML } from '../Forms/SubmissionPreview';

/* ── Constants ─────────────────────────────────────────────────────────────── */
const STATUS_LABELS = {
  new:         'חדש',
  in_progress: 'בביצוע',
  pending:     'ממתין',
  completed:   'הושלם',
  cancelled:   'בוטל',
  on_hold:     'בהמתנה',
};

const SUB_STATUS_LABELS = {
  draft:     'טיוטה',
  pending:   'ממתין לשליחה',
  submitted: 'הוגש',
  synced:    'דווח לשרת',
  reviewed:  'נסקר',
  approved:  'אושר',
  rejected:  'נדחה',
};

const SUB_STATUS_COLORS = {
  draft:     { bg: '#FEF3C7', fg: '#92400E' },
  pending:   { bg: '#FFEDD5', fg: '#9A3412' },
  submitted: { bg: '#DBEAFE', fg: '#1E40AF' },
  synced:    { bg: '#D1FAE5', fg: '#065F46' },
  reviewed:  { bg: '#E0E7FF', fg: '#3730A3' },
  approved:  { bg: '#D1FAE5', fg: '#065F46' },
  rejected:  { bg: '#FEE2E2', fg: '#991B1B' },
};

const DISPLAY_TYPES = new Set(['heading', 'paragraph', 'divider', 'spacer', 'logo', 'image_display']);

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('he-IL'); } catch { return String(d); }
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(d); }
};

/**
 * Format a field value for display in the report table.
 * fieldDef is the form field definition (may be null if not loaded yet).
 */
function formatFieldValue(val, type, fieldDef) {
  if (val === null || val === undefined || val === '') return '—';

  if (type === 'signature') {
    // Check if there's actual data
    const hasData = typeof val === 'string' && val.startsWith('data:image');
    const hasFileData = typeof val === 'object' && val?.file_data?.startsWith('data:image');
    return (hasData || hasFileData)
      ? <span style={{ color: '#065F46', fontWeight: 600 }}>✓ יש חתימה</span>
      : <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>לא נחתם</span>;
  }

  if (type === 'file' || type === 'image') {
    if (Array.isArray(val)) {
      const count = val.filter(Boolean).length;
      if (count === 0) return '—';
      const label = type === 'image' ? 'תמונה' : 'קובץ';
      const labelPlural = type === 'image' ? 'תמונות' : 'קבצים';
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#F0F7FF', color: '#0A5E9A',
          padding: '2px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12,
        }}>
          <i className={`ti ${type === 'image' ? 'ti-photo' : 'ti-paperclip'}`} aria-hidden="true" />
          {count} {count === 1 ? label : labelPlural}
        </span>
      );
    }
    if (typeof val === 'string' && val.startsWith('data:')) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#F0F7FF', color: '#0A5E9A',
          padding: '2px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12,
        }}>
          <i className="ti ti-photo" aria-hidden="true" /> 1 תמונה
        </span>
      );
    }
    return '—';
  }

  if (type === 'rating') {
    const n = Number(val?.value_number ?? val?.value_text ?? (typeof val === 'number' ? val : 0));
    const actualN = typeof val === 'number' ? val : n;
    const max = Number(fieldDef?.validation?.max || fieldDef?.options?.max || 5);
    const stars = '★'.repeat(Math.max(0, Math.min(max, actualN)));
    const empty = '☆'.repeat(Math.max(0, max - actualN));
    return (
      <span>
        <span style={{ color: '#F59E0B', fontSize: 16, letterSpacing: 2 }}>{stars}{empty}</span>
        <span style={{ color: '#64748B', fontSize: 12, marginRight: 6 }}>
          {actualN} מתוך {max}
        </span>
      </span>
    );
  }

  if (type === 'checkbox' || type === 'toggle') {
    const truthy = val === true || val === 'true' || val === 1 || val === '1';
    return truthy
      ? <span style={{ color: '#065F46', fontWeight: 700 }}>✓ כן</span>
      : <span style={{ color: '#94A3B8' }}>לא</span>;
  }

  if (type === 'date') return fmtDate(val);

  if (Array.isArray(val)) {
    if (val.length === 0) return '—';
    // Multi-select: resolve labels from fieldDef options if available
    const opts = fieldDef?.options || [];
    return val.map(v => {
      const opt = opts.find(o => o.value === v || o.value === String(v));
      return opt?.label || v;
    }).join(', ');
  }

  if (typeof val === 'object' && val !== null) {
    // module_lookup
    if (val.label || val.id) return val.label || String(val.id);
    return JSON.stringify(val);
  }

  // select/radio: try to resolve label
  if ((type === 'select' || type === 'radio') && fieldDef?.options) {
    const opt = fieldDef.options.find(o => o.value === String(val));
    if (opt) return opt.label;
  }

  if (type === 'currency') {
    const n = Number(val);
    if (!isNaN(n)) return '₪' + n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (type === 'percentage') return Number(val).toFixed(1) + '%';

  return String(val);
}

/* ── Group rows by task ─────────────────────────────────────────────────────── */
function groupByTask(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.task_id || '__no_task__';
    if (!map.has(key)) {
      map.set(key, {
        task_id: row.task_id,
        task_num: row.task_num,
        task_subject: row.task_subject,
        task_status: row.task_status,
        customer_name: row.customer_name,
        due_date: row.due_date,
        status_forms: (() => {
          try { return row.status_forms ? JSON.parse(row.status_forms) : {}; } catch { return {}; }
        })(),
        submissions: [],
      });
    }
    map.get(key).submissions.push(row);
  }
  return Array.from(map.values());
}

/* ── Invert status_forms { status: formId } → { formId: status } ── */
function invertStatusForms(sf) {
  const out = {};
  for (const [status, formId] of Object.entries(sf || {})) {
    if (formId) out[formId] = status;
  }
  return out;
}

/* ── Sub-component: Expandable submission row ─────────────────────────────── */
function SubmissionRow({ sub, statusForms, formCache, onLoadForm, companyInfo }) {
  const [open, setOpen]       = useState(false);
  const [values, setValues]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewing, setPreviewing]   = useState(false);

  const inverted = invertStatusForms(statusForms);
  const linkedStatus = inverted[sub.form_id];
  const formDef = formCache[sub.form_id] || null;

  const toggle = async () => {
    if (!open && values === null) {
      setLoading(true);
      try {
        const [valRes] = await Promise.all([
          api.get(`/api/reports/task-submissions/${sub.submission_id}/values`),
          // Load form definition if not cached
          (!formDef && sub.form_id)
            ? api.get(`/api/forms/${sub.form_id}/full`).then(r => onLoadForm(sub.form_id, r)).catch(() => {})
            : Promise.resolve(),
        ]);
        setValues(valRes.data || []);
      } catch { setValues([]); }
      setLoading(false);
    }
    setOpen(v => !v);
  };

  const handlePreview = async (e) => {
    e.stopPropagation();
    setPreviewing(true);
    try {
      // Load full submission (with submitter name etc.)
      const detail = await api.get(`/api/submissions/${sub.submission_id}/full`);

      // Load form def if not cached
      let fd = formDef;
      if (!fd && sub.form_id) {
        fd = await api.get(`/api/forms/${sub.form_id}/full`).catch(() => null);
        if (fd) onLoadForm(sub.form_id, fd);
      }

      const html = buildSubmissionHTML({
        form: fd || { name: sub.form_name },
        submission: detail,
        submissionValues: detail.values || [],
        sections: fd?.sections || [],
        fields: fd?.fields || [],
        companyInfo: companyInfo || {},
      });
      setPreviewHtml(html);
    } catch (err) {
      alert('שגיאה בטעינת הטופס: ' + (err?.message || err));
    } finally {
      setPreviewing(false);
    }
  };

  const sc = SUB_STATUS_COLORS[sub.submission_status] || { bg: '#F1F5F9', fg: '#475569' };
  const userLabel = [sub.user_first_name, sub.user_last_name].filter(Boolean).join(' ') || '—';
  const isSubmittedOrSynced = sub.submission_status === 'submitted' || sub.submission_status === 'synced';

  // Build field map from form definition for rich formatting
  const fieldMap = {};
  if (formDef?.fields) {
    for (const f of formDef.fields) fieldMap[f.field_key] = f;
  }

  return (
    <>
      {previewHtml && (
        <SubmissionPreviewModal
          html={previewHtml}
          title={`${sub.form_name || 'טופס'} — ${fmtDateTime(sub.submitted_at)}`}
          onClose={() => setPreviewHtml(null)}
        />
      )}

      <div style={{
        borderRadius: 8, overflow: 'hidden',
        border: '1px solid #E2E8F0',
        marginBottom: 6,
      }}>
        {/* Header row */}
        <div
          onClick={toggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', cursor: 'pointer',
            background: open ? '#F0F7FF' : '#FAFBFC',
            borderBottom: open ? '1px solid #BFDBFE' : 'none',
          }}
        >
          <i
            className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`}
            aria-hidden="true"
            style={{ fontSize: 14, color: '#64748B', flexShrink: 0 }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                {sub.form_name || 'טופס'}
              </span>
              {/* Status badge */}
              {linkedStatus && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: '#E8F4FD', color: '#0A5E9A',
                }}>
                  <i className="ti ti-tag" aria-hidden="true" style={{ marginLeft: 4, fontSize: 10 }} />
                  לסטטוס: {STATUS_LABELS[linkedStatus] || linkedStatus}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              {fmtDateTime(sub.submitted_at || sub.submission_updated_at)}
              {userLabel !== '—' && <span style={{ marginRight: 8 }}>| {userLabel}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Show form button — only for submitted/synced */}
            {isSubmittedOrSynced && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  border: '1.5px solid #1A91D9', background: '#fff', color: '#1A91D9',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                {previewing
                  ? <><i className="ti ti-loader" aria-hidden="true" style={{ fontSize: 12 }} />טוען…</>
                  : <><i className="ti ti-file-description" aria-hidden="true" style={{ fontSize: 12 }} />הצג טופס</>
                }
              </button>
            )}

            {/* Submission status badge */}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              background: sc.bg, color: sc.fg,
            }}>
              {SUB_STATUS_LABELS[sub.submission_status] || sub.submission_status}
            </span>
          </div>
        </div>

        {/* Expanded values */}
        {open && (
          <div style={{ padding: '12px 14px', background: '#fff' }}>
            {loading ? (
              <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', padding: '8px 0' }}>
                <i className="ti ti-loader" aria-hidden="true" style={{ marginLeft: 6 }} />
                טוען שדות…
              </div>
            ) : values && values.length > 0 ? (() => {
              // Compute total attached files/images across all file+image fields
              const fileRows = values.filter(v => v.field_type === 'file' || v.field_type === 'image');
              const totalFiles = fileRows.reduce((sum, v) => {
                const arr = v.value_json;
                if (Array.isArray(arr)) return sum + arr.filter(Boolean).length;
                if (v.file_data || (typeof v.value_text === 'string' && v.value_text.startsWith('data:'))) return sum + 1;
                return sum;
              }, 0);
              const dataRows = values.filter(v => !DISPLAY_TYPES.has(v.field_type) && v.field_key !== '__task_activities_done');
              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, direction: 'rtl' }}>
                  <tbody>
                    {/* Summary: files attached */}
                    {totalFiles > 0 && (
                      <tr style={{ borderBottom: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                        <td style={{ padding: '7px 8px 7px 16px', fontWeight: 700, color: '#1E40AF', width: '38%' }}>
                          <i className="ti ti-paperclip" aria-hidden="true" style={{ marginLeft: 5, fontSize: 12 }} />
                          קבצים מצורפים
                        </td>
                        <td style={{ padding: '7px 8px', fontWeight: 700 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: '#DBEAFE', color: '#1E40AF',
                            padding: '2px 10px', borderRadius: 99, fontSize: 12,
                          }}>
                            <i className="ti ti-files" aria-hidden="true" />
                            {totalFiles} {totalFiles === 1 ? 'קובץ / תמונה' : 'קבצים / תמונות'}
                          </span>
                        </td>
                      </tr>
                    )}
                    {dataRows.map((v, i) => {
                      const raw = v.value_json ?? v.value_text ?? v.value_number;
                      const fd = fieldMap[v.field_key] || null;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{
                            padding: '7px 8px 7px 16px', fontWeight: 600, color: '#475569',
                            width: '38%', verticalAlign: 'top',
                          }}>
                            {v.field_label || v.field_key}
                          </td>
                          <td style={{ padding: '7px 8px', color: '#0F172A', verticalAlign: 'top' }}>
                            {formatFieldValue(raw, v.field_type, fd)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })() : (
              <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>אין שדות מולאו</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Sub-component: Task group card ─────────────────────────────────────────── */
function TaskGroup({ group, formCache, onLoadForm, companyInfo }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: '1px solid #E2E8F0',
      marginBottom: 14, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Task header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', cursor: 'pointer',
          background: open ? '#F0F7FF' : '#F8FAFC',
          borderBottom: open ? '1px solid #BFDBFE' : 'none',
        }}
      >
        <i
          className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`}
          aria-hidden="true"
          style={{ fontSize: 15, color: '#1A91D9', flexShrink: 0 }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {group.task_num && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>#{group.task_num}</span>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              {group.task_subject || '(ללא נושא)'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            {group.customer_name && <span>{group.customer_name}</span>}
            {group.due_date && <span style={{ marginRight: 10 }}>מועד: {fmtDate(group.due_date)}</span>}
            {group.task_status && (
              <span style={{ marginRight: 10 }}>{STATUS_LABELS[group.task_status] || group.task_status}</span>
            )}
          </div>
        </div>

        <span style={{
          fontSize: 12, fontWeight: 700, color: '#1A91D9',
          background: '#E8F4FD', padding: '3px 10px', borderRadius: 99, flexShrink: 0,
        }}>
          {group.submissions.length} דיווח{group.submissions.length !== 1 ? 'ים' : ''}
        </span>
      </div>

      {/* Submissions list */}
      {open && (
        <div style={{ padding: '12px 16px' }}>
          {group.submissions.map(sub => (
            <SubmissionRow
              key={sub.submission_id}
              sub={sub}
              statusForms={group.status_forms}
              formCache={formCache}
              onLoadForm={onLoadForm}
              companyInfo={companyInfo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
const EMPTY_FILTERS = { userId: '', customerId: '', taskNum: '', search: '', dateFrom: '', dateTo: '' };

export default function TaskSubmissionsReport() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // Data
  const [users, setUsers]         = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rows, setRows]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [companyInfo, setCompanyInfo] = useState({});

  // Cache form definitions { formId → { form, sections, fields } }
  const formCacheRef = useRef({});
  const [formCacheTick, setFormCacheTick] = useState(0); // force re-render when cache updates

  const handleLoadForm = useCallback((formId, data) => {
    formCacheRef.current[formId] = data;
    setFormCacheTick(t => t + 1);
  }, []);

  const LIMIT = 100;

  useEffect(() => {
    api.get('/api/users').then(r => setUsers(r.data || [])).catch(() => {});
    api.get('/api/customers?limit=500').then(r => setCustomers(r.data || [])).catch(() => {});
    api.get('/api/company').then(r => setCompanyInfo(r || {})).catch(() => {});
  }, []);

  const fetchReport = useCallback(async (pg = 1, overrideFilters) => {
    const f = overrideFilters || filters;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (f.userId)     params.set('userId', f.userId);
      if (f.customerId) params.set('customerId', f.customerId);
      if (f.taskNum)    params.set('taskNum', f.taskNum);
      if (f.search)     params.set('search', f.search);
      if (f.dateFrom)   params.set('dateFrom', f.dateFrom);
      if (f.dateTo)     params.set('dateTo', f.dateTo);

      const r = await api.get(`/api/reports/task-submissions?${params}`);
      setRows(r.data || []);
      setTotal(r.total || 0);
      setPage(pg);
    } catch (e) {
      setError(e?.message || 'שגיאה בטעינת הדוח');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReport(1);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    setRows([]);
    setTotal(0);
    setPage(1);
    setError(null);
  };

  const setField = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }));

  const groups = groupByTask(rows);
  const hasFilters = Object.values(filters).some(v => v !== '');

  return (
    <div style={{ padding: '24px 28px', direction: 'rtl', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
          <i className="ti ti-clipboard-data" aria-hidden="true"
             style={{ fontSize: 20, verticalAlign: 'middle', marginLeft: 10, color: '#1A91D9' }} />
          דוח דיווחי משימות
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 0 }}>
          כל הדיווחים שהוגשו לפי משימה — מסוננים לפי עובד, לקוח, תאריך ועוד
        </p>
      </div>

      {/* ── Filter bar ── */}
      <form
        onSubmit={handleSearch}
        style={{
          background: '#fff', borderRadius: 14, padding: '16px 20px',
          border: '1px solid #E2E8F0', marginBottom: 24,
          display: 'grid', gap: 12,
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Employee */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
            עובד
          </label>
          <select
            value={filters.userId}
            onChange={setField('userId')}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
          >
            <option value="">כל העובדים</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
              </option>
            ))}
          </select>
        </div>

        {/* Customer */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
            לקוח
          </label>
          <select
            value={filters.customerId}
            onChange={setField('customerId')}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
          >
            <option value="">כל הלקוחות</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>

        {/* Task number */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
            מספר משימה
          </label>
          <input
            type="text"
            value={filters.taskNum}
            onChange={setField('taskNum')}
            placeholder="חיפוש לפי מספר"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>

        {/* Free text */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
            חיפוש חופשי
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={setField('search')}
            placeholder="נושא משימה / שם טופס"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>

        {/* Date from */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
            מתאריך
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={setField('dateFrom')}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>

        {/* Date to */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
            עד תאריך
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={setField('dateTo')}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #1A91D9, #0A5E9A)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {loading
              ? <><i className="ti ti-loader" aria-hidden="true" style={{ marginLeft: 6 }} />טוען…</>
              : <><i className="ti ti-search" aria-hidden="true" style={{ marginLeft: 6 }} />הצג דוח</>
            }
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '9px 12px', borderRadius: 8,
                border: '1.5px solid #E2E8F0', background: '#fff',
                color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="נקה סינון"
            >
              <i className="ti ti-x" aria-hidden="true" style={{ marginLeft: 4 }} />
              נקה
            </button>
          )}
        </div>
      </form>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: '#FEE2E2', color: '#991B1B', borderRadius: 10,
          padding: '12px 16px', marginBottom: 18, fontSize: 13, fontWeight: 600,
        }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" style={{ marginLeft: 8 }} />
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {rows.length > 0 && (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
          }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              נמצאו {total} דיווחים ב-{groups.length} משימות
            </span>
            {total > LIMIT && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => fetchReport(page - 1)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
                    background: '#fff', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  <i className="ti ti-chevron-right" aria-hidden="true" />
                </button>
                <span style={{ fontSize: 12, color: '#64748B' }}>עמוד {page}</span>
                <button
                  disabled={page * LIMIT >= total || loading}
                  onClick={() => fetchReport(page + 1)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
                    background: '#fff', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  <i className="ti ti-chevron-left" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {groups.map(g => (
            <TaskGroup
              key={g.task_id || '__no_task__'}
              group={g}
              formCache={formCacheRef.current}
              onLoadForm={handleLoadForm}
              companyInfo={companyInfo}
            />
          ))}
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && rows.length === 0 && total === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: '#94A3B8',
          background: '#fff', borderRadius: 14, border: '1px dashed #E2E8F0',
        }}>
          <i className="ti ti-clipboard-x" aria-hidden="true"
             style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 14, margin: 0 }}>לחץ "הצג דוח" כדי לטעון תוצאות</p>
        </div>
      )}
    </div>
  );
}
