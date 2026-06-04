import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDeliveryNotes, useCreateDeliveryNote, useUpdateDeliveryNote, useDeleteDeliveryNote, useDeliveryNoteItems, useSaveDeliveryNoteItems } from '../../hooks/useDeliveryNotes';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { DELIVERY_NOTES_COLUMNS, EMPTY_DELIVERY_NOTE, DELIVERY_NOTE_TYPES, DELIVERY_NOTE_STATUSES, DELIVERY_NOTE_STATUS_COLORS, DELIVERY_TYPES } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import DataTable from '../Layout/DataTable';
import StatsBar from '../Layout/StatsBar';
import ModuleTopbar from '../Layout/ModuleTopbar';
import SignaturePad from './SignaturePad';
import SendDeliveryNoteModal from './SendDeliveryNoteModal';
import { buildDeliveryNoteHTML } from './DeliveryNotePreview';
import { useCompanyInfo } from '../../hooks/useDataManagement';
import { getAccessToken } from '../../api/client';
import { usePerms } from '../../hooks/usePerms';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

export default function DeliveryNotesPage() {
  const { canView, canCreate, canEdit, canDelete, canUseButton } = usePerms('deliverynotes');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Filter by order (when navigated from order editor)
  const filterOrderId = searchParams.get('order') || '';
  const { data: filterOrderData } = useQuery({
    queryKey: ['order', filterOrderId],
    queryFn: () => api.get(`/api/orders/${filterOrderId}`),
    enabled: !!filterOrderId,
    staleTime: 60000,
  });

  const { data, isLoading, error } = useDeliveryNotes({ page, limit: 50, search, orderId: filterOrderId, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: contactData } = useContacts({ limit: 500 });
  const { data: itemsData } = useDeliveryNoteItems(editItem?.id);
  const { data: companyInfo } = useCompanyInfo();
  const createMut = useCreateDeliveryNote();
  const updateMut = useUpdateDeliveryNote();
  const deleteMut = useDeleteDeliveryNote();
  const saveItemsMut = useSaveDeliveryNoteItems();

  const notes = data?.data || [];
  const filteredNotes = statusFilter ? notes.filter(n => n.status === statusFilter) : notes;
  const customers = custData?.data || [];
  const allContacts = contactData?.data || [];
  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';

  // Related order (for display)
  const { data: relatedOrder } = useQuery({
    queryKey: ['order', editItem?.order_id],
    queryFn: () => api.get(`/api/orders/${editItem.order_id}`),
    enabled: !!editItem?.order_id,
    staleTime: 60000,
  });

  // Customer orders (for manual order_id dropdown)
  const { data: customerOrdersData } = useQuery({
    queryKey: ['orders-for-customer', editItem?.customer_id],
    queryFn: () => api.get(`/api/orders?customerId=${editItem.customer_id}&limit=500`),
    enabled: !!editItem?.customer_id && !!editItem && !editItem.id,
    staleTime: 30000,
  });
  const customerOrders = customerOrdersData?.data || [];

  const [loadingOrderItems, setLoadingOrderItems] = useState(false);
  const loadItemsFromOrder = async () => {
    if (!editItem?.order_id) { alert('יש לבחור הזמנת מקור'); return; }
    setLoadingOrderItems(true);
    try {
      const [itemsRes, notesRes] = await Promise.all([
        api.get(`/api/orders/${editItem.order_id}/items`),
        api.get(`/api/delivery-notes?orderId=${editItem.order_id}&limit=500`),
      ]);
      const orderItems = itemsRes?.data || [];
      const existingNotes = (notesRes?.data || []).filter(n => n.status !== 'cancelled');

      // Sum delivered/returned per order_item_id across existing notes
      const deliveredMap = new Map();
      const returnedMap = new Map();
      for (const n of existingNotes) {
        try {
          const dniRes = await api.get(`/api/delivery-notes/${n.id}/items`);
          const dnis = dniRes?.data || [];
          for (const d of dnis) {
            const map = n.note_type === 'return' ? returnedMap : deliveredMap;
            map.set(d.order_item_id, (map.get(d.order_item_id) || 0) + (parseFloat(d.quantity_delivered) || 0));
          }
        } catch {}
      }

      const isReturnNow = editItem?.note_type === 'return';
      const rows = orderItems.map(it => {
        const ordered = parseFloat(it.quantity) || 0;
        const delivered = deliveredMap.get(it.id) || 0;
        const returned = returnedMap.get(it.id) || 0;
        const netDelivered = Math.max(0, delivered - returned);
        const remainingToDeliver = Math.max(0, ordered - netDelivered);
        const defaultQty = isReturnNow ? netDelivered : remainingToDeliver;
        return {
          id: 'dni' + Date.now() + Math.random().toString(36).slice(2),
          order_item_id: it.id,
          productName: it.product_name || '',
          sku: it.sku || '',
          quantity_delivered: defaultQty,
          unit: it.unit || '',
          description: it.description || '',
        };
      }).filter(r => r.quantity_delivered > 0);

      if (rows.length === 0) {
        alert(isReturnNow ? 'אין פריטים שנמסרו ללקוח וזמינים להחזרה' : 'אין פריטים שנותרו לאספקה');
      }
      setItems(rows);
    } catch (err) {
      alert(err.message || 'שגיאה בטעינת פריטי הזמנה');
    } finally {
      setLoadingOrderItems(false);
    }
  };

  const removeItemRow = (idx) => setItems(p => p.filter((_, i) => i !== idx));

  const [items, setItems] = useState([]);
  useEffect(() => {
    if (editItem?.id && itemsData?.data) {
      setItems(itemsData.data.map(it => ({
        id: it.id || 'dni' + Date.now() + Math.random().toString(36).slice(2),
        order_item_id: it.order_item_id,
        productName: it.product_name || '',
        sku: it.sku || '',
        quantity_delivered: Number(it.quantity_delivered) || 0,
        unit: it.unit || '',
        description: it.description || '',
      })));
    } else if (editItem && !editItem.id) {
      setItems([]);
    }
  }, [itemsData, editItem?.id]);

  // Open edit/new from URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    const isNew = searchParams.get('new');
    const custId = searchParams.get('customer_id');
    const viewOnlyParam = searchParams.get('viewOnly') === '1';
    if (editId && notes.length) {
      const n = notes.find(x => x.id === editId);
      if (n) { setViewOnly(viewOnlyParam); setEditItem({ ...n }); setSearchParams({}, { replace: true }); }
    } else if (isNew) {
      setEditItem({ ...EMPTY_DELIVERY_NOTE, customer_id: custId || '' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, notes]);

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id);
      case 'order_id': return row.order_id ? <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}><i className="ti ti-link" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> הזמנה</span> : '—';
      case 'note_type': {
        const info = DELIVERY_NOTE_TYPES.find(([k]) => k === row.note_type);
        const isReturn = row.note_type === 'return';
        return <span style={{ padding: '3px 10px', borderRadius: 20, background: isReturn ? '#F59E0B22' : '#3B82F622', color: isReturn ? '#F59E0B' : '#3B82F6', fontWeight: 600, fontSize: 11 }}>{info ? info[1] : row.note_type}</span>;
      }
      case 'status': {
        const info = DELIVERY_NOTE_STATUSES.find(([k]) => k === row.status);
        const color = DELIVERY_NOTE_STATUS_COLORS[row.status] || '#94A3B8';
        return <span style={{ padding: '3px 10px', borderRadius: 20, background: color + '22', color, fontWeight: 600, fontSize: 12 }}>{info ? info[1] : row.status}</span>;
      }
      case 'delivery_date':
      case 'created_at':
        return row[key] ? new Date(row[key]).toLocaleDateString('he-IL') : '—';
      default: return row[key] || '—';
    }
  };

  const handleSave = async () => {
    if (!editItem.customer_id) { alert('יש לבחור לקוח'); return; }
    let savedId = editItem.id;
    if (editItem.id) {
      await updateMut.mutateAsync({ id: editItem.id, ...editItem });
    } else {
      // Generate note number for new (client-side — server will override if needed)
      const existingNums = notes.map(n => n.note_num).filter(Boolean);
      let nextNum = 1;
      existingNums.forEach(num => {
        const m = String(num).match(/DN-(\d+)/);
        if (m) nextNum = Math.max(nextNum, parseInt(m[1]) + 1);
      });
      const toSave = { ...editItem, note_num: `DN-${String(nextNum).padStart(4, '0')}` };
      const result = await createMut.mutateAsync(toSave);
      savedId = result?.id;
    }
    if (items && savedId) await saveItemsMut.mutateAsync({ noteId: savedId, items });
    setEditItem(null);
  };

  const handleDelete = async () => { if (!confirmDel) return; await deleteMut.mutateAsync(confirmDel.id); setConfirmDel(null); };
  const upd = (k, v) => setEditItem(p => ({ ...p, [k]: v }));
  const updItem = (idx, k, v) => setItems(p => p.map((it, i) => i === idx ? { ...it, [k]: v } : it));

  const stats = useMemo(() => {
    const draft = notes.filter(n => n.status === 'draft').length;
    const sent = notes.filter(n => n.status === 'sent').length;
    const delivered = notes.filter(n => n.status === 'delivered').length;
    const returned = notes.filter(n => n.status === 'returned').length;
    return [
      { label: 'סה"כ תעודות', value: data?.total || notes.length, color: 'var(--accent)' },
      { label: 'טיוטה', value: draft, color: DELIVERY_NOTE_STATUS_COLORS.draft },
      { label: 'נשלחו', value: sent, color: DELIVERY_NOTE_STATUS_COLORS.sent },
      { label: 'סופקו ונחתמו', value: delivered, color: DELIVERY_NOTE_STATUS_COLORS.delivered },
      { label: 'הוחזרו ונחתמו', value: returned, color: DELIVERY_NOTE_STATUS_COLORS.returned },
    ];
  }, [notes, data?.total]);

  const deliveryContact = allContacts.find(c => c.id === editItem?.delivery_contact_id);
  const isReturn = editItem?.note_type === 'return';
  const currentCustomer = customers.find(c => c.id === editItem?.customer_id);
  const noteTitle = isReturn ? 'תעודת החזרה' : 'תעודת משלוח';

  const handlePdfPreview = async () => {
    if (!editItem) return;
    setGeneratingPdf(true);
    try {
      const html = buildDeliveryNoteHTML({
        note: editItem, items, customer: currentCustomer, contact: deliveryContact,
        order: relatedOrder, companyInfo, forPdf: true,
      });
      const resp = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ html, filename: `${noteTitle}-${editItem.note_num || 'DN'}.pdf` }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'שגיאה ביצירת PDF');
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      alert(err.message || 'שגיאה ביצירת PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleOpenEmail = () => {
    if (!editItem.id) { alert('יש לשמור את התעודה לפני שליחה'); return; }
    if (!editItem.customer_id) { alert('יש לבחור לקוח'); return; }
    setShowSendEmail(true);
  };

  const handleApplyStock = async () => {
    if (!editItem?.id) return;
    if (!confirm('להחיל תנועות מלאי ידנית על תעודה זו? (פעולה זו תנסה להפחית/להוסיף את הכמויות למלאי המוצרים)')) return;
    try {
      const res = await api.post(`/api/delivery-notes/${editItem.id}/apply-stock`, {});
      const r = res?.result || {};
      alert(`הוחלו תנועות מלאי.\nפריטים שעודכנו: ${r.applied || 0}\nללא SKU מתאים: ${r.unmatched || 0}\nדולגו: ${r.skipped || 0}`);
      upd('stock_applied', true);
      // Invalidate all product/movement caches so updated stock shows everywhere
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-movements'] });
    } catch (err) {
      alert(err.message || 'שגיאה בהחלת תנועות מלאי');
    }
  };

  if (editItem) return (
    <div className="animate-in">
      <div className="tdb-topbar" style={{ marginBottom: 16 }}>
        <div className="tdb-topbar-left">
          <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>← חזרה לתעודות</button>
          {editItem.customer_id && (
            <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}`)}>
              <i className="ti ti-building-store" aria-hidden="true" /> לכרטיס לקוח
            </button>
          )}
          <span className="tdb-topbar-icon"><i className="ti ti-truck" aria-hidden="true" /></span>
          <h1 className="tdb-topbar-title">
            {viewOnly ? `צפייה — ${editItem.note_num || ''}` : `${isReturn ? 'תעודת החזרה' : 'תעודת משלוח'} ${editItem.note_num ? '— ' + editItem.note_num : ''}`}
            {viewOnly && <span style={{ marginRight: 8, fontSize: 11, background: '#F59E0B', color: '#fff', borderRadius: 20, padding: '2px 10px', fontWeight: 600, verticalAlign: 'middle' }}>צפייה בלבד</span>}
          </h1>
        </div>
        <div className="tdb-topbar-right">
          {!viewOnly && canUseButton('btn_relation_map') && editItem.customer_id && (
            <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}/relations`)}>
              <i className="ti ti-hierarchy" aria-hidden="true" /> מפת קשרים
            </button>
          )}
          {editItem.id && ['delivered', 'returned'].includes(editItem.status) && !editItem.stock_applied && (
            <button className="tdb-calendar-btn" onClick={handleApplyStock} title="הפעל תנועות מלאי ידנית (למקרה שלא חלו אוטומטית)">
              <i className="ti ti-package" aria-hidden="true" /> החל תנועות מלאי
            </button>
          )}
          {canUseButton('btn_preview') && (
            <button className="tdb-calendar-btn" onClick={handlePdfPreview} disabled={generatingPdf || !editItem.customer_id}>
              {generatingPdf ? 'מכין PDF...' : <><i className="ti ti-file" aria-hidden="true" /> תצוגה מקדימה</>}
            </button>
          )}
          {!viewOnly && canUseButton('btn_send') && (
            <button className="tdb-calendar-btn" onClick={handleOpenEmail} disabled={!editItem.id || !editItem.customer_id}>
              <i className="ti ti-mail" aria-hidden="true" /> שלח במייל
            </button>
          )}
          {!viewOnly && canUseButton('btn_save') && (
            <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? 'שומר...' : 'שמור'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <fieldset disabled={viewOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
        <h3 className="form-section-title">פרטי תעודה</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>סוג תעודה</label>
            <select value={editItem.note_type || 'delivery'} onChange={e => upd('note_type', e.target.value)}>
              {DELIVERY_NOTE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>סטטוס</label>
            <select value={editItem.status || 'draft'} onChange={e => upd('status', e.target.value)}
              style={{ color: DELIVERY_NOTE_STATUS_COLORS[editItem.status] || 'var(--text-1)', fontWeight: 600 }}>
              {DELIVERY_NOTE_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>לקוח *</label>
            <select value={editItem.customer_id || ''} onChange={e => upd('customer_id', e.target.value)}>
              <option value="">-- בחר לקוח --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          {!editItem.id ? (
            <div className="form-field">
              <label>הזמנת מקור</label>
              <select value={editItem.order_id || ''} onChange={e => { upd('order_id', e.target.value || null); setItems([]); }}
                disabled={!editItem.customer_id}>
                <option value="">-- ללא (תעודה חופשית) --</option>
                {customerOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_num} — {o.order_name || ''} ({o.status})
                  </option>
                ))}
              </select>
              {!editItem.customer_id && <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>בחר לקוח תחילה</span>}
            </div>
          ) : editItem.order_id && (
            <div className="form-field">
              <label>הזמנת מקור</label>
              <input value={relatedOrder?.order_num || '...'} readOnly
                style={{ background: '#F0FDF4', fontWeight: 600, color: '#166534', cursor: 'pointer' }}
                onClick={() => navigate(`/orders?edit=${editItem.order_id}`)} />
            </div>
          )}
          <div className="form-field">
            <label>תאריך אספקה</label>
            <input type="date" value={editItem.delivery_date ? String(editItem.delivery_date).split('T')[0] : ''} onChange={e => upd('delivery_date', e.target.value)} dir="ltr" />
          </div>
          <div className="form-field">
            <label>תאריך משוער</label>
            <input type="date" value={editItem.expected_delivery_date ? String(editItem.expected_delivery_date).split('T')[0] : ''} onChange={e => upd('expected_delivery_date', e.target.value)} dir="ltr" />
          </div>
        </div>

        <h3 className="form-section-title">פרטי משלוח</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>סוג משלוח</label>
            <select value={editItem.delivery_type || ''} onChange={e => upd('delivery_type', e.target.value)}>
              <option value="">-- בחר --</option>
              {DELIVERY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>איש קשר לקבלה</label>
            <select value={editItem.delivery_contact_id || ''} onChange={e => upd('delivery_contact_id', e.target.value)}>
              <option value="">-- בחר --</option>
              {allContacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ gridColumn: '1/-1' }}>
            <label>כתובת אספקה</label>
            <input value={editItem.delivery_address || ''} onChange={e => upd('delivery_address', e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: '1/-1' }}>
            <label>כתובת מקור (מחסן / סניף)</label>
            <input value={editItem.source_address || ''} onChange={e => upd('source_address', e.target.value)} placeholder="מחסן מרכזי, סניף תל אביב..." />
          </div>
          <div className="form-field">
            <label>טלפון איש קשר</label>
            <input value={deliveryContact?.mobile || deliveryContact?.phone || ''} readOnly style={{ background: 'var(--bg-elevated)', cursor: 'default' }} dir="ltr" />
          </div>
          <div className="form-field">
            <label>שם נהג</label>
            <input value={editItem.driver_name || ''} onChange={e => upd('driver_name', e.target.value)} />
          </div>
          <div className="form-field">
            <label>מספר רכב</label>
            <input value={editItem.vehicle_num || ''} onChange={e => upd('vehicle_num', e.target.value)} dir="ltr" />
          </div>
          <div className="form-field">
            <label>מספר מעקב</label>
            <input value={editItem.tracking_num || ''} onChange={e => upd('tracking_num', e.target.value)} dir="ltr" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <h3 className="form-section-title" style={{ margin: 0 }}>{isReturn ? 'פריטים להחזרה' : 'פריטים לאספקה'} ({items.length})</h3>
          {!editItem.id && editItem.order_id && (
            <button type="button" className="btn btn-secondary" onClick={loadItemsFromOrder} disabled={loadingOrderItems} style={{ fontSize: 12 }}>
              {loadingOrderItems ? 'טוען...' : <><i className="ti ti-download" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} />{` טען פריטים ${isReturn ? 'שנמסרו' : 'שנותרו לאספקה'}`}</>}
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
            אין פריטים בתעודה
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead><tr>
                <th style={{ width: 40 }}>#</th>
                <th>שם מוצר / שירות</th>
                <th style={{ width: 100 }}>מק"ט</th>
                <th style={{ width: 100 }}>{isReturn ? 'כמות להחזרה' : 'כמות לאספקה'}</th>
                <th style={{ width: 70 }}>יחידה</th>
                <th>הערות</th>
                <th style={{ width: 40 }}></th>
              </tr></thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{idx + 1}</td>
                    <td>{it.productName || '—'}</td>
                    <td style={{ direction: 'ltr' }}>{it.sku || '—'}</td>
                    <td>
                      <input type="number" value={it.quantity_delivered || 0}
                        onChange={e => updItem(idx, 'quantity_delivered', e.target.value)}
                        min="0" step="0.01" dir="ltr"
                        style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
                    </td>
                    <td style={{ textAlign: 'center' }}>{it.unit || '—'}</td>
                    <td>
                      <input value={it.description || ''} onChange={e => updItem(idx, 'description', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 12 }} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" onClick={() => removeItemRow(idx)}
                        title="הסר פריט"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14, padding: 2 }} aria-label="הסר פריט"><i className="ti ti-x" aria-hidden="true" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="form-section-title">חתימת לקוח</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>שם המקבל</label>
            <input value={editItem.signed_by || ''} onChange={e => upd('signed_by', e.target.value)} placeholder="שם מלא של מי שחתם" />
          </div>
          <div className="form-field">
            <label>תאריך חתימה</label>
            <input value={editItem.signed_at ? new Date(editItem.signed_at).toLocaleString('he-IL') : '—'} readOnly
              style={{ background: 'var(--bg-elevated)', cursor: 'default' }} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {editItem.signature_data ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 10, background: '#fff' }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8 }}>חתימה נשמרה:</div>
              <img src={editItem.signature_data} alt="חתימה" style={{ maxWidth: '100%', maxHeight: 150, border: '1px dashed var(--border)', borderRadius: 6 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowSignature(true)} style={{ fontSize: 12 }}>החלף חתימה</button>
                <button className="btn btn-danger" onClick={() => { upd('signature_data', ''); upd('signed_at', null); }} style={{ fontSize: 12 }}>הסר חתימה</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowSignature(true)}>
              <i className="ti ti-signature" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> חתום עם הלקוח
            </button>
          )}
        </div>

        <h3 className="form-section-title">הערות</h3>
        <div className="form-field">
          <textarea value={editItem.notes || ''} onChange={e => upd('notes', e.target.value)} rows={3} placeholder="הערות על המשלוח..." />
        </div>
        </fieldset>
      </div>

      {showSendEmail && (
        <SendDeliveryNoteModal
          note={editItem}
          items={items}
          customer={currentCustomer}
          contact={deliveryContact}
          order={relatedOrder}
          onStatusChange={(newStatus) => upd('status', newStatus)}
          onClose={() => setShowSendEmail(false)}
        />
      )}

      {showSignature && (
        <SignaturePad
          onSave={(dataUrl) => {
            upd('signature_data', dataUrl);
            upd('signed_at', new Date().toISOString());
            if (!editItem.status || editItem.status === 'draft' || editItem.status === 'sent') {
              upd('status', isReturn ? 'returned' : 'delivered');
            }
            setShowSignature(false);
          }}
          onClose={() => setShowSignature(false)}
        />
      )}
    </div>
  );

  return (
    <>
      <ModuleTopbar icon="ti-truck" title="תעודות משלוח">
        {canUseButton('btn_new') && (
          <button className="tdb-calendar-btn" onClick={() => { setViewOnly(false); setEditItem({ ...EMPTY_DELIVERY_NOTE }); }} style={{ background: 'rgba(255,255,255,.25)', borderColor: 'rgba(255,255,255,.5)', fontWeight: 700 }}>
            <i className="ti ti-plus" aria-hidden="true" /> תעודה חדשה
          </button>
        )}
      </ModuleTopbar>
      {filterOrderId && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)',
          marginBottom: 12, fontSize: 14,
        }}>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }}
            onClick={() => navigate(`/orders?edit=${filterOrderId}`)}>
            ← חזרה להזמנה
          </button>
          <span style={{ color: 'var(--text-2)' }}>
            מציג תעודות משלוח/החזרה עבור הזמנה:&nbsp;
            <strong style={{ color: 'var(--accent)' }}>
              {filterOrderData?.order_num || filterOrderData?.order_name || '...'}
            </strong>
          </span>
          <button className="btn btn-ghost" style={{ marginRight: 'auto', padding: '4px 10px', fontSize: 12 }}
            onClick={() => setSearchParams({}, { replace: true })}>
            הצג את כל התעודות
          </button>
        </div>
      )}
      <StatsBar stats={stats} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={`btn ${!statusFilter ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter('')} style={{ fontSize: 12, padding: '5px 12px' }}>
          הכל ({notes.length})
        </button>
        {DELIVERY_NOTE_STATUSES.map(([key, label]) => {
          const count = notes.filter(n => n.status === key).length;
          const color = DELIVERY_NOTE_STATUS_COLORS[key];
          return (
            <button key={key} className={`btn ${statusFilter === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              style={{ fontSize: 12, padding: '5px 12px', ...(statusFilter !== key ? { color, borderColor: color + '44' } : {}) }}>
              {label} ({count})
            </button>
          );
        })}
      </div>
      <DataTable columns={DELIVERY_NOTES_COLUMNS} data={filteredNotes} total={data?.total || 0} page={page} totalPages={data?.totalPages || 1}
        isLoading={isLoading} error={error} onSearchChange={s => { setSearch(s); setPage(1); }} onPageChange={setPage}
        onEdit={canEdit ? row => { setViewOnly(false); setEditItem({ ...row }); } : undefined}
        onView={!canEdit && canView ? row => { setViewOnly(true); setEditItem({ ...row }); } : undefined}
        onDelete={canDelete ? row => setConfirmDel(row) : undefined}
        renderCell={renderCell} storageKey="biz_delivery_notes_cols_v1" hideHeader
        customers={customers} onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }} />
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת תעודה</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את תעודה <strong>{confirmDel.note_num}</strong>?</p>
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
