import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from '../../hooks/useSites';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts, useUpdateContact } from '../../hooks/useContacts';
import { SITES_COLUMNS, EMPTY_SITE, STATUS_OPTIONS } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import DataTable from '../Layout/DataTable';
import ModuleTopbar from '../Layout/ModuleTopbar';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

export default function SitesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [siteContactIds, setSiteContactIds] = useState([]);

  const { data, isLoading, error } = useSites({ page, limit: 50, search, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: contactsData } = useContacts({ customerId: editItem?.customer_id || '', limit: 500 });
  const createMut = useCreateSite();
  const updateMut = useUpdateSite();
  const deleteMut = useDeleteSite();
  const updateContactMut = useUpdateContact();

  const sites = data?.data || [];
  const customers = custData?.data || [];
  const contacts = contactsData?.data || [];
  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && data?.data) {
      const item = data.data.find(s => s.id === editId);
      if (item) {
        setEditItem({ ...item });
        setSearchParams({}, { replace: true });
        // siteContactIds will be initialized once contactsData loads (see effect below)
      }
    }
  }, [searchParams, data]);

  // When contacts load for the edited site, initialize the linked contact IDs
  useEffect(() => {
    if (editItem?.id && contactsData?.data) {
      setSiteContactIds(contactsData.data.filter(c => c.site_id === editItem.id).map(c => c.id));
    }
  }, [contactsData, editItem?.id]);

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id);
      case 'status': return <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{row.status === 'active' ? 'פעיל' : 'לא פעיל'}</span>;
      case 'created_at': return row.created_at ? new Date(row.created_at).toLocaleDateString('he-IL') : '—';
      default: return row[key] || '—';
    }
  };

  const handleSave = async () => {
    if (!editItem.site_name?.trim()) { alert('שם אתר הוא שדה חובה'); return; }
    let savedSiteId = editItem.id;
    if (editItem.id) {
      await updateMut.mutateAsync({ id: editItem.id, ...editItem });
    } else {
      const created = await createMut.mutateAsync(editItem);
      savedSiteId = created?.id;
    }
    if (savedSiteId) {
      await Promise.all(contacts.map(contact => {
        const shouldLink = siteContactIds.includes(contact.id);
        const isLinked = contact.site_id === savedSiteId;
        if (shouldLink && !isLinked)
          return updateContactMut.mutateAsync({ id: contact.id, site_id: savedSiteId });
        if (!shouldLink && isLinked)
          return updateContactMut.mutateAsync({ id: contact.id, site_id: null });
        return null;
      }).filter(Boolean));
    }
    setEditItem(null);
  };

  const handleDelete = async () => { if (!confirmDel) return; await deleteMut.mutateAsync(confirmDel.id); setConfirmDel(null); };
  const upd = (k, v) => setEditItem(p => ({ ...p, [k]: v }));

  const siteStats = useMemo(() => [
    { label: 'סה"כ אתרים', value: data?.total || sites.length, color: 'var(--info)' },
    { label: 'לקוחות עם אתרים', value: new Set(sites.map(s => s.customer_id)).size, color: 'var(--success)' },
    { label: 'עם בעלים', value: sites.filter(s => s.site_owner_id).length, color: 'var(--accent)' },
  ], [sites, data?.total]);

  if (editItem) return (
    <div className="animate-in">
      <div className="tdb-topbar" style={{ marginBottom: 16 }}>
        <div className="tdb-topbar-left">
          <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>← חזרה לאתרים</button>
          <span className="tdb-topbar-icon"><i className="ti ti-map-pin" aria-hidden="true" /></span>
          <h1 className="tdb-topbar-title">{editItem.id ? `עריכת אתר — ${editItem.site_name || ''}` : 'אתר חדש'}</h1>
        </div>
        <div className="tdb-topbar-right">
          <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
      <div className="card">
        <h3 className="form-section-title">פרטי אתר</h3>
        <div className="form-grid">
          <div className="form-field"><label>שם אתר *</label><input value={editItem.site_name || ''} onChange={e => upd('site_name', e.target.value)} autoFocus /></div>
          <div className="form-field"><label>לקוח</label>
            <select value={editItem.customer_id || ''} onChange={e => upd('customer_id', e.target.value)}>
              <option value="">-- בחר לקוח --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>כתובת</label><input value={editItem.street || ''} onChange={e => upd('street', e.target.value)} /></div>
          <div className="form-field"><label>עיר</label><input value={editItem.city || ''} onChange={e => upd('city', e.target.value)} /></div>
          <div className="form-field"><label>סטטוס</label>
            <select value={editItem.status || 'active'} onChange={e => upd('status', e.target.value)}>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <OwnerSelect value={editItem.site_owner_id} onChange={v => upd('site_owner_id', v)} label="בעלי רשומה אתר" />
        </div>
        <h3 className="form-section-title">מיקום גאוגרפי</h3>
        <div className="form-grid">
          <div className="form-field"><label>קו אורך</label><input value={editItem.longitude || ''} onChange={e => upd('longitude', e.target.value)} dir="ltr" type="number" step="any" /></div>
          <div className="form-field"><label>קו רוחב</label><input value={editItem.latitude || ''} onChange={e => upd('latitude', e.target.value)} dir="ltr" type="number" step="any" /></div>
        </div>
        {editItem.customer_id && contacts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 className="form-section-title">אנשי קשר משוייכים לאתר</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {contacts.map(c => {
                const checked = siteContactIds.includes(c.id);
                const toggle = () => setSiteContactIds(prev =>
                  checked ? prev.filter(x => x !== c.id) : [...prev, c.id]
                );
                return (
                  <button key={c.id} type="button" onClick={toggle}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 20,
                      border: checked ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: checked ? 'var(--accent)' : 'var(--bg-card)',
                      color: checked ? 'white' : 'var(--text-2)',
                      cursor: 'pointer', fontSize: 13, fontWeight: checked ? 600 : 400,
                      transition: 'all 0.2s',
                    }}>
                    {checked && <i className="ti ti-check" aria-hidden="true" style={{ fontSize: 12, verticalAlign: '-2px', marginLeft: 4 }} />}
                    {c.first_name} {c.last_name || ''}
                    {c.role && <span style={{ fontSize: 11, opacity: 0.75 }}>({c.role})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {editItem.customer_id && contacts.length === 0 && (
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 12 }}>אין אנשי קשר ללקוח זה</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ModuleTopbar icon="ti-map-pin" title="אתרי לקוח">
        <button className="tdb-calendar-btn" onClick={() => setEditItem({ ...EMPTY_SITE })}>
          <i className="ti ti-plus" aria-hidden="true" /> אתר חדש
        </button>
      </ModuleTopbar>
      <StatsBar stats={siteStats} />
      <DataTable columns={SITES_COLUMNS} data={sites} total={data?.total || 0} page={page} totalPages={data?.totalPages || 1}
        isLoading={isLoading} error={error} onSearchChange={s => { setSearch(s); setPage(1); }} onPageChange={setPage}
        onEdit={row => setEditItem({ ...row })} onDelete={row => setConfirmDel(row)}
        renderCell={renderCell} storageKey="biz_sites_cols_v3" hideHeader
        customers={customers} onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }} />
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת אתר</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את <strong>{confirmDel.site_name}</strong>?</p>
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
