import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../../api/client';
import { REPORT_MODULES, REPORT_JOINS, REPORT_FILTER_OPS } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import * as XLSX from 'xlsx';
import { SubmissionsReportBuilder, SubmissionsReportRunner } from './SubmissionsReport';
import SendReportModal from './SendReportModal';
import useAuthStore from '../../store/authStore';
import { useUsers } from '../../hooks/useUsers';
import { ReportPermissionsTab } from './ReportPermissionsTab';
import '../Customers/CustomerModal.css';
import './Reports.css';

const REPORT_TYPE_LABEL = {
  standard: 'דוח מודולים',
  submissions: 'טפסים דיגיטליים',
};

const STORAGE_KEY = 'biz_reports_v1';
function loadReports() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveReports(reports) { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); }

const SYSTEM_REPORTS = [
  {
    id: 'sys_customers', type: 'standard', name: 'לקוחות', module: 'customers', joinModules: [], filters: [], groupBy: '', isSystem: true,
    columns: ['customers:cust_num', 'customers:company_name', 'customers:client_type', 'customers:city', 'customers:phone', 'customers:mobile', 'customers:email', 'customers:payment_terms', 'customers:status', 'customers:created_at'],
  },
  {
    id: 'sys_service_agreements', type: 'standard', name: 'הסכמי שירות', module: 'service-agreements', joinModules: ['customers'], filters: [], groupBy: '', isSystem: true,
    columns: ['service-agreements:agreement_num', 'service-agreements:agreement_name', 'customers:company_name', 'service-agreements:agreement_type', 'service-agreements:service_type', 'service-agreements:start_date', 'service-agreements:end_date', 'service-agreements:auto_renew', 'service-agreements:status'],
  },
  {
    id: 'sys_products', type: 'standard', name: 'מק"טים', module: 'products', joinModules: [], filters: [], groupBy: '', isSystem: true,
    columns: ['products:sku', 'products:name', 'products:product_type', 'products:sale_price', 'products:unit_price', 'products:mfr_name', 'products:status'],
  },
  {
    id: 'sys_cust_items', type: 'standard', name: 'פריטי לקוח', module: 'cust-items', joinModules: ['customers'], filters: [], groupBy: '', isSystem: true,
    columns: ['cust-items:item_name', 'cust-items:sku', 'customers:company_name', 'cust-items:quantity', 'cust-items:item_type', 'cust-items:status'],
  },
  {
    id: 'sys_deals', type: 'standard', name: 'עסקאות', module: 'deals', joinModules: ['customers'], filters: [], groupBy: '', isSystem: true,
    columns: ['deals:deal_num', 'deals:deal_name', 'customers:company_name', 'deals:deal_type', 'deals:stage', 'deals:expected_one_time', 'deals:expected_recurring', 'deals:expected_close_date', 'deals:created_at'],
  },
  {
    id: 'sys_quotes', type: 'standard', name: 'הצעות מחיר', module: 'quotes', joinModules: ['customers'], filters: [], groupBy: '', isSystem: true,
    columns: ['quotes:quote_num', 'quotes:quote_name', 'customers:company_name', 'quotes:stage', 'quotes:quote_type', 'quotes:quote_date', 'quotes:overall_discount', 'quotes:status', 'quotes:created_at'],
  },
  {
    id: 'sys_orders', type: 'standard', name: 'הזמנות', module: 'orders', joinModules: ['customers'], filters: [], groupBy: '', isSystem: true,
    columns: ['orders:order_num', 'orders:order_name', 'customers:company_name', 'orders:status', 'orders:order_date', 'orders:delivery_date', 'orders:delivery_type', 'orders:total', 'orders:overall_discount', 'orders:created_at'],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function applyFilter(val, op, filterVal) {
  const s = String(val || '').toLowerCase().trim();
  const f = String(filterVal || '').toLowerCase().trim();
  switch (op) {
    case 'contains': return s.includes(f);
    case 'not_contains': return !s.includes(f);
    case 'eq': return s === f;
    case 'neq': return s !== f;
    case 'starts': return s.startsWith(f);
    case 'gt': return parseFloat(val) > parseFloat(filterVal);
    case 'lt': return parseFloat(val) < parseFloat(filterVal);
    case 'empty': return !s;
    case 'not_empty': return !!s;
    default: return true;
  }
}

function getFieldDef(moduleKey, fieldId) {
  return REPORT_MODULES[moduleKey]?.fields.find(f => f.id === fieldId);
}

function getDisplayValue(val, field) {
  if (val == null || val === '') return '—';
  if (field?.type === 'enum' && field.options) { const opt = field.options.find(([k]) => k === val); return opt ? opt[1] : val; }
  if (field?.type === 'boolean') return val ? 'כן' : 'לא';
  if (field?.type === 'date') { try { return new Date(val).toLocaleDateString('he-IL'); } catch { return val; } }
  if (field?.type === 'number') { const n = Number(val); return isNaN(n) ? val : n.toLocaleString('he-IL'); }
  return val;
}

// Parse a prefixed column key like "customers:company_name" → { mod, fieldId }
function parseColKey(key) {
  const i = key.indexOf(':');
  return i >= 0 ? { mod: key.slice(0, i), fieldId: key.slice(i + 1) } : { mod: null, fieldId: key };
}

// Get all available fields across primary + joined modules (prefixed)
function getAllFields(primaryMod, joinModules) {
  const result = [];
  const pm = REPORT_MODULES[primaryMod];
  if (pm) pm.fields.forEach(f => result.push({ key: `${primaryMod}:${f.id}`, label: f.label, modLabel: pm.label, ...f }));
  (joinModules || []).forEach(jm => {
    const m = REPORT_MODULES[jm];
    if (m) m.fields.forEach(f => result.push({ key: `${jm}:${f.id}`, label: `${f.label}`, modLabel: m.label, ...f }));
  });
  return result;
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ReportsPage({ embedded = false, defaultView = 'list', defaultRunReport = null, defaultEditReport = null, onBack = null }) {
  const [reports, setReports] = useState(loadReports);
  const [view, setView] = useState(defaultView);
  const [editReport, setEditReport] = useState(defaultEditReport);
  const [runReport, setRunReport] = useState(defaultRunReport);
  const [searchList, setSearchList] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const user = useAuthStore(s => s.user);
  const { data: usersData } = useUsers({ limit: 500 });
  const users = usersData?.data || [];

  const saveAll = (updated) => { setReports(updated); saveReports(updated); };

  const handleNew = () => setShowTypePicker(true);

  const handlePickType = (type) => {
    setShowTypePicker(false);
    if (type === 'submissions') {
      setEditReport({ id: null, type: 'submissions', name: '', formId: '', columns: [], joinCustomers: false });
    } else {
      setEditReport({ id: null, type: 'standard', name: '', module: 'customers', joinModules: [], columns: [], filters: [], groupBy: '' });
    }
    setView('build');
  };

  const handleSaveReport = (rpt) => {
    const now = new Date().toLocaleDateString('he-IL');
    let updated;
    if (rpt.id) updated = reports.map(r => r.id === rpt.id ? { ...rpt, updatedAt: now } : r);
    else updated = [...reports, { ...rpt, id: 'rpt_' + Date.now(), createdAt: now, updatedAt: now, createdBy: user?.id }];
    saveAll(updated);
    setView('list'); setEditReport(null);
  };

  const filtered = searchList ? reports.filter(r => r.name.includes(searchList)) : reports;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">דוחות</h1>
          <p className="page-subtitle">בנה דוחות מותאמים עם שילוב מודולים</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view !== 'list' && (
            <button className="btn btn-ghost" onClick={() => { if (onBack) { onBack(); } else { setView('list'); setEditReport(null); setRunReport(null); } }}>
              <Icon svg={ICONS.back} size={16} /> חזרה לרשימה
            </button>
          )}
          {view === 'list' && (
            <button className="btn btn-primary" onClick={handleNew}><Icon svg={ICONS.plus} size={16} /> דוח חדש</button>
          )}
        </div>
      </div>

      {view === 'list' && (
        <>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--accent)', fontSize: 16 }} />
            דוחות מערכת
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {SYSTEM_REPORTS.map(rpt => (
              <button key={rpt.id}
                onClick={() => { setRunReport({ ...rpt }); setView('run'); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  padding: '12px 14px', borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg-elevated)',
                  cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{rpt.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{rpt.columns.length} עמודות</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>דוחות שמורים ({filtered.length})</h3>
            <input value={searchList} onChange={e => setSearchList(e.target.value)} placeholder="חיפוש דוח..." style={{ maxWidth: 250 }} />
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
              <div style={{ marginBottom: 12 }}><Icon svg={ICONS.reports} size={48} /></div>
              <p>אין דוחות שמורים. צור דוח חדש.</p>
            </div>
          ) : (
            <table>
              <thead><tr>
                <th>שם הדוח</th>
                <th style={{ width: 130 }}>סוג</th>
                <th style={{ width: 130 }}>בסיס</th>
                <th style={{ width: 80 }}>עמודות</th>
                <th style={{ width: 110 }}>תאריך</th>
                <th style={{ width: 130 }}>פעולות</th>
              </tr></thead>
              <tbody>
                {filtered.map(rpt => {
                  const type = rpt.type || 'standard';
                  const baseLabel = type === 'submissions'
                    ? (rpt._formName || rpt.formId?.slice(0, 8) || '—')
                    : (REPORT_MODULES[rpt.module]?.label || rpt.module);
                  return (
                    <tr key={rpt.id} style={{ cursor: 'pointer' }}
                      onClick={() => { setRunReport({ ...rpt }); setView('run'); }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--accent-light)'}
                      onMouseOut={e => e.currentTarget.style.background = ''}>
                      <td style={{ fontWeight: 600 }}>{rpt.name || '(ללא שם)'}</td>
                      <td>
                        <span className={`badge ${type === 'submissions' ? 'badge-info' : 'badge-accent'}`}>
                          {REPORT_TYPE_LABEL[type] || type}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{baseLabel}</td>
                      <td>{rpt.columns?.length || 0}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{rpt.createdAt || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="action-btn" onClick={() => { setRunReport({ ...rpt }); setView('run'); }} title="הרצה">▶</button>
                          <button className="action-btn edit" onClick={() => { setEditReport({ ...rpt }); setView('build'); }} title="ערוך" aria-label="ערוך דוח"><i className="ti ti-edit" aria-hidden="true" /></button>
                          <button className="action-btn delete" onClick={() => setConfirmDel(rpt)} title="מחק" aria-label="מחק דוח"><i className="ti ti-trash" aria-hidden="true" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </>
      )}

      {view === 'build' && editReport && (
        editReport.type === 'submissions'
          ? <SubmissionsReportBuilder report={editReport} users={users} onSave={handleSaveReport} onCancel={() => { setEditReport(null); if (onBack) onBack(); else setView('list'); }} />
          : <ReportBuilder report={editReport} users={users} onSave={handleSaveReport} onCancel={() => { setEditReport(null); if (onBack) onBack(); else setView('list'); }} />
      )}

      {view === 'run' && runReport && (
        runReport.type === 'submissions'
          ? <SubmissionsReportRunner report={runReport} />
          : <ReportRunner report={runReport} />
      )}

      {/* Type picker — shown when clicking "דוח חדש" */}
      {showTypePicker && (
        <div className="modal-overlay" onClick={() => setShowTypePicker(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 28 }}>
            <h3 style={{ marginBottom: 6 }}>איזה סוג דוח לבנות?</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 22 }}>
              בחר את סוג הדוח שמתאים למה שאתה רוצה להציג.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                onClick={() => handlePickType('standard')}
                style={{
                  padding: 18, border: '1.5px solid var(--border)', borderRadius: 12,
                  background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}><i className="ti ti-chart-bar" aria-hidden="true" /></div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>דוח מודולים</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  שילוב נתונים מהמודולים: לקוחות, אנשי קשר, עסקאות, הזמנות וכד'.
                </div>
              </button>
              <button
                onClick={() => handlePickType('submissions')}
                style={{
                  padding: 18, border: '1.5px solid var(--border)', borderRadius: 12,
                  background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}><i className="ti ti-forms" aria-hidden="true" /></div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>דוח טפסים דיגיטליים</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  כל ההגשות של טופס מסוים בטבלה. כל שדה — עמודה, כל הגשה — שורה.
                </div>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowTypePicker(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת דוח</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את הדוח <strong>{confirmDel.name}</strong>?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={() => { saveAll(reports.filter(r => r.id !== confirmDel.id)); setConfirmDel(null); }}>מחק</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Report Builder ──────────────────────────────────────────────────────────
function ReportBuilder({ report, users = [], onSave, onCancel }) {
  const [rpt, setRpt] = useState({ joinModules: [], viewerProfileIds: [], viewerUserIds: [], ...report });
  const [activeTab, setActiveTab] = useState('modules');
  const [permSearch, setPermSearch] = useState('');

  const availableJoins = REPORT_JOINS[rpt.module] || [];
  const allFields = useMemo(() => getAllFields(rpt.module, rpt.joinModules), [rpt.module, rpt.joinModules]);

  const upd = (k, v) => setRpt(p => ({ ...p, [k]: v }));

  const toggleJoinModule = (mod) => {
    const jm = rpt.joinModules || [];
    const updated = jm.includes(mod) ? jm.filter(m => m !== mod) : [...jm, mod];
    // Remove columns/filters from removed modules
    const validMods = new Set([rpt.module, ...updated]);
    const cols = (rpt.columns || []).filter(c => validMods.has(parseColKey(c).mod));
    const fils = (rpt.filters || []).filter(f => validMods.has(parseColKey(f.fieldKey || '').mod));
    setRpt(p => ({ ...p, joinModules: updated, columns: cols, filters: fils }));
  };

  const toggleColumn = (key) => {
    const cols = rpt.columns || [];
    upd('columns', cols.includes(key) ? cols.filter(c => c !== key) : [...cols, key]);
  };

  const moveColumn = (idx, dir) => {
    const cols = [...(rpt.columns || [])];
    const target = idx + dir;
    if (target < 0 || target >= cols.length) return;
    [cols[idx], cols[target]] = [cols[target], cols[idx]];
    upd('columns', cols);
  };

  const addFilter = () => {
    const firstField = allFields[0];
    upd('filters', [...(rpt.filters || []), { id: 'fl_' + Date.now(), fieldKey: firstField?.key || '', op: 'contains', value: '' }]);
  };

  const updFilter = (idx, ch) => upd('filters', (rpt.filters || []).map((f, i) => i === idx ? { ...f, ...ch } : f));
  const removeFilter = (idx) => upd('filters', (rpt.filters || []).filter((_, i) => i !== idx));

  return (
    <div className="card">
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{rpt.id ? 'עריכת דוח' : 'דוח חדש'}</h3>

      <div className="form-field" style={{ maxWidth: 400, marginBottom: 20 }}>
        <label>שם הדוח</label>
        <input value={rpt.name} onChange={e => upd('name', e.target.value)} placeholder="הזן שם לדוח..." autoFocus />
      </div>

      {/* Tabs */}
      <div className="rpt-builder-tabs">
        {[
          ['modules', 'מודולים'],
          ['columns', `עמודות (${(rpt.columns || []).length})`],
          ['filters', `פילטרים (${(rpt.filters || []).length})`],
          ['groupby', 'קיבוץ'],
          ['permissions', `הרשאות${(rpt.viewerProfileIds?.length || rpt.viewerUserIds?.length) ? ' ●' : ''}`],
        ].map(([id, label]) => (
          <button key={id} className={`rpt-builder-tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="rpt-builder-body">
        {/* ── Modules Tab ── */}
        {activeTab === 'modules' && (
          <div>
            <p className="rpt-hint">בחר מודול ראשי ומודולים נוספים לשילוב בדוח</p>

            <div className="form-field" style={{ maxWidth: 300, marginBottom: 20 }}>
              <label style={{ fontWeight: 600 }}>מודול ראשי</label>
              <select value={rpt.module} onChange={e => { upd('module', e.target.value); upd('joinModules', []); upd('columns', []); upd('filters', []); upd('groupBy', ''); }}>
                {Object.entries(REPORT_MODULES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {availableJoins.length > 0 && (
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                  מודולים נוספים (קשורים ל{REPORT_MODULES[rpt.module]?.label})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {availableJoins.map(j => {
                    const isSelected = (rpt.joinModules || []).includes(j.module);
                    return (
                      <button key={j.module} onClick={() => toggleJoinModule(j.module)}
                        className={`rpt-join-chip ${isSelected ? 'active' : ''}`}>
                        {isSelected ? <><i className="ti ti-check" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> </> : '+ '}{j.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(rpt.joinModules || []).length > 0 && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6 }}>מבנה הדוח:</div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{REPORT_MODULES[rpt.module]?.label}</span>
                  {(rpt.joinModules || []).map(jm => (
                    <span key={jm}> ← <span style={{ fontWeight: 600 }}>{REPORT_MODULES[jm]?.label}</span></span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  יוצגו רק רשומות מהמודול הראשי שיש להן קשר למודולים הנוספים
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Columns Tab ── */}
        {activeTab === 'columns' && (
          <div>
            <p className="rpt-hint">בחר עמודות להצגה בדוח מכל המודולים</p>
            <div className="rpt-columns-grid">
              <div>
                <div className="rpt-subtitle">שדות זמינים</div>
                {/* Group by module */}
                {[rpt.module, ...(rpt.joinModules || [])].map(mod => {
                  const m = REPORT_MODULES[mod];
                  if (!m) return null;
                  const available = m.fields.filter(f => !(rpt.columns || []).includes(`${mod}:${f.id}`));
                  if (!available.length) return null;
                  return (
                    <div key={mod} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{m.label}</div>
                      <div className="rpt-field-list">
                        {available.map(f => (
                          <button key={f.id} className="rpt-field-chip" onClick={() => toggleColumn(`${mod}:${f.id}`)}>+ {f.label}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="rpt-subtitle">עמודות נבחרות (לפי סדר)</div>
                <div className="rpt-selected-list">
                  {(rpt.columns || []).map((colKey, idx) => {
                    const { mod, fieldId } = parseColKey(colKey);
                    const field = getFieldDef(mod, fieldId);
                    const modLabel = REPORT_MODULES[mod]?.label || mod;
                    return (
                      <div key={colKey} className="rpt-selected-item">
                        <span className="rpt-order-badge">{idx + 1}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                          {field?.label || fieldId}
                          {(rpt.joinModules || []).length > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 4 }}>({modLabel})</span>}
                        </span>
                        <button className="rpt-move-btn" onClick={() => moveColumn(idx, -1)} disabled={idx === 0}>▲</button>
                        <button className="rpt-move-btn" onClick={() => moveColumn(idx, 1)} disabled={idx === (rpt.columns || []).length - 1}>▼</button>
                        <button className="rpt-remove-btn" onClick={() => toggleColumn(colKey)} aria-label="הסר עמודה"><i className="ti ti-x" aria-hidden="true" /></button>
                      </div>
                    );
                  })}
                  {(rpt.columns || []).length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 12, padding: 16, textAlign: 'center' }}>בחר שדות מהרשימה</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters Tab ── */}
        {activeTab === 'filters' && (
          <div>
            <p className="rpt-hint">הגדר תנאי סינון לנתונים</p>
            {(rpt.filters || []).map((fl, idx) => (
              <div key={fl.id} className="rpt-filter-row">
                <select value={fl.fieldKey || ''} onChange={e => updFilter(idx, { fieldKey: e.target.value })} style={{ flex: 1 }}>
                  {allFields.map(f => <option key={f.key} value={f.key}>{f.label} ({f.modLabel})</option>)}
                </select>
                <select value={fl.op} onChange={e => updFilter(idx, { op: e.target.value })} style={{ width: 120 }}>
                  {REPORT_FILTER_OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {!['empty', 'not_empty'].includes(fl.op) && (
                  <input value={fl.value || ''} onChange={e => updFilter(idx, { value: e.target.value })} placeholder="ערך..." style={{ flex: 1 }} />
                )}
                <button className="rpt-remove-btn" onClick={() => removeFilter(idx)} aria-label="הסר פילטר"><i className="ti ti-x" aria-hidden="true" /></button>
              </div>
            ))}
            <button className="btn btn-secondary" onClick={addFilter} style={{ fontSize: 12, marginTop: 8 }}>+ הוסף פילטר</button>
          </div>
        )}

        {/* ── GroupBy Tab ── */}
        {activeTab === 'groupby' && (
          <div>
            <p className="rpt-hint">בחר שדה לקיבוץ שורות (אופציונלי)</p>
            <select value={rpt.groupBy || ''} onChange={e => upd('groupBy', e.target.value)} style={{ maxWidth: 350 }}>
              <option value="">— ללא קיבוץ —</option>
              {allFields.map(f => <option key={f.key} value={f.key}>{f.label} ({f.modLabel})</option>)}
            </select>
          </div>
        )}

        {/* ── Permissions Tab ── */}
        {activeTab === 'permissions' && (
          <ReportPermissionsTab rpt={rpt} upd={upd} users={users} permSearch={permSearch} setPermSearch={setPermSearch} />
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-primary" onClick={() => {
          if (!rpt.name?.trim()) { alert('יש להזין שם לדוח'); return; }
          if (!(rpt.columns || []).length) { alert('יש לבחור לפחות עמודה אחת'); return; }
          onSave(rpt);
        }}>שמור דוח</button>
        <button className="btn btn-ghost" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

// ── Report Runner ───────────────────────────────────────────────────────────
function ReportRunner({ report }) {
  const [rawData, setRawData] = useState({}); // { moduleName: rows[] }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [showSendEmail, setShowSendEmail] = useState(false);

  const allModules = [report.module, ...(report.joinModules || [])];
  const allFields = useMemo(() => getAllFields(report.module, report.joinModules), [report.module, report.joinModules]);
  const selectedFields = useMemo(() => (report.columns || []).map(key => {
    const { mod, fieldId } = parseColKey(key);
    const field = getFieldDef(mod, fieldId);
    return field ? { key, mod, fieldId, ...field } : null;
  }).filter(Boolean), [report.columns]);

  // Fetch all needed modules
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fetchAll = async () => {
      const result = {};
      for (const mod of allModules) {
        try { const res = await api.get(`/api/${mod}?limit=5000`); result[mod] = res.data || []; }
        catch { result[mod] = []; }
      }
      if (!cancelled) { setRawData(result); setLoading(false); }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [report.module, JSON.stringify(report.joinModules)]);

  // Join and flatten data
  const joined = useMemo(() => {
    const primary = rawData[report.module] || [];
    if (!primary.length) return [];
    const joins = report.joinModules || [];
    if (!joins.length) {
      // Single module — return primary rows with module prefix
      return primary.map(row => {
        const flat = {};
        Object.keys(row).forEach(k => flat[`${report.module}:${k}`] = row[k]);
        return flat;
      });
    }

    // Multi-module join
    const joinDefs = (REPORT_JOINS[report.module] || []).filter(j => joins.includes(j.module));
    let rows = primary.map(row => {
      const flat = {};
      Object.keys(row).forEach(k => flat[`${report.module}:${k}`] = row[k]);
      flat._primaryId = row.id;
      flat._primaryCustomerId = row.customer_id || row.id; // for customer-based joins
      return flat;
    });

    // For each join module, expand rows
    joinDefs.forEach(jDef => {
      const secData = rawData[jDef.module] || [];
      if (!secData.length) { rows = []; return; } // INNER JOIN — no matches = no rows

      const newRows = [];
      rows.forEach(row => {
        // Determine the join key value
        let joinVal;
        if (jDef.reverse) {
          // Secondary has the FK pointing to primary (e.g., contacts.customer_id → customers.id)
          joinVal = row[`${report.module}:id`];
        } else {
          // Primary has relationship, secondary has FK
          joinVal = row[`${report.module}:id`];
        }

        const matches = secData.filter(s => {
          if (jDef.reverse) return s.id === row[`${report.module}:${jDef.fk}`];
          if (jDef.siblingFk) return s[jDef.fk] === row[`${report.module}:${jDef.siblingFk}`];
          return s[jDef.fk] === joinVal;
        });

        if (matches.length === 0) return; // INNER JOIN — skip if no match
        matches.forEach(match => {
          const newRow = { ...row };
          Object.keys(match).forEach(k => newRow[`${jDef.module}:${k}`] = match[k]);
          newRows.push(newRow);
        });
      });
      rows = newRows;
    });

    return rows;
  }, [rawData, report.module, report.joinModules]);

  // Apply filters
  const filtered = useMemo(() => {
    let rows = [...joined];
    (report.filters || []).forEach(fl => {
      if (!fl.fieldKey) return;
      rows = rows.filter(row => applyFilter(row[fl.fieldKey], fl.op, fl.value));
    });
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(row => selectedFields.some(f => String(row[f.key] || '').toLowerCase().includes(q)));
    }
    // Sort
    if (sortCol) {
      const field = selectedFields.find(f => f.key === sortCol);
      rows.sort((a, b) => {
        let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
        if (field?.type === 'number') { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
        else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [joined, report.filters, search, sortCol, sortDir, selectedFields]);

  // Group data
  const groups = useMemo(() => {
    if (!report.groupBy) return null;
    const { mod, fieldId } = parseColKey(report.groupBy);
    const field = getFieldDef(mod, fieldId);
    const map = new Map();
    filtered.forEach(row => {
      const key = getDisplayValue(row[report.groupBy], field);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return map;
  }, [filtered, report.groupBy]);

  const handleSort = (colKey) => {
    if (sortCol === colKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(colKey); setSortDir('asc'); }
  };

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = selectedFields.map(f => (report.joinModules?.length ? `${f.modLabel} — ${f.label}` : f.label));
    const wsData = [headers, ...filtered.map(row => selectedFields.map(f => getDisplayValue(row[f.key], f)))];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${report.name || 'דוח'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderRow = (row, idx) => (
    <tr key={idx} style={{ background: idx % 2 === 0 ? '' : 'var(--bg-elevated)' }}>
      {selectedFields.map(f => (
        <td key={f.key} style={f.type === 'number' ? { direction: 'ltr', textAlign: 'left' } : undefined}>
          {getDisplayValue(row[f.key], f)}
        </td>
      ))}
    </tr>
  );

  if (loading) return <div className="card" style={{ textAlign: 'center', padding: 60 }}>טוען נתונים...</div>;

  return (
    <div className="card">
      <div className="rpt-run-header">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, display: 'inline', marginLeft: 10 }}>{report.name}</h3>
          <span className="badge badge-accent">{REPORT_MODULES[report.module]?.label}</span>
          {(report.joinModules || []).map(jm => (
            <span key={jm} className="badge badge-info" style={{ marginRight: 4 }}>{REPORT_MODULES[jm]?.label}</span>
          ))}
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 8 }}>
            {filtered.length} / {joined.length} רשומות
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש בתוצאות..." style={{ maxWidth: 220 }} />
          <button className="btn btn-secondary" onClick={handleExport} disabled={!filtered.length} style={{ fontSize: 12 }}>ייצוא Excel</button>
          <button className="btn btn-secondary" onClick={() => setShowSendEmail(true)} disabled={!filtered.length} style={{ fontSize: 12 }}>
            <i className="ti ti-mail" aria-hidden="true" style={{ marginLeft: 4 }} /> שלח במייל
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>אין תוצאות</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {selectedFields.map(f => (
                  <th key={f.key} onClick={() => handleSort(f.key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    {f.label}
                    {(report.joinModules || []).length > 0 && <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 400 }}>{f.modLabel}</div>}
                    {sortCol === f.key && <span style={{ marginRight: 4 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups ? (
                Array.from(groups.entries()).map(([groupName, rows]) => (
                  <React.Fragment key={groupName}>
                    <tr><td colSpan={selectedFields.length} className="rpt-group-header">{groupName} ({rows.length})</td></tr>
                    {rows.map((row, i) => renderRow(row, i))}
                  </React.Fragment>
                ))
              ) : (
                filtered.map((row, i) => renderRow(row, i))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showSendEmail && (
        <SendReportModal
          report={report}
          selectedFields={selectedFields}
          filtered={filtered}
          onClose={() => setShowSendEmail(false)}
        />
      )}
    </div>
  );
}
