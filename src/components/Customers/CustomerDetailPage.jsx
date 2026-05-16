import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useUpdateCustomer, useDeleteCustomer } from '../../hooks/useCustomers';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '../../hooks/useContacts';
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from '../../hooks/useSites';
import { useCreateAgreement, useUpdateAgreement, useDeleteAgreement } from '../../hooks/useServiceAgreements';
import { getClientTypeLabel, CLIENT_TYPES, CURRENCIES, PAYMENT_TERMS, STATUS_OPTIONS, EMPTY_CONTACT, EMPTY_SITE, AGREEMENT_TYPES, SERVICE_TYPES, SERVICE_SCOPES, AUTO_RENEW_OPTIONS, EMPTY_AGREEMENT } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import CustomerModal from './CustomerModal';
import CustomerServicesDashboard from '../Dashboards/CustomerServicesDashboard';
import OwnerSelect from '../Layout/OwnerSelect';
import './CustomerDetailPage.css';
import '../Tasks/TasksDashboard.css';

const TABS = [
  { id: 'info', label: 'פרטי לקוח', icon: 'customers' },
  { id: 'contacts', label: 'אנשי קשר', icon: 'contacts' },
  { id: 'sites', label: 'אתרי לקוח', icon: 'sites' },
  { id: 'agreements', label: 'הסכמי שירות', icon: 'serviceagreements' },
  { id: 'items', label: 'פריטים ושירותים', icon: 'custitems' },
  { id: 'quotes', label: 'הצעות מחיר', icon: 'quotes' },
  { id: 'deals', label: 'עסקאות', icon: 'deals' },
  { id: 'orders', label: 'הזמנות', icon: 'products' },
  { id: 'delivery-notes', label: 'תעודות משלוח', icon: 'products' },
  { id: 'invoices', label: 'חשבוניות', icon: 'deals' },
  { id: 'files', label: 'קבצים מצורפים', icon: 'datamanagement' },
  { id: 'customer360', label: '360 לקוח', icon: 'customerservices' },
];

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [siteFilter, setSiteFilter] = useState('');
  const [editCust, setEditCust] = useState(null);
  const [editContact, setEditContact] = useState(null);
  const [editSite, setEditSite] = useState(null);
  const [siteContactIds, setSiteContactIds] = useState([]); // contacts linked to site being edited
  const [editAgreement, setEditAgreement] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmDelRelated, setConfirmDelRelated] = useState(null); // { type, item }

  // Fetch customer
  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/api/customers/${id}`),
    enabled: !!id,
  });

  // Related entities
  const { data: contactsData } = useContacts({ customerId: id, limit: 200 });
  const { data: sitesData } = useSites({ customerId: id, limit: 200 });
  const { data: agreementsData } = useQuery({
    queryKey: ['service-agreements', id],
    queryFn: () => api.get(`/api/service-agreements?customerId=${id}&limit=200`),
    enabled: !!id,
  });
  const { data: itemsData } = useQuery({
    queryKey: ['cust-items', id],
    queryFn: () => api.get(`/api/cust-items?customerId=${id}&limit=200`),
    enabled: !!id,
  });
  const { data: quotesData } = useQuery({
    queryKey: ['quotes-cust', id],
    queryFn: () => api.get(`/api/quotes?customerId=${id}&limit=200`),
    enabled: !!id,
  });
  const { data: dealsData } = useQuery({
    queryKey: ['deals-cust', id],
    queryFn: () => api.get(`/api/deals?customerId=${id}&limit=200`),
    enabled: !!id,
  });
  const { data: ordersData } = useQuery({
    queryKey: ['orders-cust', id],
    queryFn: () => api.get(`/api/orders?customerId=${id}&limit=200`),
    enabled: !!id,
  });
  const { data: deliveryNotesData } = useQuery({
    queryKey: ['delivery-notes-cust', id],
    queryFn: () => api.get(`/api/delivery-notes?customerId=${id}&limit=200`),
    enabled: !!id,
  });

  const updateMut = useUpdateCustomer();
  const deleteCustMut = useDeleteCustomer();
  const createContactMut = useCreateContact();
  const updateContactMut = useUpdateContact();
  const deleteContactMut = useDeleteContact();
  const createSiteMut = useCreateSite();
  const updateSiteMut = useUpdateSite();
  const deleteSiteMut = useDeleteSite();
  const createAgreementMut = useCreateAgreement();
  const updateAgreementMut = useUpdateAgreement();
  const deleteAgreementMut = useDeleteAgreement();

  const contacts = contactsData?.data || [];
  const sites = sitesData?.data || [];
  const agreements = agreementsData?.data || [];
  const items = itemsData?.data || [];
  const quotes = quotesData?.data || [];
  const deals = dealsData?.data || [];
  const orders = ordersData?.data || [];
  const deliveryNotes = deliveryNotesData?.data || [];

  const counts = {
    contacts: contacts.length,
    sites: sites.length,
    agreements: agreements.length,
    items: items.length,
    quotes: quotes.length,
    deals: deals.length,
    orders: orders.length,
    'delivery-notes': deliveryNotes.length,
  };

  if (isLoading) return <div className="detail-loading">טוען...</div>;
  if (error || !customer) return <div className="detail-error">לקוח לא נמצא <Link to="/customers">חזרה לרשימה</Link></div>;

  const handleUpdateCustomer = async (form) => {
    await updateMut.mutateAsync({ id: customer.id, ...form });
    setEditCust(null);
  };

  const handleDeleteCustomer = async () => {
    await deleteCustMut.mutateAsync(customer.id);
    navigate('/customers');
  };

  const handleSaveContact = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const form = { ...editContact, customer_id: id };
    if (!form.first_name?.trim()) { alert('שם פרטי הוא שדה חובה'); return; }
    if (form.id) {
      await updateContactMut.mutateAsync({ id: form.id, ...form });
    } else {
      await createContactMut.mutateAsync(form);
    }
    setEditContact(null);
  };

  const handleSaveSite = async (e) => {
    e.preventDefault();
    const form = { ...editSite, customer_id: id };
    if (!form.site_name?.trim()) { alert('שם אתר הוא שדה חובה'); return; }
    let savedSiteId = form.id;
    if (form.id) {
      await updateSiteMut.mutateAsync({ id: form.id, ...form });
    } else {
      const created = await createSiteMut.mutateAsync(form);
      savedSiteId = created?.id;
    }
    // Sync contact site assignments
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
    setEditSite(null);
  };

  const handleSaveAgreement = async (e) => {
    e.preventDefault();
    const form = { ...editAgreement, customer_id: id };
    if (!form.agreement_name?.trim()) {
      const parts = [
        (AGREEMENT_TYPES.find(([k]) => k === form.agreement_type) || [])[1],
        (SERVICE_TYPES.find(([k]) => k === form.service_type) || [])[1],
        (SERVICE_SCOPES.find(([k]) => k === form.service_scope) || [])[1],
      ].filter(Boolean);
      form.agreement_name = parts.join(' — ') || 'הסכם חדש';
    }
    if (form.id) {
      await updateAgreementMut.mutateAsync({ id: form.id, ...form });
    } else {
      await createAgreementMut.mutateAsync(form);
    }
    setEditAgreement(null);
  };

  const handleDeleteRelated = async () => {
    if (!confirmDelRelated) return;
    const { type, item } = confirmDelRelated;
    if (type === 'contact') await deleteContactMut.mutateAsync(item.id);
    else if (type === 'site') await deleteSiteMut.mutateAsync(item.id);
    else if (type === 'agreement') await deleteAgreementMut.mutateAsync(item.id);
    setConfirmDelRelated(null);
  };

  // Full-page customer editor (takes over the whole page)
  if (editCust) {
    return (
      <CustomerModal
        customer={editCust}
        onSave={handleUpdateCustomer}
        onClose={() => setEditCust(null)}
        loading={updateMut.isPending}
        backLabel="חזרה לכרטיס הלקוח"
      />
    );
  }

  // Full-page contact editor (takes over the whole page)
  if (editContact) {
    const upd = (k, v) => setEditContact(p => ({ ...p, [k]: v }));
    return (
      <div className="animate-in">
        <div className="editor-topbar">
          <button className="btn btn-ghost" onClick={() => setEditContact(null)}>
            <Icon svg={ICONS.back} size={16} /> חזרה לכרטיס הלקוח
          </button>
          <div className="editor-topbar-title">
            <h1>{editContact.id ? `עריכת איש קשר — ${editContact.first_name || ''} ${editContact.last_name || ''}` : 'איש קשר חדש'}</h1>
            <span className="editor-topbar-sub">ללקוח: {customer.company_name}</span>
          </div>
          <button className="btn btn-primary" onClick={handleSaveContact}
            disabled={createContactMut.isPending || updateContactMut.isPending}>
            {(createContactMut.isPending || updateContactMut.isPending) ? 'שומר...' : 'שמור'}
          </button>
        </div>
        <div className="card">
          <h3 className="form-section-title">פרטים אישיים</h3>
          <div className="form-grid">
            <div className="form-field"><label>שם פרטי *</label><input value={editContact.first_name || ''} onChange={e => upd('first_name', e.target.value)} autoFocus /></div>
            <div className="form-field"><label>שם משפחה</label><input value={editContact.last_name || ''} onChange={e => upd('last_name', e.target.value)} /></div>
            <div className="form-field"><label>תפקיד</label><input value={editContact.role || ''} onChange={e => upd('role', e.target.value)} /></div>
            <div className="form-field"><label>מחלקה</label><input value={editContact.department || ''} onChange={e => upd('department', e.target.value)} /></div>
            <div className="form-field"><label>סטטוס</label>
              <select value={editContact.status || 'active'} onChange={e => upd('status', e.target.value)}>
                <option value="active">פעיל</option>
                <option value="inactive">לא פעיל</option>
              </select>
            </div>
            <OwnerSelect value={editContact.created_by} onChange={v => upd('created_by', v)} />
          </div>

          <h3 className="form-section-title">פרטי התקשרות</h3>
          <div className="form-grid">
            <div className="form-field"><label>אי-מייל</label><input value={editContact.email || ''} onChange={e => upd('email', e.target.value)} dir="ltr" type="email" /></div>
            <div className="form-field"><label>נייד</label><input value={editContact.mobile || ''} onChange={e => upd('mobile', e.target.value)} dir="ltr" type="tel" /></div>
            <div className="form-field"><label>תאריך לידה</label><input type="date" value={editContact.birth_date ? String(editContact.birth_date).split('T')[0] : ''} onChange={e => upd('birth_date', e.target.value)} dir="ltr" /></div>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!editContact.is_primary} onChange={e => upd('is_primary', e.target.checked)} style={{ width: 18, height: 18 }} />
              <span><i className="ti ti-star" aria-hidden="true" style={{ verticalAlign: '-2px', color: '#f59e0b', marginLeft: 2 }} /> איש קשר ראשי</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!editContact.is_vip} onChange={e => upd('is_vip', e.target.checked)} style={{ width: 18, height: 18 }} />
              <span><i className="ti ti-crown" aria-hidden="true" style={{ verticalAlign: '-2px', color: '#8b5cf6', marginLeft: 2 }} /> VIP</span>
            </label>
          </div>

          <div className="form-field" style={{ marginTop: 16 }}>
            <label>הערות</label>
            <textarea value={editContact.notes || ''} onChange={e => upd('notes', e.target.value)} rows={3} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Blue Module Topbar */}
      <div className="tdb-topbar" style={{ borderRadius: 14, marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <div className="tdb-topbar-left">
          <Link to="/customers" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13, textDecoration: 'none', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '5px 12px', transition: 'background 0.15s' }}
            onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.25)'}
            onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
            ← לקוחות
          </Link>
          <span className="tdb-topbar-icon"><i className="ti ti-users" aria-hidden="true" /></span>
          {/* Avatar */}
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {(customer.company_name || '?')[0]}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h1 className="tdb-topbar-title">{customer.company_name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.85 }}>
              {customer.cust_num && <span>#{customer.cust_num}</span>}
              <span>{getClientTypeLabel(customer.client_type)}</span>
              <span style={{ background: customer.status === 'active' ? '#22c55e33' : '#ef444433', color: customer.status === 'active' ? '#86efac' : '#fca5a5', border: `1px solid ${customer.status === 'active' ? '#22c55e66' : '#ef444466'}`, borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
              </span>
            </div>
          </div>
        </div>
        <div className="tdb-topbar-right">
          <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${customer.id}/relations`)}>
            <i className="ti ti-hierarchy" aria-hidden="true" /> מפת קשרים
          </button>
          <button className="tdb-calendar-btn" onClick={() => setEditCust(customer)} style={{ fontWeight: 700 }}>
            <i className="ti ti-edit" aria-hidden="true" /> עריכת לקוח
          </button>
          <button className="tdb-calendar-btn" onClick={() => setConfirmDel(true)} style={{ background: 'rgba(239,68,68,0.25)', borderColor: 'rgba(239,68,68,0.5)' }}>
            <i className="ti ti-trash" aria-hidden="true" /> מחק
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`detail-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon svg={ICONS[tab.icon] || ICONS.home} size={16} />
            <span>{tab.label}</span>
            {counts[tab.id] !== undefined && (
              <span className="detail-tab-count">{counts[tab.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="detail-content card">
        {activeTab === 'info' && <InfoTab customer={customer} />}
        {activeTab === 'contacts' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>סנן לפי אתר:</label>
              <select
                value={siteFilter}
                onChange={e => setSiteFilter(e.target.value)}
                style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--text-1)' }}
              >
                <option value="">כל האתרים ({contacts.length})</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.site_name} ({contacts.filter(c => String(c.site_id) === String(s.id)).length})
                  </option>
                ))}
              </select>
              {siteFilter && (
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setSiteFilter('')}>× נקה</button>
              )}
            </div>
            <RelatedTab
              title="אנשי קשר"
              items={siteFilter ? contacts.filter(c => String(c.site_id) === String(siteFilter)) : contacts}
              columns={[
                { key: 'first_name', label: 'שם פרטי' },
                { key: 'last_name', label: 'שם משפחה' },
                { key: 'role', label: 'תפקיד' },
                { key: 'department', label: 'מחלקה' },
                { key: 'email', label: 'אי-מייל' },
                { key: 'mobile', label: 'נייד' },
                { key: 'site_id', label: 'אתר', render: v => sites.find(s => s.id === v)?.site_name || '—' },
                { key: 'is_primary', label: 'ראשי', render: v => v ? <i className="ti ti-star" aria-hidden="true" style={{ color: '#f59e0b' }} /> : '' },
                { key: 'is_vip', label: 'VIP', render: v => v ? <i className="ti ti-crown" aria-hidden="true" style={{ color: '#8b5cf6' }} /> : '' },
                { key: 'status', label: 'סטטוס', render: v => <span className={`badge ${v === 'active' ? 'badge-success' : 'badge-danger'}`}>{v === 'active' ? 'פעיל' : 'לא פעיל'}</span> },
              ]}
              onAdd={() => setEditContact({ ...EMPTY_CONTACT, customer_id: id })}
              addLabel="איש קשר חדש"
              onEdit={(item) => setEditContact({ ...item })}
              onDelete={(item) => setConfirmDelRelated({ type: 'contact', item })}
            />
          </>
        )}
        {activeTab === 'sites' && (
          <RelatedTab
            title="אתרי לקוח"
            items={sites}
            columns={[
              { key: 'site_name', label: 'שם אתר' },
              { key: 'city', label: 'עיר' },
              { key: 'street', label: 'כתובת' },
              { key: 'id', label: 'אנשי קשר', render: siteId => {
                const linked = contacts.filter(c => c.site_id === siteId);
                return linked.length ? linked.map(c => `${c.first_name} ${c.last_name || ''}`.trim()).join(', ') : '—';
              }},
              { key: 'status', label: 'סטטוס', render: v => <span className={`badge ${v === 'active' ? 'badge-success' : 'badge-danger'}`}>{v === 'active' ? 'פעיל' : 'לא פעיל'}</span> },
            ]}
            onAdd={() => { setEditSite({ ...EMPTY_SITE, customer_id: id }); setSiteContactIds([]); }}
            addLabel="אתר חדש"
            onEdit={(item) => { setEditSite({ ...item }); setSiteContactIds(contacts.filter(c => c.site_id === item.id).map(c => c.id)); }}
            onDelete={(item) => setConfirmDelRelated({ type: 'site', item })}
          />
        )}
        {activeTab === 'agreements' && (
          <RelatedTab
            title="הסכמי שירות"
            items={agreements}
            columns={[
              { key: 'agreement_num', label: 'מספר' },
              { key: 'agreement_name', label: 'שם הסכם' },
              { key: 'agreement_type', label: 'סוג' },
              { key: 'start_date', label: 'תאריך התחלה', render: v => v ? new Date(v).toLocaleDateString('he-IL') : '—' },
              { key: 'end_date', label: 'תאריך סיום', render: v => v ? new Date(v).toLocaleDateString('he-IL') : '—' },
              { key: 'status', label: 'סטטוס', render: v => <span className={`badge ${v === 'active' ? 'badge-success' : 'badge-danger'}`}>{v === 'active' ? 'פעיל' : 'לא פעיל'}</span> },
            ]}
            onAdd={() => setEditAgreement({ ...EMPTY_AGREEMENT, customer_id: id })}
            addLabel="הסכם חדש"
            onEdit={(item) => setEditAgreement({ ...item })}
            onDelete={(item) => setConfirmDelRelated({ type: 'agreement', item })}
          />
        )}
        {activeTab === 'items' && (
          <RelatedTab
            title="פריטים ושירותים"
            items={items}
            columns={[
              { key: 'item_name', label: 'שם פריט' },
              { key: 'sku', label: "מק'ט" },
              { key: 'quantity', label: 'כמות' },
              { key: 'item_type', label: 'סוג' },
              { key: 'status', label: 'סטטוס', render: v => <span className={`badge ${v === 'active' ? 'badge-success' : 'badge-danger'}`}>{v === 'active' ? 'פעיל' : 'לא פעיל'}</span> },
            ]}
            onEdit={(item) => navigate(`/cust-items?edit=${item.id}`)}
          />
        )}
        {activeTab === 'quotes' && (
          <RelatedTab
            title="הצעות מחיר"
            items={quotes}
            columns={[
              { key: 'quote_num', label: 'מספר' },
              { key: 'quote_name', label: 'שם הצעה' },
              { key: 'stage', label: 'שלב' },
              { key: 'quote_date', label: 'תאריך', render: v => v ? new Date(v).toLocaleDateString('he-IL') : '—' },
              { key: 'status', label: 'סטטוס', render: v => <span className={`badge ${v === 'active' ? 'badge-success' : 'badge-danger'}`}>{v === 'active' ? 'פעיל' : 'לא פעיל'}</span> },
            ]}
            onEdit={(item) => navigate(`/quotes/${item.id}/edit`)}
          />
        )}
        {activeTab === 'deals' && (
          <RelatedTab
            title="עסקאות"
            items={deals}
            columns={[
              { key: 'deal_num', label: 'מספר' },
              { key: 'deal_name', label: 'שם עסקה' },
              { key: 'stage', label: 'שלב' },
              { key: 'expected_one_time', label: 'חד"פ צפוי', render: v => v ? `₪${Number(v).toLocaleString()}` : '—' },
              { key: 'expected_recurring', label: 'שוטף צפוי', render: v => v ? `₪${Number(v).toLocaleString()}` : '—' },
              { key: 'expected_close_date', label: 'סגירה צפויה', render: v => v ? new Date(v).toLocaleDateString('he-IL') : '—' },
            ]}
            onEdit={(item) => navigate(`/deals?edit=${item.id}`)}
          />
        )}
        {activeTab === 'orders' && (
          <RelatedTab
            title="הזמנות"
            items={orders}
            columns={[
              { key: 'order_num', label: 'מספר' },
              { key: 'order_name', label: 'שם הזמנה' },
              { key: 'status', label: 'סטטוס' },
              { key: 'order_date', label: 'תאריך', render: v => v ? new Date(v).toLocaleDateString('he-IL') : '—' },
              { key: 'total', label: 'סכום', render: v => v ? `₪${Number(v).toLocaleString()}` : '—' },
            ]}
            onEdit={(item) => navigate(`/orders?edit=${item.id}`)}
          />
        )}
        {activeTab === 'delivery-notes' && (
          <RelatedTab
            title="תעודות משלוח"
            items={deliveryNotes}
            columns={[
              { key: 'note_num', label: 'מספר' },
              { key: 'note_type', label: 'סוג', render: v => v === 'return' ? 'החזרה' : 'משלוח' },
              { key: 'status', label: 'סטטוס' },
              { key: 'delivery_date', label: 'תאריך אספקה', render: v => v ? new Date(v).toLocaleDateString('he-IL') : '—' },
              { key: 'signed_by', label: 'נחתם ע"י', render: v => v || '—' },
              { key: 'created_at', label: 'נוצר', render: v => v ? new Date(v).toLocaleDateString('he-IL') : '—' },
            ]}
            onEdit={(item) => navigate(`/delivery-notes?edit=${item.id}`)}
          />
        )}
        {activeTab === 'invoices' && (
          <PlaceholderTab icon="deals" title="חשבוניות" description="מודול חשבוניות יתווסף בקרוב" />
        )}
        {activeTab === 'files' && (
          <PlaceholderTab icon="datamanagement" title="קבצים מצורפים" description="מודול קבצים מצורפים יתווסף בקרוב" />
        )}
        {activeTab === 'customer360' && (
          <CustomerServicesDashboard customerId={id} />
        )}
      </div>

      {/* Add Contact Modal — DISABLED (replaced by full-page editor early return) */}
      {false && editContact && (
        <div className="modal-overlay" onClick={() => setEditContact(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editContact.id ? 'עריכת איש קשר' : 'איש קשר חדש'}</h2>
              <button className="modal-close" onClick={() => setEditContact(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveContact} className="modal-body">
              <div className="form-grid">
                <div className="form-field"><label>שם פרטי *</label><input value={editContact.first_name||''} onChange={e=>setEditContact(p=>({...p,first_name:e.target.value}))} autoFocus /></div>
                <div className="form-field"><label>שם משפחה</label><input value={editContact.last_name||''} onChange={e=>setEditContact(p=>({...p,last_name:e.target.value}))} /></div>
                <div className="form-field"><label>תפקיד</label><input value={editContact.role||''} onChange={e=>setEditContact(p=>({...p,role:e.target.value}))} /></div>
                <div className="form-field"><label>מחלקה</label><input value={editContact.department||''} onChange={e=>setEditContact(p=>({...p,department:e.target.value}))} /></div>
                <div className="form-field"><label>אי-מייל</label><input value={editContact.email||''} onChange={e=>setEditContact(p=>({...p,email:e.target.value}))} dir="ltr" type="email" /></div>
                <div className="form-field"><label>נייד</label><input value={editContact.mobile||''} onChange={e=>setEditContact(p=>({...p,mobile:e.target.value}))} dir="ltr" type="tel" /></div>
                <div className="form-field"><label>תאריך לידה</label><input type="date" value={editContact.birth_date ? String(editContact.birth_date).split('T')[0] : ''} onChange={e=>setEditContact(p=>({...p,birth_date:e.target.value}))} dir="ltr" /></div>
                <div className="form-field"><label>סטטוס</label>
                  <select value={editContact.status || 'active'} onChange={e=>setEditContact(p=>({...p,status:e.target.value}))}>
                    <option value="active">פעיל</option>
                    <option value="inactive">לא פעיל</option>
                  </select>
                </div>
                <OwnerSelect value={editContact.created_by} onChange={v=>setEditContact(p=>({...p,created_by:v}))} />
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={!!editContact.is_primary} onChange={e=>setEditContact(p=>({...p,is_primary:e.target.checked}))} style={{ width: 16, height: 16 }} /> <i className="ti ti-star" aria-hidden="true" style={{ verticalAlign: '-2px', color: '#f59e0b', marginLeft: 2 }} /> איש קשר ראשי
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={!!editContact.is_vip} onChange={e=>setEditContact(p=>({...p,is_vip:e.target.checked}))} style={{ width: 16, height: 16 }} /> <i className="ti ti-crown" aria-hidden="true" style={{ verticalAlign: '-2px', color: '#8b5cf6', marginLeft: 2 }} /> VIP
                </label>
              </div>
              <div className="form-field" style={{ marginTop: 12 }}>
                <label>הערות</label>
                <textarea value={editContact.notes || ''} onChange={e=>setEditContact(p=>({...p,notes:e.target.value}))} rows={3} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditContact(null)}>ביטול</button>
                <button type="submit" className="btn btn-primary" disabled={createContactMut.isPending || updateContactMut.isPending}>
                  {(createContactMut.isPending || updateContactMut.isPending) ? 'שומר...' : editContact.id ? 'עדכון' : 'יצירה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Site Modal */}
      {editSite && (
        <div className="modal-overlay" onClick={() => setEditSite(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editSite.id ? 'עריכת אתר' : 'אתר חדש'}</h2>
              <button className="modal-close" onClick={() => setEditSite(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveSite} className="modal-body">
              <h3 className="form-section-title">פרטי אתר</h3>
              <div className="form-grid">
                <div className="form-field"><label>שם אתר *</label><input value={editSite.site_name||''} onChange={e=>setEditSite(p=>({...p,site_name:e.target.value}))} autoFocus /></div>
                <div className="form-field"><label>כתובת</label><input value={editSite.street||''} onChange={e=>setEditSite(p=>({...p,street:e.target.value}))} /></div>
                <div className="form-field"><label>עיר</label><input value={editSite.city||''} onChange={e=>setEditSite(p=>({...p,city:e.target.value}))} /></div>
                <div className="form-field"><label>סטטוס</label>
                  <select value={editSite.status || 'active'} onChange={e=>setEditSite(p=>({...p,status:e.target.value}))}>
                    <option value="active">פעיל</option>
                    <option value="inactive">לא פעיל</option>
                  </select>
                </div>
                <OwnerSelect value={editSite.site_owner_id} onChange={v=>setEditSite(p=>({...p,site_owner_id:v}))} label="בעלי אתר" />
              </div>
              <h3 className="form-section-title">מיקום גאוגרפי</h3>
              <div className="form-grid">
                <div className="form-field"><label>קו אורך</label><input value={editSite.longitude||''} onChange={e=>setEditSite(p=>({...p,longitude:e.target.value}))} dir="ltr" type="number" step="any" /></div>
                <div className="form-field"><label>קו רוחב</label><input value={editSite.latitude||''} onChange={e=>setEditSite(p=>({...p,latitude:e.target.value}))} dir="ltr" type="number" step="any" /></div>
              </div>
              {contacts.length > 0 && (
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
                          {checked && <i className="ti ti-check" aria-hidden="true" style={{ fontSize: 12 }} />}
                          {c.first_name} {c.last_name || ''}
                          {c.role && <span style={{ fontSize: 11, opacity: 0.75 }}>({c.role})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditSite(null)}>ביטול</button>
                <button type="submit" className="btn btn-primary" disabled={createSiteMut.isPending || updateSiteMut.isPending}>
                  {(createSiteMut.isPending || updateSiteMut.isPending) ? 'שומר...' : editSite.id ? 'עדכון' : 'יצירה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agreement Modal */}
      {editAgreement && (
        <div className="modal-overlay" onClick={() => setEditAgreement(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2>{editAgreement.id ? 'עריכת הסכם שירות' : 'הסכם שירות חדש'}</h2>
              <button className="modal-close" onClick={() => setEditAgreement(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveAgreement} className="modal-body">
              <h3 className="form-section-title">פרטי ההסכם</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>איש קשר</label>
                  <select value={editAgreement.contact_id || ''} onChange={e => setEditAgreement(p => ({ ...p, contact_id: e.target.value }))}>
                    <option value="">-- בחר --</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>סוג הסכם</label>
                  <select value={editAgreement.agreement_type || ''} onChange={e => setEditAgreement(p => ({ ...p, agreement_type: e.target.value }))}>
                    <option value="">-- בחר --</option>
                    {AGREEMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>מודל שירות</label>
                  <select value={editAgreement.service_type || ''} onChange={e => setEditAgreement(p => ({ ...p, service_type: e.target.value }))}>
                    <option value="">-- בחר --</option>
                    {SERVICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>היקף שירות</label>
                  <select value={editAgreement.service_scope || ''} onChange={e => setEditAgreement(p => ({ ...p, service_scope: e.target.value }))}>
                    <option value="">-- בחר --</option>
                    {SERVICE_SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>סטטוס</label>
                  <select value={editAgreement.status || 'active'} onChange={e => setEditAgreement(p => ({ ...p, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field" style={{ marginTop: 12 }}>
                <label>שם הסכם (נוצר אוטומטית)</label>
                <input value={editAgreement.agreement_name || ''} onChange={e => setEditAgreement(p => ({ ...p, agreement_name: e.target.value }))}
                  placeholder="ייווצר אוטומטית" style={{ background: '#F0FDF4', fontWeight: 600, color: '#166534' }} />
              </div>

              <h3 className="form-section-title">תקופה ותנאים</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>תאריך התחלה</label>
                  <input type="date" value={editAgreement.start_date ? editAgreement.start_date.split('T')[0] : ''} onChange={e => {
                    const sd = e.target.value;
                    setEditAgreement(p => ({ ...p, start_date: sd, end_date: sd && p.period_months ? (() => { const d = new Date(sd); d.setMonth(d.getMonth() + parseInt(p.period_months)); return d.toISOString().split('T')[0]; })() : p.end_date }));
                  }} dir="ltr" />
                </div>
                <div className="form-field">
                  <label>תקופה (חודשים)</label>
                  <input type="number" value={editAgreement.period_months || ''} onChange={e => {
                    const pm = e.target.value;
                    setEditAgreement(p => ({ ...p, period_months: pm, end_date: p.start_date && pm ? (() => { const d = new Date(p.start_date); d.setMonth(d.getMonth() + parseInt(pm)); return d.toISOString().split('T')[0]; })() : p.end_date }));
                  }} dir="ltr" min="1" />
                </div>
                <div className="form-field">
                  <label>תאריך סיום</label>
                  <input value={editAgreement.end_date ? (editAgreement.end_date.includes('T') ? editAgreement.end_date.split('T')[0] : editAgreement.end_date) : '—'} readOnly style={{ background: '#FEF3C7', color: '#92400E', fontWeight: 600 }} />
                </div>
                <div className="form-field">
                  <label>חידוש אוטומטי</label>
                  <select value={editAgreement.auto_renew || 'no'} onChange={e => setEditAgreement(p => ({ ...p, auto_renew: e.target.value }))}>
                    {AUTO_RENEW_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <h3 className="form-section-title">פרטים נוספים</h3>
              <div className="form-grid">
                <OwnerSelect value={editAgreement.owner_id} onChange={v => setEditAgreement(p => ({ ...p, owner_id: v }))} />
                <div className="form-field">
                  <label>מספר CRM חיצוני</label>
                  <input value={editAgreement.crm_customer_num || ''} onChange={e => setEditAgreement(p => ({ ...p, crm_customer_num: e.target.value }))} dir="ltr" />
                </div>
              </div>
              <div className="form-field" style={{ marginTop: 12 }}>
                <label>תיאור / תנאים מיוחדים</label>
                <textarea value={editAgreement.description || ''} onChange={e => setEditAgreement(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="הערות, תנאים מיוחדים..." />
              </div>

              {/* Sites under agreement — badge chips */}
              {sites.length > 0 && (() => {
                const siteIds = Array.isArray(editAgreement.site_ids) ? editAgreement.site_ids
                  : (typeof editAgreement.site_ids === 'string' ? (() => { try { return JSON.parse(editAgreement.site_ids); } catch { return []; } })() : []);
                const toggleSite = (siteId) => {
                  const updated = siteIds.includes(siteId) ? siteIds.filter(x => x !== siteId) : [...siteIds, siteId];
                  setEditAgreement(p => ({ ...p, site_ids: updated }));
                };
                return (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8, color: 'var(--text-1)' }}>
                      אתרי לקוח שבהסכם
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {sites.map(site => {
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
                              fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s',
                            }}>
                            {checked && <i className="ti ti-check" aria-hidden="true" style={{ fontSize: 12 }} />}
                            {site.site_name}
                            {site.city && <span style={{ fontSize: 11, opacity: 0.8 }}>{site.city}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditAgreement(null)}>ביטול</button>
                <button type="submit" className="btn btn-primary" disabled={createAgreementMut.isPending || updateAgreementMut.isPending}>
                  {(createAgreementMut.isPending || updateAgreementMut.isPending) ? 'שומר...' : editAgreement.id ? 'עדכון' : 'יצירה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Related Entity Confirm */}
      {confirmDelRelated && (
        <div className="modal-overlay" onClick={() => setConfirmDelRelated(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>
              {confirmDelRelated.type === 'contact' ? 'מחיקת איש קשר' : confirmDelRelated.type === 'site' ? 'מחיקת אתר' : 'מחיקת הסכם'}
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 8 }}>
              האם למחוק את <strong>{confirmDelRelated.item.first_name || confirmDelRelated.item.site_name || confirmDelRelated.item.agreement_name || ''}</strong>?
            </p>
            <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 20 }}>פעולה זו אינה הפיכה</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelRelated(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={handleDeleteRelated}
                disabled={deleteContactMut.isPending || deleteSiteMut.isPending || deleteAgreementMut.isPending}>
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirm */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת לקוח</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>
              האם למחוק את <strong>{customer.company_name}</strong>?<br/>
              כל הנתונים הקשורים (אנשי קשר, אתרים, הצעות מחיר) יימחקו גם.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={handleDeleteCustomer} disabled={deleteCustMut.isPending}>
                {deleteCustMut.isPending ? 'מוחק...' : 'מחק לקוח'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Info Tab ──────────────────────────────────────────────────────────────────

function InfoTab({ customer }) {
  const c = customer;
  const ReadOnlyField = ({ label, value }) => (
    <div className="form-field">
      <label>{label}</label>
      <input value={value || '—'} readOnly style={{ background: 'var(--bg-elevated)', cursor: 'default' }} />
    </div>
  );

  return (
    <div>
      <h3 className="form-section-title">פרטי חברה</h3>
      <div className="form-grid">
        <ReadOnlyField label="מספר לקוח" value={c.cust_num} />
        <ReadOnlyField label="סוג לקוח" value={getClientTypeLabel(c.client_type)} />
        <ReadOnlyField label="ח.פ / ע.מ" value={c.reg_num} />
        <ReadOnlyField label="תאריך יצירה" value={c.created_at ? new Date(c.created_at).toLocaleDateString('he-IL') : null} />
      </div>

      <h3 className="form-section-title">פרטי קשר</h3>
      <div className="form-grid">
        <ReadOnlyField label="טלפון" value={c.phone} />
        <ReadOnlyField label="נייד" value={c.mobile} />
        <ReadOnlyField label="אי-מייל" value={c.email} />
        <ReadOnlyField label="אתר אינטרנט" value={c.website} />
      </div>

      <h3 className="form-section-title">כתובת</h3>
      <div className="form-grid">
        <ReadOnlyField label="רחוב" value={c.street} />
        <ReadOnlyField label="עיר" value={c.city} />
        <ReadOnlyField label="מיקוד" value={c.zip} />
        <ReadOnlyField label="מדינה" value={c.country} />
      </div>

      <h3 className="form-section-title">תנאים מסחריים</h3>
      <div className="form-grid">
        <ReadOnlyField label="תנאי תשלום" value={(PAYMENT_TERMS.find(([v]) => v === c.payment_terms) || ['', null])[1]} />
        <ReadOnlyField label="מטבע" value={(CURRENCIES.find(([v]) => v === c.currency) || ['', null])[1]} />
        <ReadOnlyField label="מסגרת אשראי" value={c.credit_limit ? `₪${Number(c.credit_limit).toLocaleString()}` : null} />
      </div>

      {c.notes && (
        <>
          <h3 className="form-section-title">הערות</h3>
          <div className="form-field">
            <textarea value={c.notes} readOnly rows={3} style={{ background: 'var(--bg-elevated)', cursor: 'default' }} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Related Tab (generic) ────────────────────────────────────────────────────

function RelatedTab({ title, items, columns, onAdd, addLabel, onEdit, onDelete }) {
  const hasActions = onEdit || onDelete;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title} ({items.length})</h3>
        {onAdd && (
          <button className="btn btn-primary" onClick={onAdd} style={{ fontSize: 12, padding: '6px 14px' }}>
            <Icon svg={ICONS.plus} size={14} /> {addLabel || 'חדש'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
          <p>אין רשומות</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map(col => <th key={col.key}>{col.label}</th>)}
                {hasActions && <th style={{ width: 90 }}>פעולות</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}
                  onClick={() => onEdit && onEdit(item)}
                  style={{ cursor: onEdit ? 'pointer' : 'default' }}
                  onMouseOver={e => { if (onEdit) e.currentTarget.style.background = 'var(--accent-light)'; }}
                  onMouseOut={e => e.currentTarget.style.background = ''}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(item[col.key], item) : (item[col.key] || '—')}
                    </td>
                  ))}
                  {hasActions && (
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {onEdit && <button className="action-btn edit" onClick={() => onEdit(item)} title="ערוך"><i className="ti ti-edit" aria-hidden="true" /></button>}
                        {onDelete && <button className="action-btn delete" onClick={() => onDelete(item)} title="מחק"><i className="ti ti-trash" aria-hidden="true" /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Placeholder Tab (for future modules) ─────────────────────────────────────

function PlaceholderTab({ icon, title, description }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'var(--accent-light)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <Icon svg={ICONS[icon] || ICONS.home} size={28} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
      <p style={{ color: 'var(--text-3)', fontSize: 13 }}>{description}</p>
    </div>
  );
}
