import React, { useState, useMemo, useEffect } from 'react';
import { useCustItems, useCreateCustItem, useUpdateCustItem, useDeleteCustItem } from '../../hooks/useCustItems';
import { useCustomers } from '../../hooks/useCustomers';
import { useSites } from '../../hooks/useSites';
import { useFamilies, useProducts } from '../../hooks/useProducts';
import { CUST_ITEMS_COLUMNS, EMPTY_CUST_ITEM, ITEM_TYPES } from '../../utils/constants';
import { useLookups } from '../../hooks/useLookups';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import DataTable from '../Layout/DataTable';
import AutoNameConfig, { loadAutoNameConfig, buildAutoItemName } from './AutoNameConfig';
import DynamicFieldsConfig, { loadDynFieldsConfig, getFieldsForFamily } from './DynamicFieldsConfig';
import { Icon, ICONS } from '../../utils/icons';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ModuleTopbar from '../Layout/ModuleTopbar';
import { usePerms } from '../../hooks/usePerms';
import DeleteConfirmModal from '../Layout/DeleteConfirmModal';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

const DATA_LINE_TYPES = [['','— בחר —'],['ADSL','ADSL'],['VDSL','VDSL'],['FTTH','FTTH/Fiber'],['cellular','סלולרי'],['satellite','לווין'],['other','אחר']];
const BANDWIDTH_OPTS = [['','— בחר —'],['10M','10Mb'],['30M','30Mb'],['50M','50Mb'],['100M','100Mb'],['200M','200Mb'],['500M','500Mb'],['1G','1Gb'],['10G','10Gb']];
const INFRA_PROVIDERS = [['','— בחר —'],['bezeq','בזק'],['HOT','HOT'],['cellcom','סלקום'],['partner','פרטנר'],['YES','YES'],['other','אחר']];
const OWNERSHIP_OPTS = [['','— בחר —'],['provider','ספק'],['customer','לקוח']];
const ISP_OPTS = [['','— בחר —'],['012','012'],['015','015'],['hotnet','Hot Net'],['igold','Internet Gold'],['bezeqintl','Bezeq Intl'],['other','אחר']];
const EQUIP_TYPES = [['','— בחר —'],['router','Router'],['switch','Switch'],['firewall','Firewall'],['bridge','Bridge'],['ONT','ONT'],['AP','Access Point'],['other','אחר']];
const CONN_TYPES = [['','— בחר —'],['GPON','GPON'],['Xfiber','Xfiber'],['P2P','P2P'],['other','אחר']];

export default function CustItemsPage() {
  const navigate = useNavigate();
  const { canView, canCreate, canEdit, canDelete, canUseButton } = usePerms('custitems');
  const { customerStatuses } = useLookups();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuDrop, setSkuDrop] = useState(false);
  const [famSearch, setFamSearch] = useState('');
  const [famDrop, setFamDrop] = useState(false);
  const [showAutoNameConfig, setShowAutoNameConfig] = useState(false);
  const [autoNameCfg, setAutoNameCfg] = useState(loadAutoNameConfig);
  const [showDynFieldsConfig, setShowDynFieldsConfig] = useState(false);
  const [dynFieldsCfg, setDynFieldsCfg] = useState(loadDynFieldsConfig);

  const { data, isLoading, error } = useCustItems({ page, limit: 50, search, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: siteData } = useSites({ limit: 500 });
  const { data: famData } = useFamilies();
  const { data: prodData } = useProducts({ limit: 500 });
  const { data: saData } = useQuery({ queryKey: ['service-agreements-all'], queryFn: () => api.get('/api/service-agreements?limit=500'), staleTime: 300000, retry: 3 });
  const createMut = useCreateCustItem();
  const updateMut = useUpdateCustItem();
  const deleteMut = useDeleteCustItem();

  const items = data?.data || [];
  const customers = custData?.data || [];
  const allSites = siteData?.data || [];
  const families = famData?.data || [];
  const allProducts = prodData?.data || [];
  const allAgreements = saData?.data || [];

  // Open new/edit/view item from URL (e.g. navigating from customer detail page)
  useEffect(() => {
    const isNew = searchParams.get('new');
    const custId = searchParams.get('customer_id');
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    if (editId && items.length) {
      const item = items.find(i => String(i.id) === editId);
      if (item) { setViewOnly(false); setEditItem({ ...item }); setSkuSearch(item.item_name || item.sku || ''); setSearchParams({}, { replace: true }); }
    } else if (viewId && items.length) {
      const item = items.find(i => String(i.id) === viewId);
      if (item) { setViewOnly(true); setEditItem({ ...item }); setSkuSearch(item.item_name || item.sku || ''); setSearchParams({}, { replace: true }); }
    } else if (isNew && customers.length) {
      setEditItem({ ...EMPTY_CUST_ITEM, customer_id: custId || '' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, customers, items]); // eslint-disable-line

  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';
  const getSiteName = (id) => allSites.find(s => s.id === id)?.site_name || '—';
  const getFamName = (id) => { const f = families.find(f => f.id === id); return f ? (f.num ? `${f.num} — ` : '') + f.name : '—'; };
  const getItemTypeLabel = (t) => (ITEM_TYPES.find(([v]) => v === t) || ['', t || '—'])[1];

  // Sites for the customer selected in the list filter
  const filterSites = useMemo(
    () => customerFilter ? allSites.filter(s => String(s.customer_id) === String(customerFilter)) : [],
    [customerFilter, allSites]
  );

  // Items filtered by site (client-side, within the already-customer-filtered page)
  const displayedItems = useMemo(
    () => siteFilter ? items.filter(i => String(i.site_id) === String(siteFilter)) : items,
    [items, siteFilter]
  );

  // Filtered by selected customer (for editor dropdowns)
  const custSites = useMemo(() => editItem?.customer_id ? allSites.filter(s => s.customer_id === editItem.customer_id) : [], [editItem?.customer_id, allSites]);
  const custAgreements = useMemo(() => editItem?.customer_id ? allAgreements.filter(a => a.customer_id === editItem.customer_id) : [], [editItem?.customer_id, allAgreements]);

  // Auto item name based on config
  const autoItemName = useMemo(() => {
    if (!editItem) return '';
    const selFam = families.find(f => f.id === editItem.product_family_id);
    const famNum = selFam?.num || '';
    const prod = allProducts.find(p => p.sku === editItem.sku);
    return buildAutoItemName(editItem, famNum, autoNameCfg, {
      siteName: editItem.site_id ? getSiteName(editItem.site_id) : '',
      customerName: editItem.customer_id ? getCustName(editItem.customer_id) : '',
      familyName: selFam?.name || '',
      familyNum: famNum,
      productName: prod?.name || '',
    });
  }, [editItem, families, allSites, customers, allProducts, autoNameCfg]);

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id);
      case 'site_id': return getSiteName(row.site_id);
      case 'product_family_id': return getFamName(row.product_family_id);
      case 'item_type': return getItemTypeLabel(row.item_type);
      case 'status':
        return <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
          {row.status === 'active' ? 'פעיל' : 'לא פעיל'}</span>;
      case 'status_changed_at':
        return row.status_changed_at ? new Date(row.status_changed_at).toLocaleDateString('he-IL') : '—';
      case 'quantity':
        return Number(row.quantity) === Math.floor(Number(row.quantity)) ? Math.floor(Number(row.quantity)) : row.quantity;
      default: return row[key] || '—';
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!editItem.customer_id) { alert('יש לבחור לקוח'); return; }
    const toSave = { ...editItem };
    // Auto item name
    if (autoItemName) toSave.item_name = autoItemName;
    if (!toSave.item_name?.trim()) toSave.item_name = toSave.sku || 'פריט חדש';
    // Status change date
    const isNew = !toSave.id;
    const now = new Date().toISOString().split('T')[0];
    if (isNew) {
      toSave.status_changed_at = now;
    } else {
      const original = items.find(i => i.id === toSave.id);
      if (original && original.status !== toSave.status) {
        toSave.status_changed_at = now;
      }
    }
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

  const upd = (k, v) => setEditItem(p => ({ ...p, [k]: v }));
  const sel = (opts) => opts.map(([v, l]) => <option key={v} value={v}>{l}</option>);

  // SKU search results
  const skuResults = useMemo(() => {
    if (!skuSearch || skuSearch.length < 1) return [];
    const q = skuSearch.toLowerCase();
    return allProducts.filter(p => (p.sku || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q)).slice(0, 10);
  }, [skuSearch, allProducts]);

  // Resolve the product name for the currently-selected SKU. Used in the search
  // box's display so the user sees the product *name* (not just its SKU code).
  const selectedProductName = useMemo(() => {
    if (!editItem?.sku) return '';
    return allProducts.find(p => p.sku === editItem.sku)?.name || '';
  }, [editItem?.sku, allProducts]);

  const selectProduct = (prod) => {
    setEditItem(prev => ({
      ...prev,
      sku: prod.sku || '',
      item_name: '',  // will be auto-generated
      product_family_id: prod.family_id || prev.product_family_id || '',
    }));
    setSkuSearch(prod.name || prod.sku || '');
    setSkuDrop(false);
  };

  const itemStats = useMemo(() => {
    const total = data?.total || items.length;
    const active = items.filter(i => i.status === 'active').length;
    const inactive = items.filter(i => i.status !== 'active').length;
    const uniqueCust = new Set(items.map(i => i.customer_id)).size;
    return [
      { label: 'סה"כ פריטים', value: total, color: 'var(--info)' },
      { label: 'פעילים', value: active, color: 'var(--success)' },
      { label: 'לא פעילים', value: inactive, color: 'var(--danger)' },
      { label: 'לקוחות', value: uniqueCust, color: 'var(--accent)' },
    ];
  }, [items, data?.total]);

  // ── Editor (full page) ────────────────────────────────────────────────
  if (editItem) return (
    <>
      <div className="animate-in">
        <div className="tdb-topbar" style={{ marginBottom: 16 }}>
          <div className="tdb-topbar-left">
            <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>← חזרה לפריטים</button>
            {editItem.customer_id && (
              <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}`)}>
                <i className="ti ti-building-store" aria-hidden="true" /> לכרטיס לקוח
              </button>
            )}
            <span className="tdb-topbar-icon"><i className="ti ti-package" aria-hidden="true" /></span>
            <h1 className="tdb-topbar-title">{viewOnly ? `צפייה — ${editItem.item_name || ''}` : editItem.id ? 'עריכת פריט ללקוח' : 'פריט חדש ללקוח'}</h1>
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
              {/* ── חלק ראשון — מידע כללי ── */}
              <h3 className="form-section-title">מידע כללי</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>שם לקוח *</label>
                  <select value={editItem.customer_id || ''} onChange={e => { upd('customer_id', e.target.value); upd('site_id', ''); upd('agreement_id', ''); }}>
                    <option value="">-- בחר לקוח --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.cust_num ? `${c.cust_num} — ` : ''}{c.company_name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>שם אתר</label>
                  <select value={editItem.site_id || ''} onChange={e => upd('site_id', e.target.value)} disabled={!editItem.customer_id}>
                    <option value="">-- בחר אתר --</option>
                    {custSites.map(s => <option key={s.id} value={s.id}>{s.site_name}</option>)}
                  </select>
                </div>
                <OwnerSelect value={editItem.created_by} onChange={v => upd('created_by', v)} label="בעלי רשומה פריט לקוח" />
              </div>

              {/* שם פריט — שורה שלמה */}
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>שם פריט</label>
                <div style={{ position: 'relative' }}>
                  <input value={skuDrop ? skuSearch : (editItem.item_name || selectedProductName || editItem.sku || '')} placeholder="חפש שם פריט או מק'ט..."
                    onFocus={() => { setSkuSearch(editItem.item_name || selectedProductName || editItem.sku || ''); setSkuDrop(true); }}
                    onChange={e => { setSkuSearch(e.target.value); upd('sku', e.target.value); setSkuDrop(true); }}
                    onBlur={() => setTimeout(() => setSkuDrop(false), 200)} />
                  {skuDrop && skuResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto' }}>
                      {skuResults.map(p => (
                        <div key={p.id} onMouseDown={e => { e.preventDefault(); selectProduct(p); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--accent-light)'}
                          onMouseOut={e => e.currentTarget.style.background = ''}>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 12 }}>
                            {p.sku && <span>מק"ט: {p.sku}</span>}
                            {p.mfr_name && <span>{p.mfr_name}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* שם פריט ללקוח — שורה שלמה */}
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>שם פריט ללקוח (אוטומטי)</label>
                <input value={autoItemName} readOnly style={{ background: '#F0FDF4', fontWeight: 600, color: '#166534' }} />
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>משפחת מוצר</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={famDrop ? famSearch : (editItem.product_family_id ? getFamName(editItem.product_family_id) : '')}
                      placeholder="חפש מספר או שם משפחה..."
                      onFocus={() => { setFamSearch(''); setFamDrop(true); }}
                      onChange={e => { setFamSearch(e.target.value); setFamDrop(true); }}
                      onBlur={() => setTimeout(() => setFamDrop(false), 200)} />
                    {famDrop && (() => {
                      const q = famSearch.toLowerCase();
                      const results = families.filter(f =>
                        !q || (f.num || '').toLowerCase().includes(q) || (f.name || '').toLowerCase().includes(q)
                      ).sort((a, b) => {
                        const na = parseFloat((a.num || '').replace(/[^0-9.]/g, '')) || 99999;
                        const nb = parseFloat((b.num || '').replace(/[^0-9.]/g, '')) || 99999;
                        return na - nb;
                      }).slice(0, 15);
                      return results.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', maxHeight: 220, overflowY: 'auto' }}>
                          {editItem.product_family_id && (
                            <div onMouseDown={e => { e.preventDefault(); upd('product_family_id', ''); setFamDrop(false); }}
                              style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--danger)', borderBottom: '1px solid var(--border-light)' }}
                              onMouseOver={e => e.currentTarget.style.background = '#FEE2E2'}
                              onMouseOut={e => e.currentTarget.style.background = ''}>
                              <i className="ti ti-x" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> ניקוי בחירה
                            </div>
                          )}
                          {results.map(f => (
                            <div key={f.id} onMouseDown={e => { e.preventDefault(); upd('product_family_id', f.id); setFamDrop(false); }}
                              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 13,
                                background: editItem.product_family_id === f.id ? 'var(--accent-light)' : '' }}
                              onMouseOver={e => e.currentTarget.style.background = 'var(--accent-light)'}
                              onMouseOut={e => e.currentTarget.style.background = editItem.product_family_id === f.id ? 'var(--accent-light)' : ''}>
                              <span style={{ fontWeight: 700, color: '#F59E0B', marginLeft: 6 }}>{f.num || '—'}</span>
                              {f.name}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="form-field">
                  <label>הסכם שירות</label>
                  <select value={editItem.agreement_id || ''} onChange={e => upd('agreement_id', e.target.value)} disabled={!editItem.customer_id}>
                    <option value="">-- בחר הסכם --</option>
                    {custAgreements.map(a => <option key={a.id} value={a.id}>{a.agreement_name || a.agreement_num || a.id}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>כמות</label>
                  <input type="number" value={editItem.quantity || 1} onChange={e => upd('quantity', e.target.value)} dir="ltr" min="0" />
                </div>
                <div className="form-field">
                  <label>סוג</label>
                  <select value={editItem.item_type || ''} onChange={e => upd('item_type', e.target.value)}>
                    <option value="">-- בחר --</option>
                    {ITEM_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>סטטוס</label>
                  <select value={editItem.status || 'active'} onChange={e => upd('status', e.target.value)}>
                    {customerStatuses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>תאריך שינוי סטטוס אחרון</label>
                  <input value={editItem.status_changed_at ? (editItem.status_changed_at.includes('T') ? editItem.status_changed_at.split('T')[0] : editItem.status_changed_at) : '—'} readOnly
                    style={{ background: '#FEF3C7', color: '#92400E' }} />
                </div>
              </div>

              {/* שדות דינמיים לפי משפחת מוצר */}
              {(() => {
                const selFam = families.find(f => f.id === editItem.product_family_id);
                const famNum = selFam?.num || '';
                const dynGroups = getFieldsForFamily(famNum, dynFieldsCfg);
                if (dynGroups.length === 0) return null;
                return dynGroups.map(group => (
                  <React.Fragment key={group.groupLabel}>
                    <h3 className="form-section-title">{group.groupLabel}</h3>
                    <div className="form-grid">
                      {group.fields.map(f => (
                        <div className="form-field" key={f.key}>
                          <label>{f.label}</label>
                          {f.type === 'select' ? (
                            <select value={editItem[f.key] || ''} onChange={e => upd(f.key, e.target.value)}>
                              <option value="">-- בחר --</option>
                              {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.type === 'date' ? (
                            <input type="date" value={editItem[f.key] || ''} onChange={e => upd(f.key, e.target.value)} dir="ltr" />
                          ) : f.type === 'number' ? (
                            <input type="number" value={editItem[f.key] || ''} onChange={e => upd(f.key, e.target.value)} dir="ltr" />
                          ) : f.type === 'computed' ? (
                            <input value={(() => {
                              if (editItem.ms_start_date && editItem.ms_period_months) {
                                const d = new Date(editItem.ms_start_date);
                                d.setMonth(d.getMonth() + parseInt(editItem.ms_period_months));
                                return d.toISOString().split('T')[0];
                              }
                              return editItem[f.key] || '—';
                            })()} readOnly style={{ background: '#FEF3C7', color: '#92400E', fontWeight: 600 }} />
                          ) : (
                            <input value={editItem[f.key] || ''} onChange={e => upd(f.key, e.target.value)} dir={f.key.startsWith('ff_') || f.key.startsWith('ms_') ? 'ltr' : undefined} />
                          )}
                        </div>
                      ))}
                    </div>
                  </React.Fragment>
                ));
              })()}
              {false && (() => {
                const selFam = families.find(f => f.id === editItem.product_family_id);
                const famNum = selFam?.num || '';
                const show901 = famNum.startsWith('901') || famNum === '910' || famNum === '911' || famNum === '912' || famNum === '913';
                if (!show901) return null;

                // Auto-calculate expiry date
                const calcExpiry = () => {
                  if (!editItem.ms_start_date || !editItem.ms_period_months) return '';
                  const d = new Date(editItem.ms_start_date);
                  d.setMonth(d.getMonth() + parseInt(editItem.ms_period_months));
                  return d.toISOString().split('T')[0];
                };

                return (
                  <>
                    <h3 className="form-section-title">שירותים מנוהלים</h3>

                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, marginTop: 4 }}>מידע כללי</h4>
                    <div className="form-grid">
                      <div className="form-field">
                        <label>סוג שירות מנוהל</label>
                        <select value={editItem.ms_service_type || ''} onChange={e => upd('ms_service_type', e.target.value)}>
                          <option value="">-- בחר --</option>
                          <option value="backup">גיבוי בענן</option>
                          <option value="security">הגנת סייבר</option>
                          <option value="monitoring">ניהול וניטור</option>
                          <option value="email">דוא"ל</option>
                          <option value="pbx">מרכזיה</option>
                          <option value="hosting">אירוח</option>
                          <option value="microsoft365">Microsoft 365</option>
                          <option value="sms">SMS</option>
                          <option value="consulting">ייעוץ</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>מודל רישוי</label>
                        <select value={editItem.ms_license_model || ''} onChange={e => upd('ms_license_model', e.target.value)}>
                          <option value="">-- בחר --</option>
                          <option value="monthly">חודשי</option>
                          <option value="yearly">שנתי</option>
                          <option value="multi_year">רב-שנתי</option>
                          <option value="per_user">לפי משתמש</option>
                          <option value="per_device">לפי מכשיר</option>
                          <option value="flat">אחיד</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>תאריך הקמת השירות</label>
                        <input type="date" value={editItem.ms_setup_date || ''} onChange={e => upd('ms_setup_date', e.target.value)} dir="ltr" />
                      </div>
                      <div className="form-field">
                        <label>תאריך התחלה</label>
                        <input type="date" value={editItem.ms_start_date || ''} onChange={e => {
                          upd('ms_start_date', e.target.value);
                          // Auto-calc expiry
                          if (e.target.value && editItem.ms_period_months) {
                            const d = new Date(e.target.value);
                            d.setMonth(d.getMonth() + parseInt(editItem.ms_period_months));
                            upd('ms_expiry_date', d.toISOString().split('T')[0]);
                          }
                        }} dir="ltr" />
                      </div>
                      <div className="form-field">
                        <label>תקופת שירות (חודשים)</label>
                        <input type="number" value={editItem.ms_period_months || ''} onChange={e => {
                          upd('ms_period_months', e.target.value);
                          // Auto-calc expiry
                          if (editItem.ms_start_date && e.target.value) {
                            const d = new Date(editItem.ms_start_date);
                            d.setMonth(d.getMonth() + parseInt(e.target.value));
                            upd('ms_expiry_date', d.toISOString().split('T')[0]);
                          }
                        }} dir="ltr" min="1" />
                      </div>
                      <div className="form-field">
                        <label>תאריך תפוגת השירות</label>
                        <input value={editItem.ms_expiry_date || calcExpiry() || '—'} readOnly
                          style={{ background: '#FEF3C7', color: '#92400E', fontWeight: 600 }} />
                      </div>
                      <div className="form-field">
                        <label>תאריך ביטול השירות</label>
                        <input type="date" value={editItem.ms_cancel_date || ''} onChange={e => upd('ms_cancel_date', e.target.value)} dir="ltr" />
                      </div>
                    </div>

                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, marginTop: 16 }}>שירותי ענן מנוהלים</h4>
                    <div className="form-grid">
                      <div className="form-field">
                        <label>שם Device</label>
                        <input value={editItem.ms_device_name || ''} onChange={e => upd('ms_device_name', e.target.value)} />
                      </div>
                      <div className="form-field">
                        <label>סוג Device</label>
                        <input value={editItem.ms_device_type || ''} onChange={e => upd('ms_device_type', e.target.value)} />
                      </div>
                      <div className="form-field">
                        <label>משאב מגובה</label>
                        <select value={editItem.ms_backup_resource || ''} onChange={e => upd('ms_backup_resource', e.target.value)}>
                          <option value="">-- בחר --</option>
                          <option value="server">שרת</option>
                          <option value="workstation">תחנת עבודה</option>
                          <option value="laptop">מחשב נייד</option>
                          <option value="nas">NAS</option>
                          <option value="vm">מכונה וירטואלית</option>
                          <option value="cloud">ענן</option>
                          <option value="email">דוא"ל</option>
                          <option value="database">בסיס נתונים</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>שירותי לקוח שלא נרכשו דרך החברה</label>
                        <input value={editItem.ms_external_services || ''} onChange={e => upd('ms_external_services', e.target.value)} placeholder="שירותים חיצוניים..." />
                      </div>
                    </div>

                    <div className="form-grid" style={{ marginTop: 12 }}>
                      <div className="form-field">
                        <label>Admin Management</label>
                        <select value={editItem.ms_admin_management || ''} onChange={e => upd('ms_admin_management', e.target.value)}>
                          <option value="">-- בחר --</option>
                          <option value="full">ניהול מלא</option>
                          <option value="partial">ניהול חלקי</option>
                          <option value="monitoring">ניטור בלבד</option>
                          <option value="self">ניהול עצמי של הלקוח</option>
                          <option value="shared">ניהול משותף</option>
                          <option value="none">ללא</option>
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}

          </fieldset>
        </div>
      </div>
    </>
  );

  // ── List ───────────────────────────────────────────────────────────────
  return (
    <>
      <ModuleTopbar icon="ti-package" title="פריטי לקוח">
        {canUseButton('btn_auto_name') && (
          <button className="tdb-calendar-btn" onClick={() => setShowAutoNameConfig(true)}>
            <i className="ti ti-settings" aria-hidden="true" /> שם פריט אוטומטי
          </button>
        )}
        {canUseButton('btn_dynamic_fields') && (
          <button className="tdb-calendar-btn" onClick={() => setShowDynFieldsConfig(true)}>
            <i className="ti ti-list-details" aria-hidden="true" /> שדות דינמיים
          </button>
        )}
        {canCreate && canUseButton('btn_new') && (
          <button className="tdb-calendar-btn" onClick={() => { setEditItem({ ...EMPTY_CUST_ITEM }); setSkuSearch(''); }} style={{ background: 'rgba(255,255,255,.25)', borderColor: 'rgba(255,255,255,.5)', fontWeight: 700 }}>
            <i className="ti ti-plus" aria-hidden="true" /> פריט חדש
          </button>
        )}
      </ModuleTopbar>
      <StatsBar stats={itemStats} />

      <DataTable
        columns={CUST_ITEMS_COLUMNS}
        data={displayedItems}
        total={siteFilter ? displayedItems.length : (data?.total || 0)}
        page={page}
        totalPages={siteFilter ? 1 : (data?.totalPages || 1)}
        isLoading={isLoading}
        error={error}
        onSearchChange={s => { setSearch(s); setPage(1); }}
        onPageChange={setPage}
        onEdit={canEdit ? row => { setViewOnly(false); setEditItem({ ...row }); setSkuSearch(row.item_name || row.sku || ''); } : undefined}
        onView={!canEdit && canView ? row => { setViewOnly(true); setEditItem({ ...row }); setSkuSearch(row.item_name || row.sku || ''); } : undefined}
        onDelete={canDelete ? row => setConfirmDel(row) : undefined}
        renderCell={renderCell}
        storageKey="biz_cust_items_cols_v3"
        hideHeader
        customers={customers}
        onCustomerFilterChange={id => { setCustomerFilter(id); setSiteFilter(''); setPage(1); }}
        extraSearchContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>אתר:</span>
            <select
              value={siteFilter}
              onChange={e => setSiteFilter(e.target.value)}
              disabled={!customerFilter}
              style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--text-1)', opacity: customerFilter ? 1 : 0.5 }}
            >
              <option value="">{customerFilter ? 'כל האתרים' : '— בחר לקוח תחילה —'}</option>
              {filterSites.map(s => <option key={s.id} value={s.id}>{s.site_name}</option>)}
            </select>
            {siteFilter && (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '3px 8px' }} onClick={() => setSiteFilter('')}>× נקה</button>
            )}
          </div>
        }
      />

      {confirmDel && (
        <DeleteConfirmModal
          title="מחיקת פריט לקוח"
          name={confirmDel.item_name}
          cascade="מחיקת הפריט תסיר אותו לצמיתות מרשימת הפריטים של הלקוח."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          isPending={deleteMut.isPending}
        />
      )}

      {showAutoNameConfig && <AutoNameConfig onClose={() => { setShowAutoNameConfig(false); setAutoNameCfg(loadAutoNameConfig()); }} />}
      {showDynFieldsConfig && <DynamicFieldsConfig onClose={() => { setShowDynFieldsConfig(false); setDynFieldsCfg(loadDynFieldsConfig()); }} />}
    </>
  );
}
