import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal } from '../../hooks/useDeals';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useFamilies } from '../../hooks/useProducts';
import { DEALS_COLUMNS, EMPTY_DEAL, DEAL_STAGES, DEAL_TYPES, DEAL_PRIORITIES, DEAL_STAGE_COLORS } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import DataTable from '../Layout/DataTable';
import ModuleTopbar from '../Layout/ModuleTopbar';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import '../Customers/CustomerModal.css';
import './DealEditor.css';

export default function DealsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const { data, isLoading, error } = useDeals({ page, limit: 50, search, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: contactData } = useContacts({ limit: 500 });
  const { data: famData } = useFamilies();
  const createMut = useCreateDeal();
  const updateMut = useUpdateDeal();
  const deleteMut = useDeleteDeal();

  const deals = data?.data || [];
  const filteredDeals = stageFilter ? deals.filter(d => d.stage === stageFilter) : deals;
  const customers = custData?.data || [];
  const allContacts = contactData?.data || [];
  const families = (famData?.data || []).sort((a, b) => {
    const na = parseFloat((a.num || '').replace(/[^0-9.]/g, '')) || 99999;
    const nb = parseFloat((b.num || '').replace(/[^0-9.]/g, '')) || 99999;
    return na - nb;
  });

  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';
  const getContactName = (id) => { const c = allContacts.find(x => x.id === id); return c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '—'; };
  const custContacts = useMemo(() => editItem?.customer_id ? allContacts.filter(c => c.customer_id === editItem.customer_id) : [], [editItem?.customer_id, allContacts]);

  // Open edit from URL (e.g. navigating from relations map)
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && deals.length) {
      const deal = deals.find(d => d.id === editId);
      if (deal) { setEditItem({ ...deal }); setSearchParams({}, { replace: true }); }
    }
  }, [searchParams, deals]); // eslint-disable-line

  const getSolutions = () => {
    if (!editItem) return [];
    if (Array.isArray(editItem.solutions)) return editItem.solutions;
    if (typeof editItem.solutions === 'string') { try { return JSON.parse(editItem.solutions); } catch { return []; } }
    return [];
  };

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id);
      case 'contact_id': return getContactName(row.contact_id);
      case 'stage': {
        const color = DEAL_STAGE_COLORS[row.stage] || '#94A3B8';
        const info = DEAL_STAGES.find(([k]) => k === row.stage);
        return <span style={{ padding: '3px 10px', borderRadius: 20, background: color + '22', color, fontWeight: 600, fontSize: 12 }}>{info ? info[1] : row.stage || '—'}</span>;
      }
      case 'priority': {
        const p = Number(row.priority) || 3;
        const colors = ['', '#10B981', '#60A5FA', '#F59E0B', '#F97316', '#EF4444'];
        return <span style={{ fontWeight: 700, color: colors[p] || '#94A3B8' }}>{'★'.repeat(p)}</span>;
      }
      case 'expected_one_time':
      case 'expected_recurring':
        return row[key] ? `₪${Number(row[key]).toLocaleString()}` : '—';
      case 'expected_close_date':
      case 'actual_close_date':
        return row[key] ? new Date(row[key]).toLocaleDateString('he-IL') : '—';
      case 'created_at':
        return row.created_at ? new Date(row.created_at).toLocaleDateString('he-IL') : '—';
      default: return row[key] || '—';
    }
  };

  const handleSave = async () => {
    const form = { ...editItem };
    if (!form.deal_name?.trim()) { alert('שם עסקה הוא שדה חובה'); return; }
    if (form.stage === 'חתומה' && !form.actual_close_date) {
      form.actual_close_date = new Date().toISOString().split('T')[0];
    }
    if (form.id) {
      await updateMut.mutateAsync({ id: form.id, ...form });
    } else {
      await createMut.mutateAsync(form);
    }
    setEditItem(null);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteMut.mutateAsync(confirmDel.id);
    setConfirmDel(null);
  };

  const upd = (k, v) => {
    setEditItem(p => {
      const next = { ...p, [k]: v };
      if (k === 'customer_id') next.contact_id = '';
      if (k === 'stage') {
        if (v === 'חתומה') {
          next.actual_close_date = new Date().toISOString().split('T')[0];
        } else if (p.stage === 'חתומה' && v !== 'חתומה') {
          next.actual_close_date = '';
        }
      }
      return next;
    });
  };

  const addSolution = () => upd('solutions', [...getSolutions(), { family_id: '', desc: '', qty: 1 }]);
  const updSolution = (idx, key, val) => upd('solutions', getSolutions().map((s, i) => i === idx ? { ...s, [key]: val } : s));
  const removeSolution = (idx) => upd('solutions', getSolutions().filter((_, i) => i !== idx));

  const dealStats = useMemo(() => {
    const active = deals.filter(d => d.stage && d.stage !== 'הפסד' && d.stage !== 'חתומה').length;
    const won = deals.filter(d => d.stage === 'חתומה').length;
    const potentialOT = deals.filter(d => d.stage !== 'הפסד').reduce((s, d) => s + (parseFloat(d.expected_one_time) || 0), 0);
    const potentialRec = deals.filter(d => d.stage !== 'הפסד').reduce((s, d) => s + (parseFloat(d.expected_recurring) || 0), 0);
    return [
      { label: 'עסקאות פעילות', value: active, color: 'var(--accent)' },
      { label: 'עסקאות שנסגרו', value: won, color: 'var(--success)' },
      { label: 'פוטנציאל חד"פ', value: `₪${Math.round(potentialOT).toLocaleString()}`, color: 'var(--info)' },
      { label: 'פוטנציאל שוטף', value: `₪${Math.round(potentialRec).toLocaleString()}`, color: 'var(--warning)' },
    ];
  }, [deals]);

  // ── Deal Editor (full page) ───────────────────────────────────────────
  if (editItem) {
    const currentStageIdx = DEAL_STAGES.findIndex(([k]) => k === editItem.stage);
    const isLost = editItem.stage === 'הפסד';
    const isWon = editItem.stage === 'חתומה';

    return (
      <div className="animate-in">
        {/* Top bar */}
        <div className="tdb-topbar" style={{ marginBottom: 16 }}>
          <div className="tdb-topbar-left">
            <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>← חזרה לעסקאות</button>
            <span className="tdb-topbar-icon"><i className="ti ti-briefcase" aria-hidden="true" /></span>
            <div>
              <h1 className="tdb-topbar-title">{editItem.id ? `עריכת עסקה — ${editItem.deal_name || ''}` : 'עסקה חדשה'}</h1>
              {editItem.deal_num && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>#{editItem.deal_num}</div>}
            </div>
          </div>
          <div className="tdb-topbar-right">
            {editItem.customer_id && (
              <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}/relations`)}>
                <i className="ti ti-hierarchy" aria-hidden="true" /> מפת קשרים
              </button>
            )}
            <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>

        {/* Stage Progress Bar */}
        <div className="de-pipeline card">
          <div className="de-pipeline-bar">
            {DEAL_STAGES.filter(([k]) => k !== 'הפסד').map(([key, label, pct], idx) => {
              const isCurrent = key === editItem.stage;
              const isPast = !isLost && currentStageIdx > idx;
              const color = DEAL_STAGE_COLORS[key] || '#94A3B8';
              return (
                <button key={key} className={`de-stage-step${isCurrent ? ' current' : ''}${isPast ? ' done' : ''}`}
                  onClick={() => upd('stage', key)}
                  style={{ '--stage-color': color }}>
                  <div className="de-stage-dot">{isPast ? <i className="ti ti-check" aria-hidden="true" /> : pct + '%'}</div>
                  <div className="de-stage-label">{label}</div>
                </button>
              );
            })}
          </div>
          {/* Lost button separate */}
          <button className={`de-stage-lost${isLost ? ' active' : ''}`} onClick={() => upd('stage', 'הפסד')}>
            הפסד
          </button>
        </div>

        {/* Form body */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 className="form-section-title">פרטי עסקה</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>שם עסקה *</label>
              <input value={editItem.deal_name || ''} onChange={e => upd('deal_name', e.target.value)} autoFocus />
            </div>
            <div className="form-field">
              <label>לקוח</label>
              <select value={editItem.customer_id || ''} onChange={e => upd('customer_id', e.target.value)}>
                <option value="">-- בחר לקוח --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.cust_num ? `${c.cust_num} — ` : ''}{c.company_name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>איש קשר ראשי</label>
              <select value={editItem.contact_id || ''} onChange={e => upd('contact_id', e.target.value)} disabled={!editItem.customer_id}>
                <option value="">-- בחר --</option>
                {custContacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>סוג עסקה</label>
              <select value={editItem.deal_type || 'חדשה'} onChange={e => upd('deal_type', e.target.value)}>
                {DEAL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>שלב עסקה</label>
              <select value={editItem.stage || 'תחילת תהליך'} onChange={e => upd('stage', e.target.value)}
                style={{ color: DEAL_STAGE_COLORS[editItem.stage] || 'var(--text-1)', fontWeight: 600 }}>
                {DEAL_STAGES.map(([k, l, p]) => <option key={k} value={k}>{l} ({p}%)</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>עדיפות</label>
              <select value={editItem.priority || '3'} onChange={e => upd('priority', e.target.value)}>
                {DEAL_PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <OwnerSelect value={editItem.owner} onChange={v => upd('owner', v)} label="בעלי רשומה עסקה" />
          </div>

          {isLost && (
            <div className="form-field" style={{ marginTop: 12 }}>
              <label>סיבת הפסד</label>
              <textarea value={editItem.loss_reason || ''} onChange={e => upd('loss_reason', e.target.value)} rows={2} placeholder="מדוע העסקה הופסדה..." />
            </div>
          )}

          <h3 className="form-section-title">סכומים ותאריכים</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>חד"פ צפוי (₪)</label>
              <input type="number" value={editItem.expected_one_time || ''} onChange={e => upd('expected_one_time', e.target.value)} dir="ltr" />
            </div>
            <div className="form-field">
              <label>שוטף צפוי (₪)</label>
              <input type="number" value={editItem.expected_recurring || ''} onChange={e => upd('expected_recurring', e.target.value)} dir="ltr" />
            </div>
            <div className="form-field">
              <label>סגירה צפויה</label>
              <input type="date" value={editItem.expected_close_date ? editItem.expected_close_date.split('T')[0] : ''} onChange={e => upd('expected_close_date', e.target.value)} dir="ltr" />
            </div>
            <div className="form-field">
              <label>תאריך סגירה בפועל</label>
              <input type="date" value={editItem.actual_close_date ? editItem.actual_close_date.split('T')[0] : ''} onChange={e => upd('actual_close_date', e.target.value)} dir="ltr"
                style={isWon ? { background: '#F0FDF4', fontWeight: 600, color: '#166534' } : {}} />
              {isWon && editItem.actual_close_date && (
                <span style={{ fontSize: 10, color: 'var(--success)', marginTop: 2 }}>הוזן אוטומטית עם סגירת העסקה</span>
              )}
            </div>
          </div>

          <h3 className="form-section-title">פתרונות מוצעים</h3>
          {getSolutions().length > 0 && (
            <div style={{ overflowX: 'auto', marginBottom: 8 }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead><tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 200 }}>משפחת מוצר</th>
                  <th>תיאור</th>
                  <th style={{ width: 70 }}>כמות</th>
                  <th style={{ width: 50 }}></th>
                </tr></thead>
                <tbody>
                  {getSolutions().map((sol, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{idx + 1}</td>
                      <td>
                        <select value={sol.family_id || ''} onChange={e => updSolution(idx, 'family_id', e.target.value)}
                          style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, padding: '4px 0' }}>
                          <option value="">-- משפחה --</option>
                          {families.map(f => <option key={f.id} value={f.id}>{f.num ? `${f.num} — ` : ''}{f.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input value={sol.desc || ''} onChange={e => updSolution(idx, 'desc', e.target.value)} placeholder="תיאור הפתרון..."
                          style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, padding: '4px 0' }} />
                      </td>
                      <td>
                        <input type="number" value={sol.qty || ''} onChange={e => updSolution(idx, 'qty', e.target.value)} min="1" dir="ltr"
                          style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, textAlign: 'center', padding: '4px 0' }} />
                      </td>
                      <td><button type="button" className="action-btn delete" onClick={() => removeSolution(idx)} title="הסר"><i className="ti ti-x" aria-hidden="true" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button type="button" className="btn btn-secondary" onClick={addSolution} style={{ fontSize: 12 }}>+ הוסף פתרון</button>

          <div className="form-field" style={{ marginTop: 20 }}>
            <label>הערות</label>
            <textarea value={editItem.notes || ''} onChange={e => upd('notes', e.target.value)} rows={3} placeholder="הערות, פרטים נוספים..." />
          </div>

          {/* Linked quotes for this deal */}
          {editItem.id && <LinkedQuotes dealId={editItem.id} onOpen={(qId) => navigate(`/quotes/${qId}/edit`)} />}
        </div>
      </div>
    );
  }

  // ── Deals List ────────────────────────────────────────────────────────
  return (
    <>
      <ModuleTopbar icon="ti-currency-shekel" title="עסקאות">
        <button className="tdb-calendar-btn" onClick={() => setEditItem({ ...EMPTY_DEAL, solutions: [] })}>
          <i className="ti ti-plus" aria-hidden="true" /> עסקה חדשה
        </button>
      </ModuleTopbar>
      <StatsBar stats={dealStats} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={`btn ${!stageFilter ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStageFilter('')} style={{ fontSize: 12, padding: '5px 12px' }}>
          הכל ({deals.length})
        </button>
        {DEAL_STAGES.map(([key, label]) => {
          const count = deals.filter(d => d.stage === key).length;
          const color = DEAL_STAGE_COLORS[key];
          return (
            <button key={key} className={`btn ${stageFilter === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStageFilter(stageFilter === key ? '' : key)}
              style={{ fontSize: 12, padding: '5px 12px', ...(stageFilter !== key ? { color, borderColor: color + '44' } : {}) }}>
              {label} ({count})
            </button>
          );
        })}
      </div>
      <DataTable
        columns={DEALS_COLUMNS}
        data={filteredDeals}
        total={data?.total || 0}
        page={page}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        error={error}
        onSearchChange={s => { setSearch(s); setPage(1); }}
        onPageChange={setPage}
        onEdit={row => setEditItem({ ...row })}
        onDelete={row => setConfirmDel(row)}
        renderCell={renderCell}
        storageKey="biz_deals_cols_v3"
        hideHeader
        customers={customers}
        onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }}
      />

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת עסקה</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את <strong>{confirmDel.deal_name}</strong>?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleteMut.isPending}>{deleteMut.isPending ? 'מוחק...' : 'מחק'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Linked Quotes ─────────────────────────────────────────────────────────
function LinkedQuotes({ dealId, onOpen }) {
  const { data } = useQuery({
    queryKey: ['quotes-by-deal', dealId],
    queryFn: () => api.get(`/api/quotes?deal_id=${dealId}&limit=100`),
    enabled: !!dealId,
    staleTime: 30000,
  });
  // Filter client-side by deal_id in case server doesn't support filter
  const allQuotes = data?.data || [];
  const quotes = allQuotes.filter(q => q.deal_id === dealId);

  return (
    <div style={{ marginTop: 24 }}>
      <h3 className="form-section-title">הצעות מחיר משויכות ({quotes.length})</h3>
      {quotes.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          אין הצעות מחיר משויכות לעסקה זו
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr>
              <th style={{ width: 110 }}>מס' הצעה</th>
              <th>שם הצעה</th>
              <th style={{ width: 100 }}>שלב</th>
              <th style={{ width: 100 }}>תאריך</th>
              <th style={{ width: 80 }}>פעולות</th>
            </tr></thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(q.id)}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--accent-light)'}
                  onMouseOut={e => e.currentTarget.style.background = ''}>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{q.quote_num || '—'}</td>
                  <td>{q.quote_name || '—'}</td>
                  <td>{q.stage || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{q.quote_date ? new Date(q.quote_date).toLocaleDateString('he-IL') : '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="action-btn edit" onClick={() => onOpen(q.id)} title="ערוך"><i className="ti ti-edit" aria-hidden="true" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
