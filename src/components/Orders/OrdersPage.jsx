import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder, useOrderItems, useSaveOrderItems } from '../../hooks/useOrders';
import { useCreateDeliveryNoteFromOrder } from '../../hooks/useDeliveryNotes';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useProducts } from '../../hooks/useProducts';
import { useConditions } from '../../hooks/useDataManagement';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { ORDERS_COLUMNS, EMPTY_ORDER, ORDER_STATUSES, ORDER_STATUS_COLORS, DELIVERY_TYPES, calcItemTotal } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import DataTable from '../Layout/DataTable';
import ModuleTopbar from '../Layout/ModuleTopbar';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import SendOrderModal from './SendOrderModal';
import { usePerms } from '../../hooks/usePerms';
import DeleteConfirmModal from '../Layout/DeleteConfirmModal';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

export default function OrdersPage() {
  const { canView, canCreate, canEdit, canDelete, canUseButton } = usePerms('orders');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showSendEmail, setShowSendEmail] = useState(false);

  const { data, isLoading, error } = useOrders({ page, limit: 50, search, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: contactData } = useContacts({ limit: 500 });
  const { data: prodData } = useProducts({ limit: 500 });
  const { data: condData } = useConditions();
  const { data: itemsData } = useOrderItems(editItem?.id);
  // Fetch related quote (if this order was converted from a quote)
  const { data: relatedQuote } = useQuery({
    queryKey: ['quote', editItem?.quote_id],
    queryFn: () => api.get(`/api/quotes/${editItem.quote_id}`),
    enabled: !!editItem?.quote_id,
    staleTime: 300000,
  });
  const createMut = useCreateOrder();
  const updateMut = useUpdateOrder();
  const deleteMut = useDeleteOrder();
  const saveItemsMut = useSaveOrderItems();
  const createDNMut = useCreateDeliveryNoteFromOrder();

  const orders = data?.data || [];
  const filteredOrders = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
  const customers = custData?.data || [];
  const allContacts = contactData?.data || [];
  const allProducts = prodData?.data || [];
  const allConditions = condData?.data || [];
  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';
  const custContacts = useMemo(() => editItem?.customer_id ? allContacts.filter(c => c.customer_id === editItem.customer_id) : [], [editItem?.customer_id, allContacts]);

  // Load items when editing
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (editItem?.id && itemsData?.data) {
      setItems(itemsData.data.map(it => ({
        id: it.id || 'oi' + Date.now() + Math.random().toString(36).slice(2),
        productName: it.product_name || '',
        sku: it.sku || '',
        quantity: Number(it.quantity) || 1,
        unitPrice: it.unit_price || '',
        discount: Number(it.discount) || 0,
        costType: it.cost_type || 'onetime',
        description: it.description || '',
        groupHeader: it.group_header || '',
        unit: it.unit || '',
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
    if (editId && orders.length) {
      const ord = orders.find(o => o.id === editId);
      if (ord) { setViewOnly(viewOnlyParam); setEditItem({ ...ord }); setSearchParams({}, { replace: true }); }
    } else if (isNew) {
      setEditItem({ ...EMPTY_ORDER, customer_id: custId || '' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, orders]);

  const fmt = (n) => `₪${(Number(n) || 0).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id);
      case 'status': {
        const info = ORDER_STATUSES.find(([k]) => k === row.status);
        const color = ORDER_STATUS_COLORS[row.status] || '#94A3B8';
        return <span style={{ padding: '3px 10px', borderRadius: 20, background: color + '22', color, fontWeight: 600, fontSize: 12 }}>{info ? info[1] : row.status}</span>;
      }
      case 'delivery_type': {
        const info = DELIVERY_TYPES.find(([k]) => k === row.delivery_type);
        return info ? info[1] : '—';
      }
      case 'order_date':
      case 'delivery_date':
      case 'created_at':
        return row[key] ? new Date(row[key]).toLocaleDateString('he-IL') : '—';
      default: return row[key] || '—';
    }
  };

  const handleSave = async () => {
    if (!editItem.order_name?.trim()) { alert('שם הזמנה הוא שדה חובה'); return; }
    if (!editItem.customer_id) { alert('יש לבחור לקוח'); return; }
    let saved;
    if (editItem.id) {
      await updateMut.mutateAsync({ id: editItem.id, ...editItem });
      saved = editItem;
    } else {
      saved = await createMut.mutateAsync(editItem);
    }
    // Save items
    if (saved?.id && items) {
      await saveItemsMut.mutateAsync({ orderId: saved.id, items });
    }
    setEditItem(null);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteMut.mutateAsync(confirmDel.id);
    if (editItem?.id === confirmDel.id) setEditItem(null);
    setConfirmDel(null);
  };
  const upd = (k, v) => setEditItem(p => ({ ...p, [k]: v }));

  const stats = useMemo(() => {
    const statuses = ['new', 'in_process', 'delivered', 'invoiced'];
    const counts = statuses.map(s => orders.filter(o => o.status === s).length);
    return [
      { label: 'סה"כ הזמנות', value: data?.total || orders.length, color: 'var(--accent)' },
      { label: 'חדשות', value: counts[0], color: ORDER_STATUS_COLORS.new },
      { label: 'בתהליך', value: counts[1], color: ORDER_STATUS_COLORS.in_process },
      { label: 'סופקו', value: counts[2], color: ORDER_STATUS_COLORS.delivered },
    ];
  }, [orders, data?.total]);

  // ── Editor (full page) ────────────────────────────────────────────────
  if (editItem) {
    const onetimeItems = items.filter(it => it.costType !== 'recurring');
    const recurringItems = items.filter(it => it.costType === 'recurring');
    const calc = {
      onetimeSub: onetimeItems.reduce((s, it) => s + calcItemTotal(it), 0),
      recurringSub: recurringItems.reduce((s, it) => s + calcItemTotal(it), 0),
    };
    calc.total = calc.onetimeSub + calc.recurringSub;
    const deliveryContact = allContacts.find(c => c.id === editItem.delivery_contact_id);

    // Auto-conditions computed from items' product families (same logic as QuoteEditor)
    const autoConditions = (() => {
      if (!items.length || !allProducts.length || !allConditions.length) return [];
      const seenIds = new Set();
      const result = [];
      items.forEach(item => {
        const prod = allProducts.find(p => p.sku === item.sku || p.name === item.productName);
        if (!prod || !prod.family_id) return;
        allConditions.forEach(cond => {
          if (seenIds.has(cond.id)) return;
          const famIds = Array.isArray(cond.family_ids) ? cond.family_ids :
            (typeof cond.family_ids === 'string' ? (() => { try { return JSON.parse(cond.family_ids); } catch { return []; } })() : []);
          if (cond.product_family_id === prod.family_id || famIds.includes(prod.family_id)) {
            seenIds.add(cond.id);
            result.push(cond);
          }
        });
      });
      const pp = (p) => ({ first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,sixth_to_last:9994,fifth_to_last:9995,fourth_to_last:9996,third_to_last:9997,second_to_last:9998,last:9999 })[p] || 5000;
      return result.sort((a, b) => pp(a.cond_position) - pp(b.cond_position) || (a.display_order || 0) - (b.display_order || 0));
    })();

    // Render items table for a specific type
    const renderItemsTable = (list, label) => {
      if (!list.length) return null;
      return (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)' }}>{label} ({list.length})</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead><tr>
                <th style={{ width: 40 }}>#</th>
                <th>שם מוצר / שירות</th>
                <th style={{ width: 90 }}>מק"ט</th>
                <th style={{ width: 70 }}>כמות</th>
                <th style={{ width: 100 }}>מחיר ליחידה</th>
                <th style={{ width: 80 }}>הנחה %</th>
                <th style={{ width: 120 }}>סה"כ</th>
              </tr></thead>
              <tbody>
                {list.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{idx + 1}</td>
                    <td>{it.productName || '—'}</td>
                    <td style={{ direction: 'ltr' }}>{it.sku || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ direction: 'ltr', textAlign: 'left' }}>{it.unitPrice ? `₪${Number(it.unitPrice).toLocaleString()}` : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{it.discount || 0}%</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(calcItemTotal(it))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    return (
      <div className="animate-in">
        <div className="tdb-topbar" style={{ marginBottom: 16 }}>
          <div className="tdb-topbar-left">
            <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>← חזרה להזמנות</button>
            {editItem.customer_id && (
              <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}`)}>
                <i className="ti ti-building-store" aria-hidden="true" /> לכרטיס לקוח
              </button>
            )}
            <span className="tdb-topbar-icon"><i className="ti ti-shopping-cart" aria-hidden="true" /></span>
            <div>
              <h1 className="tdb-topbar-title">
                {viewOnly ? `צפייה — ${editItem.order_num || ''}` : (editItem.id ? `עריכת הזמנה — ${editItem.order_name || ''}` : 'הזמנה חדשה')}
                {viewOnly && <span style={{ marginRight: 8, fontSize: 11, background: '#F59E0B', color: '#fff', borderRadius: 20, padding: '2px 10px', fontWeight: 600, verticalAlign: 'middle' }}>צפייה בלבד</span>}
              </h1>
              {editItem.order_num && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>#{editItem.order_num}</div>}
            </div>
          </div>
          <div className="tdb-topbar-right">
            {!viewOnly && canUseButton('btn_relation_map') && editItem.customer_id && (
              <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}/relations`)}>
                <i className="ti ti-hierarchy" aria-hidden="true" /> מפת קשרים
              </button>
            )}
            {!viewOnly && canUseButton('btn_delivery_notes') && editItem.id && (
              <button className="tdb-calendar-btn" onClick={() => navigate(`/delivery-notes?order=${editItem.id}`)}>
                <i className="ti ti-package" aria-hidden="true" /> תעודות משלוח/החזרה
              </button>
            )}
            {!viewOnly && canUseButton('btn_send') && editItem.id && (
              <button className="tdb-calendar-btn" onClick={() => setShowSendEmail(true)} disabled={!editItem.customer_id}>
                <i className="ti ti-mail" aria-hidden="true" /> שלח במייל
              </button>
            )}
            {!viewOnly && canUseButton('btn_delivery_new') && editItem.id && (
              <button className="tdb-calendar-btn"
                disabled={createDNMut.isPending || (items || []).length === 0}
                title={(items || []).length === 0 ? 'לא ניתן להפיק תעודת משלוח — יש להוסיף לפחות פריט אחד להזמנה' : ''}
                onClick={async () => {
                  if ((items || []).length === 0) { alert('לא ניתן להפיק תעודת משלוח — יש להוסיף לפחות פריט אחד להזמנה'); return; }
                  if (!confirm('ליצור תעודת משלוח חדשה לפריטי ההזמנה שטרם סופקו?')) return;
                  try {
                    const result = await createDNMut.mutateAsync(editItem.id);
                    if (result.ok && result.note) {
                      alert(`תעודה ${result.note.note_num} נוצרה בהצלחה!`);
                      navigate(`/delivery-notes?edit=${result.note.id}`);
                    }
                  } catch (err) { alert(err.message || 'שגיאה ביצירת תעודת משלוח'); }
                }}>
                {createDNMut.isPending ? 'יוצר...' : <><i className="ti ti-truck" aria-hidden="true" /> תעודת משלוח חדשה</>}
              </button>
            )}
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
          <h3 className="form-section-title">פרטי הזמנה</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>שם הזמנה *</label>
              <input value={editItem.order_name || ''} onChange={e => upd('order_name', e.target.value)} autoFocus />
            </div>
            <div className="form-field">
              <label>לקוח *</label>
              <select value={editItem.customer_id || ''} onChange={e => { upd('customer_id', e.target.value); upd('contact_id', ''); }}>
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
            <div className="form-field">
              <label>תאריך הזמנה</label>
              <input type="date" value={editItem.order_date ? String(editItem.order_date).split('T')[0] : ''} onChange={e => upd('order_date', e.target.value)} dir="ltr" />
            </div>
            {editItem.quote_id && (
              <div className="form-field">
                <label>מספר הצעת מחיר (מקור)</label>
                <input value={relatedQuote?.quote_num || relatedQuote?.quote_name || '...'} readOnly
                  style={{ background: '#F0FDF4', fontWeight: 600, color: '#166534', cursor: 'pointer' }}
                  onClick={() => { if (editItem.quote_id) navigate(`/quotes/${editItem.quote_id}/edit`); }}
                  title="לחץ לפתיחת ההצעה המקורית" />
              </div>
            )}
            <div className="form-field">
              <label>סטטוס</label>
              <select value={editItem.status || 'new'} onChange={e => upd('status', e.target.value)}
                style={{ color: ORDER_STATUS_COLORS[editItem.status] || 'var(--text-1)', fontWeight: 600 }}>
                {ORDER_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <OwnerSelect value={editItem.created_by} onChange={v => upd('created_by', v)} label="בעלי רשומה הזמנה" />
          </div>

          <h3 className="form-section-title">פרטי משלוח / אספקה</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>סוג משלוח</label>
              <select value={editItem.delivery_type || ''} onChange={e => upd('delivery_type', e.target.value)}>
                <option value="">-- בחר --</option>
                {DELIVERY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>תאריך אספקה</label>
              <input type="date" value={editItem.delivery_date ? String(editItem.delivery_date).split('T')[0] : ''} onChange={e => upd('delivery_date', e.target.value)} dir="ltr" />
            </div>
            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>כתובת למשלוח</label>
              <input value={editItem.delivery_address || ''} onChange={e => upd('delivery_address', e.target.value)} />
            </div>
            <div className="form-field">
              <label>איש קשר לקבלת הפריטים</label>
              <select value={editItem.delivery_contact_id || ''} onChange={e => upd('delivery_contact_id', e.target.value)}>
                <option value="">-- בחר --</option>
                {allContacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>טלפון איש קשר</label>
              <input value={deliveryContact?.mobile || deliveryContact?.phone || (editItem.delivery_contact_id ? '—' : '')} readOnly
                style={{ background: 'var(--bg-elevated)', cursor: 'default' }} dir="ltr" />
            </div>
          </div>

          <h3 className="form-section-title">פריטים ושירותים</h3>
          {items.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
              אין פריטים בהזמנה
            </div>
          ) : (
            <>
              {renderItemsTable(onetimeItems, 'פריטים חד-פעמיים')}
              {renderItemsTable(recurringItems, 'פריטים שוטפים (חודשי)')}
            </>
          )}

          {items.length > 0 && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', maxWidth: 400, marginRight: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>סה"כ חד"פ:</span><span style={{ fontWeight: 600 }}>{fmt(calc.onetimeSub)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>סה"כ שוטף:</span><span style={{ fontWeight: 600 }}>{fmt(calc.recurringSub)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', borderTop: '1px solid var(--border)', marginTop: 6, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
                <span>סה"כ:</span><span>{fmt(calc.total)}</span>
              </div>
            </div>
          )}

          {/* Conditions — auto from product families + overrides from quote */}
          {(() => {
            const condOvr = (() => {
              try {
                if (typeof editItem.cond_overrides === 'object') return editItem.cond_overrides || {};
                if (typeof editItem.cond_overrides === 'string') return JSON.parse(editItem.cond_overrides || '{}');
                return {};
              } catch { return {}; }
            })();
            const hasFreeConditions = !!editItem.conditions?.trim();
            if (!autoConditions.length && !hasFreeConditions) return null;
            return (
              <>
                <h3 className="form-section-title">תנאים כלליים</h3>
                {autoConditions.length > 0 && (
                  <div style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    {autoConditions.map((cond, idx) => {
                      const text = condOvr[cond.id] !== undefined ? condOvr[cond.id] : (cond.content || '');
                      return (
                        <div key={cond.id} style={{ padding: '10px 14px', background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: idx < autoConditions.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{cond.cond_num || idx + 1}</span>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{cond.name}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="form-field">
                  <label>תנאים נוספים</label>
                  <textarea value={editItem.conditions || ''} onChange={e => upd('conditions', e.target.value)} rows={4}
                    placeholder="תנאים נוספים שיופיעו בהזמנה..." />
                </div>
              </>
            );
          })()}

          {/* Images */}
          {(() => {
            const imgs = (() => {
              try {
                if (Array.isArray(editItem.images)) return editItem.images.filter(Boolean);
                if (typeof editItem.images === 'string') return (JSON.parse(editItem.images) || []).filter(Boolean);
                return [];
              } catch { return []; }
            })();
            if (!imgs.length) return null;
            return (
              <>
                <h3 className="form-section-title">תמונות ({imgs.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {imgs.map((img, i) => (
                    <div key={i} style={{ aspectRatio: '4/3', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                      {img.data && <img src={img.data} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          <h3 className="form-section-title">הערות</h3>
          <div className="form-field">
            <textarea value={editItem.notes || ''} onChange={e => upd('notes', e.target.value)} rows={3} placeholder="הערות על ההזמנה..." />
          </div>
          </fieldset>
        </div>
      </div>
    );
  }

  return (
    <>
      <ModuleTopbar icon="ti-shopping-cart" title="הזמנות">
        {canCreate && canUseButton('btn_new') && (
          <button className="tdb-calendar-btn" onClick={() => { setViewOnly(false); setEditItem({ ...EMPTY_ORDER }); }}>
            <i className="ti ti-plus" aria-hidden="true" /> הזמנה חדשה
          </button>
        )}
      </ModuleTopbar>
      <StatsBar stats={stats} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={`btn ${!statusFilter ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter('')} style={{ fontSize: 12, padding: '5px 12px' }}>
          הכל ({orders.length})
        </button>
        {ORDER_STATUSES.map(([key, label]) => {
          const count = orders.filter(o => o.status === key).length;
          const color = ORDER_STATUS_COLORS[key];
          return (
            <button key={key} className={`btn ${statusFilter === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              style={{ fontSize: 12, padding: '5px 12px', ...(statusFilter !== key ? { color, borderColor: color + '44' } : {}) }}>
              {label} ({count})
            </button>
          );
        })}
      </div>
      <DataTable columns={ORDERS_COLUMNS} data={filteredOrders} total={data?.total || 0} page={page} totalPages={data?.totalPages || 1}
        isLoading={isLoading} error={error} onSearchChange={s => { setSearch(s); setPage(1); }} onPageChange={setPage}
        onEdit={canEdit ? row => { setViewOnly(false); setEditItem({ ...row }); } : undefined}
        onView={!canEdit && canView ? row => { setViewOnly(true); setEditItem({ ...row }); } : undefined}
        onDelete={canDelete ? row => setConfirmDel(row) : undefined}
        renderCell={renderCell} storageKey="biz_orders_cols_v1" hideHeader
        customers={customers} onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }} />
      {showSendEmail && editItem && (
        <SendOrderModal
          order={editItem}
          items={items}
          customer={customers.find(c => c.id === editItem.customer_id)}
          contact={allContacts.find(c => c.id === editItem.contact_id)}
          onClose={() => setShowSendEmail(false)}
          onSent={() => setShowSendEmail(false)}
        />
      )}

      {confirmDel && (
        <DeleteConfirmModal
          title="מחיקת הזמנה"
          name={confirmDel.order_name}
          cascade="מחיקת ההזמנה תסיר אותה לצמיתות, כולל כל שורות הפריטים המשויכות אליה."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          isPending={deleteMut.isPending}
        />
      )}
    </>
  );
}
