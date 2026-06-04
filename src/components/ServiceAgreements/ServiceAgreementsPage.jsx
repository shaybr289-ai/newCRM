import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useServiceAgreements, useCreateAgreement, useUpdateAgreement, useDeleteAgreement } from '../../hooks/useServiceAgreements';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useSites } from '../../hooks/useSites';
import { SA_COLUMNS, EMPTY_AGREEMENT, AGREEMENT_TYPES, SERVICE_TYPES, SERVICE_SCOPES, AUTO_RENEW_OPTIONS } from '../../utils/constants';
import { useLookups } from '../../hooks/useLookups';
import { Icon, ICONS } from '../../utils/icons';
import DataTable from '../Layout/DataTable';
import ModuleTopbar from '../Layout/ModuleTopbar';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import { usePerms } from '../../hooks/usePerms';
import DeleteConfirmModal from '../Layout/DeleteConfirmModal';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

export default function ServiceAgreementsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canView, canCreate, canEdit, canDelete, canUseButton } = usePerms('serviceagreements');
  const { customerStatuses } = useLookups();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const isNew = searchParams.get('new');
    const custId = searchParams.get('customer_id');
    if (editId) {
      setSearchParams({}, { replace: true });
      api.get(`/api/service-agreements/${editId}`).then(item => { if (item) { setViewOnly(false); setEditItem(item); } });
    } else if (viewId) {
      setSearchParams({}, { replace: true });
      api.get(`/api/service-agreements/${viewId}`).then(item => { if (item) { setViewOnly(true); setEditItem(item); } });
    } else if (isNew) {
      setSearchParams({}, { replace: true });
      setViewOnly(false);
      setEditItem({ ...EMPTY_AGREEMENT, customer_id: custId || '' });
    }
  }, [searchParams]); // eslint-disable-line

  const { data, isLoading, error } = useServiceAgreements({ page, limit: 50, search, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: contactData } = useContacts({ limit: 500 });
  const { data: siteData } = useSites({ limit: 500 });
  const createMut = useCreateAgreement();
  const updateMut = useUpdateAgreement();
  const deleteMut = useDeleteAgreement();

  const agreements = data?.data || [];
  const filteredAgreements = statusFilter ? agreements.filter(a => a.status === statusFilter) : agreements;
  const customers = custData?.data || [];
  const allContacts = contactData?.data || [];
  const allSites = siteData?.data || [];

  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';
  const getContactName = (id) => { const c = allContacts.find(c => c.id === id); return c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '—'; };
  const getTypeLabel = (val, list) => (list.find(([k]) => k === val) || ['', '—'])[1];

  // Filtered contacts & sites by selected customer
  const custContacts = useMemo(() => editItem?.customer_id ? allContacts.filter(c => c.customer_id === editItem.customer_id) : [], [editItem?.customer_id, allContacts]);
  const custSites = useMemo(() => editItem?.customer_id ? allSites.filter(s => s.customer_id === editItem.customer_id) : [], [editItem?.customer_id, allSites]);

  // Auto-generate agreement name
  const buildAutoName = (item) => {
    const parts = [
      getTypeLabel(item.agreement_type, AGREEMENT_TYPES),
      getTypeLabel(item.service_type, SERVICE_TYPES),
      getTypeLabel(item.service_scope, SERVICE_SCOPES),
    ].filter(p => p && p !== '—');
    return parts.join(' — ') || '';
  };

  // Auto-calculate end date
  const calcEndDate = (startDate, months) => {
    if (!startDate || !months) return '';
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + parseInt(months));
    return d.toISOString().split('T')[0];
  };

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id);
      case 'contact_id': return getContactName(row.contact_id);
      case 'agreement_type': return getTypeLabel(row.agreement_type, AGREEMENT_TYPES);
      case 'service_type': return getTypeLabel(row.service_type, SERVICE_TYPES);
      case 'service_scope': return getTypeLabel(row.service_scope, SERVICE_SCOPES);
      case 'status':
        return <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
          {row.status === 'active' ? 'פעיל' : 'לא פעיל'}</span>;
      case 'auto_renew':
        return row.auto_renew === 'yes' ? <span style={{ color: 'var(--success)', fontWeight: 600 }}><i className="ti ti-refresh" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> כן</span> : 'לא';
      case 'start_date':
      case 'end_date':
      case 'created_at':
        return row[key] ? new Date(row[key]).toLocaleDateString('he-IL') : '—';
      case 'owner_id': return row.owner_name || '—';
      default: return row[key] || '—';
    }
  };

  const upd = (k, v) => {
    setEditItem(p => {
      const next = { ...p, [k]: v };
      // Auto-update agreement name when type fields change
      if (['agreement_type', 'service_type', 'service_scope'].includes(k)) {
        next.agreement_name = buildAutoName(next);
      }
      // Auto-calculate end date
      if (k === 'start_date' || k === 'period_months') {
        next.end_date = calcEndDate(
          k === 'start_date' ? v : next.start_date,
          k === 'period_months' ? v : next.period_months
        );
      }
      // Clear contact & sites on customer change
      if (k === 'customer_id') {
        next.contact_id = '';
        next.site_ids = [];
      }
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editItem.customer_id) { alert('יש לבחור לקוח'); return; }
    const toSave = { ...editItem };
    if (!toSave.agreement_name?.trim()) toSave.agreement_name = buildAutoName(toSave) || 'הסכם חדש';
    if (toSave.id) {
      await updateMut.mutateAsync({ id: toSave.id, ...toSave });
    } else {
      await createMut.mutateAsync(toSave);
    }
    setEditItem(null);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteMut.mutateAsync(confirmDel.id);
    if (editItem?.id === confirmDel.id) setEditItem(null);
    setConfirmDel(null);
  };

  const saStats = useMemo(() => [
    { label: 'סה"כ הסכמים', value: data?.total || agreements.length, color: 'var(--accent)' },
    { label: 'פעילים', value: agreements.filter(a => a.status === 'active').length, color: 'var(--success)' },
    { label: 'חידוש אוטומטי', value: agreements.filter(a => a.auto_renew === 'yes').length, color: 'var(--info)' },
    { label: 'לקוחות ייחודיים', value: new Set(agreements.map(a => a.customer_id)).size, color: 'var(--warning)' },
  ], [agreements, data?.total]);

  // ── Editor (full page) ────────────────────────────────────────────────
  if (editItem) return (
    <div className="animate-in">
      <div className="tdb-topbar" style={{ marginBottom: 16 }}>
        <div className="tdb-topbar-left">
          <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>← חזרה להסכמים</button>
          {editItem.customer_id && (
            <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}`)}>
              <i className="ti ti-building-store" aria-hidden="true" /> לכרטיס לקוח
            </button>
          )}
          <span className="tdb-topbar-icon"><i className="ti ti-file-description" aria-hidden="true" /></span>
          <div>
            <h1 className="tdb-topbar-title">{viewOnly ? `צפייה — ${editItem.agreement_name || ''}` : editItem.id ? `עריכת הסכם — ${editItem.agreement_name || ''}` : 'הסכם שירות חדש'}</h1>
            {editItem.agreement_num && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>#{editItem.agreement_num}</div>}
          </div>
          {viewOnly && <span style={{ fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B66', borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>צפייה בלבד</span>}
        </div>
        <div className="tdb-topbar-right">
          {!viewOnly && editItem.id && canDelete && canUseButton('btn_delete') && (
            <button className="tdb-calendar-btn" style={{ background: 'rgba(220,38,38,0.18)', borderColor: 'rgba(220,38,38,0.5)' }} onClick={() => setConfirmDel(editItem)}>
              <i className="ti ti-trash" aria-hidden="true" /> מחק
            </button>
          )}
          {!viewOnly && canUseButton('btn_save') && (
            <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור'}
            </button>
          )}
        </div>
      </div>
      <div className="card">
        <fieldset disabled={viewOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
              <h3 className="form-section-title">פרטי ההסכם</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>לקוח *</label>
                  <select value={editItem.customer_id || ''} onChange={e => upd('customer_id', e.target.value)}>
                    <option value="">-- בחר לקוח --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.cust_num ? `${c.cust_num} — ` : ''}{c.company_name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>איש קשר</label>
                  <select value={editItem.contact_id || ''} onChange={e => upd('contact_id', e.target.value)} disabled={!editItem.customer_id}>
                    <option value="">-- בחר --</option>
                    {custContacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>סוג הסכם</label>
                  <select value={editItem.agreement_type || ''} onChange={e => upd('agreement_type', e.target.value)}>
                    <option value="">-- בחר --</option>
                    {AGREEMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>מודל שירות</label>
                  <select value={editItem.service_type || ''} onChange={e => upd('service_type', e.target.value)}>
                    <option value="">-- בחר --</option>
                    {SERVICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>היקף שירות</label>
                  <select value={editItem.service_scope || ''} onChange={e => upd('service_scope', e.target.value)}>
                    <option value="">-- בחר --</option>
                    {SERVICE_SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>סטטוס</label>
                  <select value={editItem.status || 'active'} onChange={e => upd('status', e.target.value)}>
                    {customerStatuses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Auto-generated name */}
              <div className="form-field" style={{ marginTop: 14, marginBottom: 14 }}>
                <label>שם הסכם (נוצר אוטומטית)</label>
                <input value={editItem.agreement_name || ''} onChange={e => upd('agreement_name', e.target.value)}
                  style={{ background: editItem.agreement_name ? '#F0FDF4' : '', fontWeight: 600, color: '#166534' }}
                  placeholder="ייווצר אוטומטית מסוג ההסכם, מודל השירות וההיקף" />
              </div>

              <h3 className="form-section-title">תקופה ותנאים</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>תאריך התחלה</label>
                  <input type="date" value={editItem.start_date ? editItem.start_date.split('T')[0] : ''} onChange={e => upd('start_date', e.target.value)} dir="ltr" />
                </div>
                <div className="form-field">
                  <label>תקופה (חודשים)</label>
                  <input type="number" value={editItem.period_months || ''} onChange={e => upd('period_months', e.target.value)} dir="ltr" min="1" />
                </div>
                <div className="form-field">
                  <label>תאריך סיום</label>
                  <input value={editItem.end_date ? (editItem.end_date.includes('T') ? editItem.end_date.split('T')[0] : editItem.end_date) : '—'} readOnly
                    style={{ background: '#FEF3C7', color: '#92400E', fontWeight: 600 }} />
                </div>
                <div className="form-field">
                  <label>חידוש אוטומטי</label>
                  <select value={editItem.auto_renew || 'no'} onChange={e => upd('auto_renew', e.target.value)}>
                    {AUTO_RENEW_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <h3 className="form-section-title">פרטים נוספים</h3>
              <div className="form-grid">
                <OwnerSelect value={editItem.owner_id} onChange={v => upd('owner_id', v)} label="בעלי רשומה הסכם שירות" />
                <div className="form-field">
                  <label>מספר CRM חיצוני</label>
                  <input value={editItem.crm_customer_num || ''} onChange={e => upd('crm_customer_num', e.target.value)} dir="ltr" />
                </div>
              </div>
              <div className="form-field" style={{ marginTop: 14 }}>
                <label>תיאור / תנאים מיוחדים</label>
                <textarea value={editItem.description || ''} onChange={e => upd('description', e.target.value)} rows={3}
                  placeholder="הערות, תנאים מיוחדים..." />
              </div>

              {/* Sites under agreement — badge chips */}
              {editItem.customer_id && custSites.length > 0 && (() => {
                const siteIds = Array.isArray(editItem.site_ids) ? editItem.site_ids
                  : (typeof editItem.site_ids === 'string' ? (() => { try { return JSON.parse(editItem.site_ids); } catch { return []; } })() : []);
                const toggleSite = (siteId) => {
                  const updated = siteIds.includes(siteId) ? siteIds.filter(id => id !== siteId) : [...siteIds, siteId];
                  upd('site_ids', updated);
                };
                return (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8, color: 'var(--text-1)' }}>
                      אתרי לקוח שבהסכם
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {custSites.map(site => {
                        const checked = siteIds.includes(site.id);
                        return (
                          <button key={site.id} type="button" onClick={() => toggleSite(site.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 14px', borderRadius: 20,
                              border: checked ? '2px solid var(--accent)' : '1px solid var(--border)',
                              background: checked ? 'var(--accent)' : 'var(--bg-card)',
                              color: checked ? 'white' : 'var(--text-2)',
                              cursor: 'pointer', fontSize: 13, fontWeight: checked ? 600 : 400,
                              fontFamily: "'Poppins', sans-serif",
                              transition: 'all 0.2s',
                            }}>
                            {checked && <i className="ti ti-check" aria-hidden="true" style={{ fontSize: 12, verticalAlign: '-2px', marginLeft: 4 }} />}
                            {site.site_name}
                            {site.city && <span style={{ fontSize: 11, opacity: 0.8 }}>{site.city}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
        </fieldset>
      </div>
    </div>
  );

  // ── List ───────────────────────────────────────────────────────────────
  return (
    <>
      <ModuleTopbar icon="ti-file-certificate" title="הסכמי שירות">
        {canCreate && canUseButton('btn_new') && (
          <button className="tdb-calendar-btn" onClick={() => setEditItem({ ...EMPTY_AGREEMENT })}>
            <i className="ti ti-plus" aria-hidden="true" /> הסכם חדש
          </button>
        )}
      </ModuleTopbar>
      <StatsBar stats={saStats} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['', 'הכל'], ['active', 'פעיל'], ['inactive', 'לא פעיל']].map(([key, label]) => {
          const count = key ? agreements.filter(a => a.status === key).length : agreements.length;
          const color = key === 'active' ? '#10B981' : key === 'inactive' ? '#94A3B8' : null;
          return (
            <button key={key} className={`btn ${statusFilter === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(key)}
              style={{ fontSize: 12, padding: '5px 12px', ...(statusFilter !== key && color ? { color, borderColor: color + '44' } : {}) }}>
              {label} ({count})
            </button>
          );
        })}
      </div>
      <DataTable columns={SA_COLUMNS} data={filteredAgreements} total={data?.total || 0} page={page} totalPages={data?.totalPages || 1}
        isLoading={isLoading} error={error} onSearchChange={s => { setSearch(s); setPage(1); }} onPageChange={setPage}
        onEdit={canEdit ? row => { setViewOnly(false); setEditItem({ ...row }); } : undefined}
        onView={!canEdit && canView ? row => { setViewOnly(true); setEditItem({ ...row }); } : undefined}
        onDelete={canDelete ? row => setConfirmDel(row) : undefined}
        renderCell={renderCell} storageKey="biz_sa_cols_v2" hideHeader
        customers={customers} onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }} />
      {confirmDel && (
        <DeleteConfirmModal
          title="מחיקת הסכם שירות"
          name={confirmDel.agreement_name || confirmDel.agreement_num}
          cascade="מחיקת הסכם השירות תסיר אותו לצמיתות. פעולה זו אינה הפיכה."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          isPending={deleteMut.isPending}
        />
      )}
    </>
  );
}
