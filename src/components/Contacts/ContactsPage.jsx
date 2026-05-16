import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '../../hooks/useContacts';
import { useCustomers } from '../../hooks/useCustomers';
import { useSites, useCreateSite } from '../../hooks/useSites';
import { CONTACTS_COLUMNS, EMPTY_CONTACT, STATUS_OPTIONS, EMPTY_SITE } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import DataTable from '../Layout/DataTable';
import ModuleTopbar from '../Layout/ModuleTopbar';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

export default function ContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(''); // '' | 'primary' | 'vip'
  const [customerFilter, setCustomerFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const { data, isLoading, error } = useContacts({ page, limit: 50, search, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: sitesData } = useSites({ customerId: editItem?.customer_id || '', limit: 500 });
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const deleteMut = useDeleteContact();
  const createSiteMut = useCreateSite();
  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteForm, setNewSiteForm] = useState(null);

  const contacts = data?.data || [];
  const customers = custData?.data || [];
  const sites = sitesData?.data || [];
  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && data?.data) {
      const item = data.data.find(c => c.id === editId);
      if (item) { setEditItem({ ...item }); setSearchParams({}, { replace: true }); }
    }
  }, [searchParams, data]);

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id);
      case 'status':
        return <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{row.status === 'active' ? 'פעיל' : 'לא פעיל'}</span>;
      case 'is_primary': return row.is_primary ? <i className="ti ti-star" aria-hidden="true" style={{ color: '#f59e0b' }} /> : '';
      case 'is_vip': return row.is_vip ? <i className="ti ti-crown" aria-hidden="true" style={{ color: '#8b5cf6' }} /> : '';
      case 'birth_date': return row.birth_date ? new Date(row.birth_date).toLocaleDateString('he-IL') : '—';
      case 'created_at': return row.created_at ? new Date(row.created_at).toLocaleDateString('he-IL') : '—';
      default: return row[key] || '—';
    }
  };

  const handleSave = async () => {
    if (!editItem.first_name?.trim()) { alert('שם פרטי הוא שדה חובה'); return; }
    if (editItem.id) await updateMut.mutateAsync({ id: editItem.id, ...editItem });
    else await createMut.mutateAsync(editItem);
    setEditItem(null);
  };

  const handleDelete = async () => { if (!confirmDel) return; await deleteMut.mutateAsync(confirmDel.id); setConfirmDel(null); };
  const upd = (k, v) => setEditItem(p => ({ ...p, [k]: v }));

  const contactStats = useMemo(() => {
    const total = data?.total || contacts.length;
    const active = contacts.filter(c => c.status === 'active').length;
    const primary = contacts.filter(c => c.is_primary).length;
    const vip = contacts.filter(c => c.is_vip).length;
    return [
      { label: 'סה"כ אנשי קשר', value: total, color: 'var(--accent)' },
      { label: 'פעילים', value: active, color: 'var(--success)' },
      { label: 'ראשיים', value: primary, color: 'var(--info)' },
      { label: 'VIP', value: vip, color: 'var(--warning)' },
    ];
  }, [contacts, data?.total]);

  const filteredContacts = useMemo(() => {
    if (filter === 'primary') return contacts.filter(c => c.is_primary);
    if (filter === 'vip') return contacts.filter(c => c.is_vip);
    return contacts;
  }, [contacts, filter]);

  // ── Editor (full page) ────────────────────────────────────────────────
  if (editItem) return (
    <div className="animate-in">
      <div className="tdb-topbar" style={{ marginBottom: 16 }}>
        <div className="tdb-topbar-left">
          <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>← חזרה לאנשי קשר</button>
          <span className="tdb-topbar-icon"><i className="ti ti-user" aria-hidden="true" /></span>
          <h1 className="tdb-topbar-title">{editItem.id ? `עריכת איש קשר — ${editItem.first_name || ''} ${editItem.last_name || ''}` : 'איש קשר חדש'}</h1>
        </div>
        <div className="tdb-topbar-right">
          <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
      <div className="card">
        <h3 className="form-section-title">פרטים אישיים</h3>
        <div className="form-grid">
          <div className="form-field"><label>שם פרטי *</label><input value={editItem.first_name || ''} onChange={e => upd('first_name', e.target.value)} autoFocus /></div>
          <div className="form-field"><label>שם משפחה</label><input value={editItem.last_name || ''} onChange={e => upd('last_name', e.target.value)} /></div>
          <div className="form-field"><label>לקוח</label>
            <select value={editItem.customer_id || ''} onChange={e => { upd('customer_id', e.target.value); upd('site_id', ''); }}>
              <option value="">-- בחר לקוח --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>אתר</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
              <select value={editItem.site_id || ''} onChange={e => upd('site_id', e.target.value)} disabled={!editItem.customer_id} style={{ flex: 1 }}>
                <option value="">{editItem.customer_id ? '-- ללא שיוך --' : 'בחר לקוח תחילה'}</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.site_name}</option>)}
              </select>
              {editItem.customer_id && (
                <button type="button" className="btn btn-secondary" style={{ fontSize: 12, whiteSpace: 'nowrap', padding: '6px 10px' }}
                  onClick={() => { setNewSiteForm({ ...EMPTY_SITE, customer_id: editItem.customer_id }); setShowNewSite(true); }}>
                  <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> אתר חדש
                </button>
              )}
            </div>
          </div>
          <div className="form-field"><label>תפקיד</label><input value={editItem.role || ''} onChange={e => upd('role', e.target.value)} /></div>
          <div className="form-field"><label>מחלקה</label><input value={editItem.department || ''} onChange={e => upd('department', e.target.value)} /></div>
          <div className="form-field"><label>סטטוס</label>
            <select value={editItem.status || 'active'} onChange={e => upd('status', e.target.value)}>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <h3 className="form-section-title">פרטי התקשרות</h3>
        <div className="form-grid">
          <div className="form-field"><label>אי-מייל</label><input value={editItem.email || ''} onChange={e => upd('email', e.target.value)} dir="ltr" type="email" /></div>
          <div className="form-field"><label>נייד</label><input value={editItem.mobile || ''} onChange={e => upd('mobile', e.target.value)} dir="ltr" type="tel" /></div>
          <div className="form-field"><label>תאריך לידה</label><input value={editItem.birth_date || ''} onChange={e => upd('birth_date', e.target.value)} type="date" dir="ltr" /></div>
          <OwnerSelect value={editItem.created_by} onChange={v => upd('created_by', v)} />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={editItem.is_primary || false} onChange={e => upd('is_primary', e.target.checked)} style={{ width: 16, height: 16 }} /> <i className="ti ti-star" aria-hidden="true" style={{ verticalAlign: '-2px', color: '#f59e0b', marginLeft: 2 }} /> איש קשר ראשי
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={editItem.is_vip || false} onChange={e => upd('is_vip', e.target.checked)} style={{ width: 16, height: 16 }} /> <i className="ti ti-crown" aria-hidden="true" style={{ verticalAlign: '-2px', color: '#8b5cf6', marginLeft: 2 }} /> VIP
          </label>
        </div>
        <div className="form-field" style={{ marginTop: 16 }}><label>הערות</label><textarea value={editItem.notes || ''} onChange={e => upd('notes', e.target.value)} rows={3} /></div>
      </div>

      {showNewSite && newSiteForm && (
        <div className="modal-overlay" onClick={() => setShowNewSite(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>אתר חדש</h2>
              <button className="modal-close" onClick={() => setShowNewSite(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field" style={{ gridColumn: '1/-1' }}>
                  <label>שם אתר *</label>
                  <input autoFocus value={newSiteForm.site_name || ''} onChange={e => setNewSiteForm(p => ({ ...p, site_name: e.target.value }))} />
                </div>
                <div className="form-field"><label>עיר</label>
                  <input value={newSiteForm.city || ''} onChange={e => setNewSiteForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="form-field"><label>רחוב</label>
                  <input value={newSiteForm.street || ''} onChange={e => setNewSiteForm(p => ({ ...p, street: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn btn-primary" disabled={createSiteMut.isPending}
                  onClick={async () => {
                    if (!newSiteForm.site_name?.trim()) { alert('שם אתר הוא שדה חובה'); return; }
                    try {
                      const created = await createSiteMut.mutateAsync(newSiteForm);
                      upd('site_id', created?.id);
                      setShowNewSite(false);
                      setNewSiteForm(null);
                    } catch (err) { alert(err.message || 'שגיאה ביצירת אתר'); }
                  }}>
                  {createSiteMut.isPending ? 'יוצר...' : 'צור אתר'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowNewSite(false)}>ביטול</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── List ───────────────────────────────────────────────────────────────
  return (
    <>
      <ModuleTopbar icon="ti-address-book" title="אנשי קשר">
        <button className="tdb-calendar-btn" onClick={() => setEditItem({ ...EMPTY_CONTACT })}>
          <i className="ti ti-plus" aria-hidden="true" /> איש קשר חדש
        </button>
      </ModuleTopbar>
      <StatsBar stats={contactStats} />
      <DataTable columns={CONTACTS_COLUMNS} data={filteredContacts} total={data?.total || 0} page={page} totalPages={filter ? 1 : (data?.totalPages || 1)}
        isLoading={isLoading} error={error} onSearchChange={s => { setSearch(s); setPage(1); }} onPageChange={setPage}
        onEdit={row => setEditItem({ ...row })} onDelete={row => setConfirmDel(row)}
        renderCell={renderCell} storageKey="biz_contact_cols_v3" hideHeader
        customers={customers} onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }}
        extraPills={
          <>
            <button className={`btn ${filter === 'primary' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(filter === 'primary' ? '' : 'primary')} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999 }}>
              <i className="ti ti-star" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> ראשיים ({contacts.filter(c => c.is_primary).length})
            </button>
            <button className={`btn ${filter === 'vip' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(filter === 'vip' ? '' : 'vip')} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999 }}>
              <i className="ti ti-crown" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> VIP ({contacts.filter(c => c.is_vip).length})
            </button>
          </>
        }
      />
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת איש קשר</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את <strong>{confirmDel.first_name} {confirmDel.last_name || ''}</strong>?</p>
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
