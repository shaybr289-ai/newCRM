import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCreateQuote, useUpdateQuote } from '../../hooks/useQuotes';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useDeals } from '../../hooks/useDeals';
import { useProducts, useFamilies } from '../../hooks/useProducts';
import { useConditions, useSettings } from '../../hooks/useDataManagement';
import { useQuoteTemplates } from '../../hooks/useQuoteTemplates';
import { QUOTE_STAGES, QUOTE_STATUSES, QUOTE_TYPES, STAGE_COLORS, EMPTY_QUOTE, mkEmptyItem, calcItemTotal, DELIVERY_TYPES, QUOTE_CURRENCIES } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import OwnerSelect from '../Layout/OwnerSelect';
import useAuthStore from '../../store/authStore';
import QuotePreviewModal, { buildPreviewHTML } from './QuotePreview';
import ScreenDesignerModal, { useScreenMeta } from './ScreenDesigner';
import SendQuoteModal from './SendQuoteModal';
import { useConvertQuoteToOrder } from '../../hooks/useOrders';
import './QuoteEditor.css';
import '../Tasks/TasksDashboard.css';

export default function QuoteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // Fetch existing quote
  const { data: existingQuote } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => api.get(`/api/quotes/${id}`),
    enabled: !!id && !isNew,
  });

  // Fetch quote items
  const { data: existingItems } = useQuery({
    queryKey: ['quote-items', id],
    queryFn: () => api.get(`/api/quotes/${id}/items`),
    enabled: !!id && !isNew,
  });

  const { data: custData } = useCustomers({ limit: 500 });
  const customers = custData?.data || [];

  const { data: prodData } = useProducts({ limit: 500 });
  const { data: famData } = useFamilies();
  const { data: condData } = useConditions();
  const { data: settingsData } = useSettings();
  const { data: tmplData } = useQuoteTemplates();
  const allProducts = prodData?.data || [];
  const allFamilies = famData?.data || [];
  const allConditions = condData?.data || [];
  const quoteTemplates = tmplData || [];

  const exchangeRates = {
    ILS: 1,
    USD: parseFloat(settingsData?.usd_rate) || 3.7,
    EUR: parseFloat(settingsData?.eur_rate) || 4.0,
    GBP: parseFloat(settingsData?.gbp_rate) || 4.7,
  };

  const createMut = useCreateQuote();
  const updateMut = useUpdateQuote();

  // Form state
  const [form, setForm] = useState(null);
  const [items, setItems] = useState([]);
  const [activeSection, setActiveSection] = useState('info');
  const [vatRate] = useState(18);
  const [showPreview, setShowPreview] = useState(false);
  const [showScreenDesigner, setShowScreenDesigner] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const authUser = useAuthStore(s => s.user);
  // Show internal cost column for admin/superAdmin users (can be refined per profile)
  const canViewCost = authUser?.userType === 'superAdmin' || authUser?.userType === 'admin';
  const [initialized, setInitialized] = useState(false);
  const [screenMetaVer, setScreenMetaVer] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const screenMeta = useMemo(() => useScreenMeta('quotes'), [screenMetaVer]);

  // Initialize form
  if (!initialized) {
    if (isNew) {
      setForm({ ...EMPTY_QUOTE });
      setItems([mkEmptyItem()]);
      setInitialized(true);
    } else if (existingQuote) {
      // Parse JSONB fields that may come as strings from DB
      const q = { ...existingQuote };
      if (typeof q.cond_overrides === 'string') try { q.cond_overrides = JSON.parse(q.cond_overrides); } catch { q.cond_overrides = {}; }
      if (typeof q.cond_order === 'string') try { q.cond_order = JSON.parse(q.cond_order); } catch { q.cond_order = []; }
      if (typeof q.images === 'string') try { q.images = JSON.parse(q.images); } catch { q.images = []; }
      // Map snake_case to camelCase for condOverrides
      q.condOverrides = q.cond_overrides || q.condOverrides || {};
      // Normalize date fields to yyyy-MM-dd
      ['quote_date', 'valid_until'].forEach(k => {
        if (q[k] && q[k].includes('T')) q[k] = q[k].split('T')[0];
      });
      setForm(q);
      setItems((existingItems?.data || []).map(it => ({
        id: it.id || 'qi' + Date.now() + Math.random().toString(36).slice(2),
        productName: it.product_name || it.productName || '',
        sku: it.sku || '',
        cost: it.cost || '',
        quantity: Number(it.quantity) === Math.floor(Number(it.quantity)) ? Math.floor(Number(it.quantity)) || 1 : Number(it.quantity) || 1,
        unitPrice: it.unit_price || it.unitPrice || '',
        discount: Number(it.discount) === Math.floor(Number(it.discount)) ? Math.floor(Number(it.discount)) : Number(it.discount) || 0,
        costType: it.cost_type || it.costType || 'onetime',
        description: it.description || '',
        groupHeader: it.group_header || it.groupHeader || '',
        mfrSku: it.mfr_sku || it.mfrSku || '',
        unit: it.unit || '',
      })));
      setInitialized(true);
    }
  }

  // Contacts filtered by customer
  const { data: contactsData } = useContacts({ customerId: form?.customer_id || '', limit: 200 });
  const contacts = contactsData?.data || [];

  // Open deals for the selected customer (not closed/lost)
  const { data: dealsData } = useDeals({ customerId: form?.customer_id || '', limit: 200 });
  const customerDeals = useMemo(() => {
    const all = dealsData?.data || [];
    const closedStages = ['חתומה', 'הפסד', 'won', 'lost'];
    return all.filter(d => !closedStages.includes(d.stage));
  }, [dealsData]);

  // ── Calculations ────────────────────────────────────────────────────────────
  // ── Auto-conditions from products' families ─────────────────────────────────
  const autoConditions = useMemo(() => {
    if (!items || !allProducts.length || !allConditions.length) return [];
    const seenIds = new Set();
    const result = [];
    // For each item, find its product, then its family, then linked conditions
    items.forEach(item => {
      const prod = allProducts.find(p => p.sku === item.sku || p.name === item.productName);
      if (!prod || !prod.family_id) return;
      allConditions.forEach(cond => {
        if (seenIds.has(cond.id)) return;
        // Check if condition is linked to this family
        const famIds = Array.isArray(cond.family_ids) ? cond.family_ids :
          (typeof cond.family_ids === 'string' ? (() => { try { return JSON.parse(cond.family_ids); } catch { return []; } })() : []);
        if (cond.product_family_id === prod.family_id || famIds.includes(prod.family_id)) {
          seenIds.add(cond.id);
          result.push(cond);
        }
      });
    });
    // Sort by position priority
    const pp = (p) => ({ first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,sixth_to_last:9994,fifth_to_last:9995,fourth_to_last:9996,third_to_last:9997,second_to_last:9998,last:9999 })[p] || 5000;
    return result.sort((a, b) => pp(a.cond_position) - pp(b.cond_position) || (a.display_order || 0) - (b.display_order || 0));
  }, [items, allProducts, allConditions]);

  const calculations = useMemo(() => {
    if (!items) return { onetimeSub: 0, recurringSub: 0, totalSub: 0, discount: 0, afterDiscount: 0, vat: 0, grand: 0 };
    const onetimeSub = items.filter(it => it.costType !== 'recurring').reduce((s, it) => s + calcItemTotal(it), 0);
    const recurringSub = items.filter(it => it.costType === 'recurring').reduce((s, it) => s + calcItemTotal(it), 0);
    const totalSub = onetimeSub + recurringSub;
    const discPct = Math.min(100, Math.max(0, parseFloat(form?.overall_discount) || 0));
    const discount = totalSub * (discPct / 100);
    const afterDiscount = totalSub - discount;
    const vat = afterDiscount * (vatRate / 100);
    const grand = afterDiscount + vat;
    return { onetimeSub, recurringSub, totalSub, discount, afterDiscount, vat, grand };
  }, [items, form?.overall_discount, vatRate]);

  // ── Item handlers ───────────────────────────────────────────────────────────
  const addItem = (costType = 'onetime') => setItems(p => [...(p || []), { ...mkEmptyItem(), costType }]);
  const removeItem = (idx) => setItems(p => p.filter((_, i) => i !== idx));
  const updateItem = (idx, key, val) => setItems(p => (p || []).map((it, i) => {
    if (i !== idx) return it;
    if (key === '_batch' && typeof val === 'object') return { ...it, ...val };
    return { ...it, [key]: val };
  }));
  const moveItem = (idx, dir) => {
    setItems(p => {
      const next = [...p];
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= next.length) return next;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };
  const duplicateItem = (idx) => {
    setItems(p => {
      const next = [...p];
      const dup = { ...next[idx], id: 'qi' + Date.now() + Math.random().toString(36).slice(2) };
      next.splice(idx + 1, 0, dup);
      return next;
    });
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async (opts = {}) => {
    if (!form.quote_name?.trim()) { alert('שם הצעה הוא שדה חובה'); return; }
    if (!form.customer_id) { alert('יש לבחור לקוח'); return; }

    try {
      // Prepare form — ensure JSONB fields are clean and use snake_case
      const saveData = { ...form };
      // Map camelCase to snake_case for JSONB fields
      if (saveData.condOverrides) { saveData.cond_overrides = saveData.condOverrides; delete saveData.condOverrides; }
      if (saveData.condOrder) { saveData.cond_order = saveData.condOrder; delete saveData.condOrder; }
      // Remove any undefined/function values
      for (const k of Object.keys(saveData)) {
        if (typeof saveData[k] === 'function') delete saveData[k];
      }
      // currency column requires DB migration — skip if not yet deployed
      delete saveData.currency;

      let savedId = id;
      if (isNew) {
        const result = await createMut.mutateAsync(saveData);
        savedId = result?.id;
        if (items.length > 0 && savedId) {
          await api.post(`/api/quotes/${savedId}/items`, { items });
        }
      } else {
        await updateMut.mutateAsync({ id, ...saveData });
        await api.post(`/api/quotes/${id}/items`, { items });
      }
      if (!opts.skipNavigate) navigate('/quotes');
      return savedId;
    } catch (err) {
      alert('שגיאה בשמירה: ' + (err.message || 'Unknown error'));
      throw err;
    }
  };

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const fmt = (n) => `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!form) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>טוען...</div>;

  const SECTIONS = [
    { id: 'info', label: 'פרטי הצעה', icon: 'quotes' },
    { id: 'items', label: 'פריטים ומחירים', icon: 'products' },
    { id: 'conditions', label: 'תנאים', icon: 'serviceagreements' },
    { id: 'images', label: 'תמונות', icon: 'datamanagement' },
    { id: 'summary', label: 'סיכום', icon: 'reports' },
  ];

  return (
    <div className="animate-in">
      {/* Top Bar */}
      <div className="tdb-topbar" style={{ marginBottom: 16 }}>
        <div className="tdb-topbar-left">
          <Link to="/quotes" className="tdb-calendar-btn" style={{ textDecoration: 'none' }}>← חזרה להצעות</Link>
          <span className="tdb-topbar-icon"><i className="ti ti-file-invoice" aria-hidden="true" /></span>
          <div>
            <h1 className="tdb-topbar-title">{isNew ? 'הצעת מחיר חדשה' : `עריכת הצעה — ${form.quote_name || ''}`}</h1>
            {form.quote_num && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>#{form.quote_num}</div>}
          </div>
        </div>
        <div className="tdb-topbar-right">
          {form.customer_id && (
            <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${form.customer_id}/relations`)}>
              <i className="ti ti-hierarchy" aria-hidden="true" /> מפת קשרים
            </button>
          )}
          <button className="tdb-calendar-btn" onClick={() => setShowScreenDesigner(true)} title="עיצוב מסך — ערוך שדות, סדר וערכים">
            <i className="ti ti-tool" aria-hidden="true" /> ערוך שדות
          </button>
          <button className="tdb-calendar-btn" onClick={() => setShowPreview(true)}>תצוגה מקדימה</button>
          <button className="tdb-calendar-btn" onClick={() => setShowSendEmail(true)} disabled={isNew}>שלח הצעת מחיר</button>
          <ConvertToOrderButton isNew={isNew} quoteId={form?.id} stage={form?.stage} itemsCount={(items || []).length} onSaveFirst={handleSave} isSaving={createMut.isPending || updateMut.isPending} />
          <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="qe-sections">
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            className={`qe-section-tab ${activeSection === sec.id ? 'active' : ''}`}
            onClick={() => setActiveSection(sec.id)}
          >
            <Icon svg={ICONS[sec.icon]} size={16} />
            <span>{sec.label}</span>
          </button>
        ))}
      </div>

      <div className="qe-body card">
        {/* ── INFO SECTION ───────────────────────────────────────────── */}
        {activeSection === 'info' && (
          <div className="qe-info">
            <div className="form-grid">
              {screenMeta.getFieldOrder('header').map(field => {
                const fieldId = field.id;
                const label = (id, def) => screenMeta.gl('header', id, def);
                switch (fieldId) {
                  case 'quoteName': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('quoteName', 'שם הצעה')} *</label>
                      <input value={form.quote_name || ''} onChange={e => upd('quote_name', e.target.value)} autoFocus />
                    </div>);
                  case 'customerId': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('customerId', 'לקוח')} *</label>
                      <select value={form.customer_id || ''} onChange={e => upd('customer_id', e.target.value)}>
                        <option value="">-- בחר לקוח --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                      </select>
                    </div>);
                  case 'contactId': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('contactId', 'איש קשר')}</label>
                      <select value={form.contact_id || ''} onChange={e => upd('contact_id', e.target.value)}>
                        <option value="">-- בחר --</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                      </select>
                    </div>);
                  case 'quoteType': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('quoteType', 'סוג הצעה')}</label>
                      <select value={form.quote_type || ''} onChange={e => upd('quote_type', e.target.value)}>
                        <option value="">-- בחר --</option>
                        {QUOTE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>);
                  case 'templateId': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('templateId', 'תבנית הצעה')}</label>
                      <select value={form.tmpl_id || ''} onChange={e => upd('tmpl_id', e.target.value)}
                        style={{ fontWeight: form.tmpl_id ? 600 : 400, color: form.tmpl_id ? 'var(--accent)' : 'var(--text-2)' }}>
                        <option value="">— ללא תבנית —</option>
                        {quoteTemplates.map(t => <option key={t.id} value={t.id}>{t.name} {t.layout === 'compact' ? '(קומפקטי)' : ''}</option>)}
                      </select>
                    </div>);
                  case 'stage': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('stage', 'שלב')}</label>
                      <select value={form.stage || 'draft'} onChange={e => upd('stage', e.target.value)}
                        style={{ color: STAGE_COLORS[form.stage] || '#94A3B8', fontWeight: 600 }}>
                        {QUOTE_STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>);
                  case 'currency': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('currency', 'מטבע')}</label>
                      <select value={form.currency || 'ILS'} onChange={e => upd('currency', e.target.value)}>
                        {QUOTE_CURRENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>);
                  case 'status': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('status', 'סטטוס')}</label>
                      <select value={form.status || 'active'} onChange={e => upd('status', e.target.value)}>
                        {QUOTE_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>);
                  case 'quoteDate': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('quoteDate', 'תאריך הצעה')}</label>
                      <input type="date" value={form.quote_date || ''} onChange={e => upd('quote_date', e.target.value)} dir="ltr" />
                    </div>);
                  case 'validUntil': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('validUntil', 'תוקף עד')}</label>
                      <input type="date" value={form.valid_until || ''} onChange={e => upd('valid_until', e.target.value)} dir="ltr" />
                    </div>);
                  case 'dealName': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('dealName', 'שם עסקה')}</label>
                      <select value={form.deal_id || ''} onChange={e => {
                        const did = e.target.value;
                        const d = customerDeals.find(x => x.id === did);
                        upd('deal_id', did || null);
                        upd('deal_name', d?.deal_name || '');
                      }} disabled={!form.customer_id}>
                        <option value="">-- ללא עסקה --</option>
                        {customerDeals.map(d => <option key={d.id} value={d.id}>{d.deal_num ? `${d.deal_num} — ` : ''}{d.deal_name}</option>)}
                      </select>
                      {!form.customer_id && <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>יש לבחור לקוח תחילה</span>}
                      {form.customer_id && customerDeals.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>אין עסקאות פתוחות ללקוח זה</span>}
                    </div>);
                  case 'overallDiscount': return (
                    <div className="form-field" key={fieldId}>
                      <label>{label('overallDiscount', 'הנחה כללית (%)')}</label>
                      <input type="number" value={form.overall_discount || ''} onChange={e => upd('overall_discount', e.target.value)} dir="ltr" min="0" max="100" />
                    </div>);
                  case 'owner': return (
                    <OwnerSelect key={fieldId} value={form.created_by} onChange={v => upd('created_by', v)} label={label('owner', 'בעלים')} />
                  );
                  default:
                    // Custom fields added via Screen Designer
                    if (!field.isCustom) return null;
                    return (
                      <div className="form-field" key={fieldId} style={field.fieldWidth === 'full' ? { gridColumn: '1/-1' } : undefined}>
                        <label>{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea value={form[fieldId] || ''} onChange={e => upd(fieldId, e.target.value)} rows={3} />
                        ) : field.type === 'select' || field.type === 'multiselect' ? (
                          <select value={form[fieldId] || ''} onChange={e => upd(fieldId, e.target.value)}>
                            <option value="">-- בחר --</option>
                            {(field.options || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        ) : field.type === 'checkbox' ? (
                          <div style={{ paddingTop: 6 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                              <input type="checkbox" checked={!!form[fieldId]} onChange={e => upd(fieldId, e.target.checked)} />
                              {field.label}
                            </label>
                          </div>
                        ) : field.type === 'date' ? (
                          <input type="date" value={form[fieldId] || ''} onChange={e => upd(fieldId, e.target.value)} dir="ltr" />
                        ) : field.type === 'number' ? (
                          <input type="number" value={form[fieldId] || ''} onChange={e => upd(fieldId, e.target.value)} dir="ltr" />
                        ) : field.type === 'email' ? (
                          <input type="email" value={form[fieldId] || ''} onChange={e => upd(fieldId, e.target.value)} dir="ltr" />
                        ) : field.type === 'url' ? (
                          <input type="url" value={form[fieldId] || ''} onChange={e => upd(fieldId, e.target.value)} dir="ltr" />
                        ) : field.type === 'phone' ? (
                          <input type="tel" value={form[fieldId] || ''} onChange={e => upd(fieldId, e.target.value)} dir="ltr" />
                        ) : (
                          <input value={form[fieldId] || ''} onChange={e => upd(fieldId, e.target.value)} />
                        )}
                      </div>
                    );
                }
              })}
            </div>
            {screenMeta.gsv('intro') && screenMeta.gv('intro', 'introText') && (
              <div className="form-field" style={{ marginTop: 16 }}>
                <label>{screenMeta.gl('intro', 'introText', 'טקסט פתיחה')}</label>
                <textarea value={form.intro_text || ''} onChange={e => upd('intro_text', e.target.value)} rows={3}
                  placeholder="טקסט שיופיע בתחילת ההצעה..." />
              </div>
            )}
          </div>
        )}

        {/* ── ITEMS SECTION ──────────────────────────────────────────── */}
        {activeSection === 'items' && (
          <div className="qe-items">
            <div className="qe-items-toolbar">
              <h3>פריטים ומחירים</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary" onClick={() => addItem('onetime')} style={{ fontSize: 12 }}>
                  + פריט חד"פ
                </button>
                <button className="btn btn-secondary" onClick={() => addItem('recurring')} style={{ fontSize: 12 }}>
                  + פריט שוטף
                </button>
              </div>
            </div>

            {/* Onetime items */}
            {items?.filter(it => it.costType !== 'recurring').length > 0 && (
              <div className="qe-items-group">
                <div className="qe-items-group-title">פריטים חד-פעמיים</div>
                <ItemsTable
                  items={items}
                  allItems={items}
                  filter="onetime"
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onMove={moveItem}
                  onDuplicate={duplicateItem}
                  products={allProducts}
                  showCost={canViewCost}
                  tableCols={screenMeta.getTableCols('onetimeItems')}
                  quoteCurrency={form?.currency || 'ILS'}
                  exchangeRates={exchangeRates}
                />
                {(() => {
                  const sub = calculations.onetimeSub;
                  const discPct = parseFloat(form.overall_discount) || 0;
                  const disc = sub * (discPct / 100);
                  const afterDisc = sub - disc;
                  const vatAmt = afterDisc * (vatRate / 100);
                  const grand = afterDisc + vatAmt;
                  return (
                    <div className="qe-totals">
                      <div className="qe-total-row"><span>סה"כ חד"פ:</span><span>{fmt(sub)}</span></div>
                      {disc > 0 && <div className="qe-total-row" style={{ color: 'var(--danger)' }}><span>הנחה ({discPct}%):</span><span>-{fmt(disc)}</span></div>}
                      {disc > 0 && <div className="qe-total-row"><span>לפני מע"מ:</span><span>{fmt(afterDisc)}</span></div>}
                      <div className="qe-total-row"><span>מע"מ ({vatRate}%):</span><span>{fmt(vatAmt)}</span></div>
                      <div className="qe-total-row qe-grand-total"><span>סה"כ חד"פ כולל מע"מ:</span><span>{fmt(grand)}</span></div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Recurring items */}
            {items?.filter(it => it.costType === 'recurring').length > 0 && (
              <div className="qe-items-group">
                <div className="qe-items-group-title">פריטים שוטפים (חודשי)</div>
                <ItemsTable
                  items={items}
                  allItems={items}
                  filter="recurring"
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onMove={moveItem}
                  onDuplicate={duplicateItem}
                  products={allProducts}
                  showCost={canViewCost}
                  tableCols={screenMeta.getTableCols('recurringItems')}
                  quoteCurrency={form?.currency || 'ILS'}
                  exchangeRates={exchangeRates}
                />
                {(() => {
                  const sub = calculations.recurringSub;
                  const discPct = parseFloat(form.overall_discount) || 0;
                  const disc = sub * (discPct / 100);
                  const afterDisc = sub - disc;
                  const vatAmt = afterDisc * (vatRate / 100);
                  const grand = afterDisc + vatAmt;
                  return (
                    <div className="qe-totals">
                      <div className="qe-total-row"><span>סה"כ שוטף:</span><span>{fmt(sub)}</span></div>
                      {disc > 0 && <div className="qe-total-row" style={{ color: 'var(--danger)' }}><span>הנחה ({discPct}%):</span><span>-{fmt(disc)}</span></div>}
                      {disc > 0 && <div className="qe-total-row"><span>לפני מע"מ:</span><span>{fmt(afterDisc)}</span></div>}
                      <div className="qe-total-row"><span>מע"מ ({vatRate}%):</span><span>{fmt(vatAmt)}</span></div>
                      <div className="qe-total-row qe-grand-total"><span>סה"כ שוטף כולל מע"מ:</span><span>{fmt(grand)}</span></div>
                    </div>
                  );
                })()}
              </div>
            )}

            {(!items || items.length === 0) && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                <p>אין פריטים. הוסף פריט חד"פ או שוטף.</p>
              </div>
            )}
          </div>
        )}

        {/* ── CONDITIONS SECTION ─────────────────────────────────────── */}
        {activeSection === 'conditions' && (
          <div className="qe-conditions">
            {/* Auto conditions from product families */}
            {autoConditions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 4 }}>תנאים אוטומטיים ממשפחות מוצרים ({autoConditions.length})</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 12 }}>
                  תנאים אלו נוספו אוטומטית לפי המוצרים שנבחרו בהצעה
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  {autoConditions.map((cond, idx) => {
                    const overridden = form.condOverrides?.[cond.id] !== undefined;
                    const condText = overridden ? form.condOverrides[cond.id] : (cond.content || '');
                    return (
                      <div key={cond.id} style={{ padding: '12px 16px', background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: idx < autoConditions.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ background: '#3B82F622', color: '#3B82F6', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                              {cond.cond_num || idx + 1}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{cond.name}</span>
                          </div>
                          {overridden && (
                            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}
                              onClick={() => upd('condOverrides', (() => { const o = { ...(form.condOverrides || {}) }; delete o[cond.id]; return o; })())}>
                              איפוס
                            </button>
                          )}
                        </div>
                        <textarea
                          value={condText}
                          onChange={e => upd('condOverrides', { ...(form.condOverrides || {}), [cond.id]: e.target.value })}
                          rows={2}
                          style={{ width: '100%', fontSize: 13, lineHeight: 1.6, border: overridden ? '1px solid #F59E0B' : '1px solid var(--border-light)', borderRadius: 6, padding: '6px 10px', background: overridden ? '#FEF3C7' : 'transparent' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {autoConditions.length === 0 && items?.length > 0 && (
              <div style={{ background: '#F59E0B11', border: '1px solid #F59E0B33', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#F59E0B' }}>
                לא נמצאו תנאים אוטומטיים — ודא שלמוצרים שנבחרו יש משפחת מוצר עם תנאים משויכים
              </div>
            )}

            <h3 style={{ marginBottom: 8, marginTop: 16 }}>תנאים נוספים (חופשי)</h3>
            <textarea
              value={form.conditions || ''}
              onChange={e => upd('conditions', e.target.value)}
              rows={5}
              placeholder="תנאים נוספים שיופיעו בהצעה..."
              style={{ fontSize: 14 }}
            />
          </div>
        )}

        {/* ── IMAGES SECTION ─────────────────────────────────────────── */}
        {activeSection === 'images' && (
          <ImagesSection images={form.images || []} onChange={imgs => upd('images', imgs)} />
        )}

        {/* ── SUMMARY SECTION ────────────────────────────────────────── */}
        {activeSection === 'summary' && (
          <div className="qe-summary">
            {(() => {
              const RO = ({ label, value, valueStyle }) => (
                <div className="form-field">
                  <label>{label}</label>
                  <input value={value ?? '—'} readOnly style={{ background: 'var(--bg-elevated)', cursor: 'default', ...(valueStyle || {}) }} />
                </div>
              );
              // Calculate total costs (internal)
              const costOf = (it) => {
                const prod = allProducts.find(p => p.sku === it.sku || p.name === it.productName);
                return (parseFloat(prod?.unit_price) || 0) * (parseFloat(it.quantity) || 0);
              };
              const deliveryContact = contacts.find(c => c.id === form.delivery_contact_id);
              const onetimeItems = items?.filter(it => it.costType !== 'recurring') || [];
              const recurringItems = items?.filter(it => it.costType === 'recurring') || [];
              const onetimeCost = onetimeItems.reduce((s, it) => s + costOf(it), 0);
              const recurringCost = recurringItems.reduce((s, it) => s + costOf(it), 0);
              // Profit margin (%) = (revenue - cost) / revenue * 100
              const profitPct = (rev, cost) => rev > 0 ? (((rev - cost) / rev) * 100) : 0;
              const onetimeProfit = profitPct(calculations.onetimeSub, onetimeCost);
              const recurringProfit = profitPct(calculations.recurringSub, recurringCost);
              const fmtPct = (n) => `${n.toFixed(1)}%`;
              const profitColor = (p) => p >= 30 ? 'var(--success)' : p >= 15 ? 'var(--warning)' : 'var(--danger)';
              return (
                <>
                  <h3 className="form-section-title">פרטי משלוח / אספקה</h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>סוג משלוח</label>
                      <select value={form.delivery_type || ''} onChange={e => upd('delivery_type', e.target.value)}>
                        <option value="">-- בחר --</option>
                        {DELIVERY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>תאריך אספקה</label>
                      <input type="date" value={form.delivery_date ? String(form.delivery_date).split('T')[0] : ''}
                        onChange={e => upd('delivery_date', e.target.value)} dir="ltr" />
                    </div>
                    <div className="form-field" style={{ gridColumn: '1/-1' }}>
                      <label>כתובת למשלוח</label>
                      <input value={form.delivery_address || ''} onChange={e => upd('delivery_address', e.target.value)} placeholder="רחוב, עיר, מיקוד..." />
                    </div>
                    <div className="form-field">
                      <label>איש קשר לקבלת הפריטים</label>
                      <select value={form.delivery_contact_id || ''} onChange={e => upd('delivery_contact_id', e.target.value)}>
                        <option value="">-- בחר --</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>טלפון איש קשר</label>
                      <input value={deliveryContact?.mobile || deliveryContact?.phone || (form.delivery_contact_id ? '—' : '')} readOnly
                        style={{ background: 'var(--bg-elevated)', cursor: 'default' }} dir="ltr" />
                    </div>
                  </div>

                  <h3 className="form-section-title">פריטים חד-פעמיים</h3>
                  <div className="form-grid">
                    <RO label={'פריטים חד"פ'} value={onetimeItems.length} />
                    <RO label={'סה"כ חד"פ'} value={fmt(calculations.onetimeSub)} valueStyle={{ fontWeight: 600 }} />
                    <RO label={'סה"כ עלות חד"פ (פנימי)'} value={fmt(onetimeCost)} valueStyle={{ color: '#92400E', fontWeight: 600, background: '#FEF3C7' }} />
                    <RO label={'רווחיות חד"פ'} value={fmtPct(onetimeProfit)} valueStyle={{ color: profitColor(onetimeProfit), fontWeight: 700 }} />
                  </div>

                  <h3 className="form-section-title">פריטים שוטפים</h3>
                  <div className="form-grid">
                    <RO label="פריטים שוטפים" value={recurringItems.length} />
                    <RO label={'סה"כ שוטף'} value={fmt(calculations.recurringSub)} valueStyle={{ fontWeight: 600 }} />
                    <RO label={'סה"כ עלות שוטף (פנימי)'} value={fmt(recurringCost)} valueStyle={{ color: '#92400E', fontWeight: 600, background: '#FEF3C7' }} />
                    <RO label="רווחיות שוטף" value={fmtPct(recurringProfit)} valueStyle={{ color: profitColor(recurringProfit), fontWeight: 700 }} />
                  </div>

                  <h3 className="form-section-title">סיכום כללי</h3>
                  <div className="form-grid">
                    <RO label="תמונות" value={`${(form.images || []).filter(Boolean).length}/6`} />
                    <RO label={'סה"כ כולל מע"מ'} value={fmt(calculations.grand)} valueStyle={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }} />
                  </div>
                </>
              );
            })()}

            <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור הצעה'}
              </button>
              <Link to="/quotes" className="btn btn-ghost">ביטול</Link>
            </div>
          </div>
        )}
      </div>
      {/* Screen Designer Modal */}
      {showScreenDesigner && (
        <ScreenDesignerModal moduleId="quotes" onClose={() => { setShowScreenDesigner(false); setScreenMetaVer(v => v + 1); }} />
      )}

      {/* Send Email Modal */}
      {showSendEmail && (
        <SendQuoteModal
          form={form}
          items={items}
          customer={customers.find(c => c.id === form.customer_id)}
          contact={contacts.find(c => c.id === form.contact_id)}
          autoConditions={autoConditions}
          vatRate={vatRate}
          quoteTemplate={quoteTemplates.find(t => t.id === (form.tmpl_id || form.template_id)) || (quoteTemplates.length === 1 ? quoteTemplates[0] : null)}
          onClose={() => setShowSendEmail(false)}
          onSent={() => {
            if (form.id && form.stage !== 'sent') {
              setForm(prev => ({ ...prev, stage: 'sent' }));
              updateMut.mutate({ id: form.id, stage: 'sent' });
            }
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <QuotePreviewModal
          html={buildPreviewHTML({
            template: quoteTemplates.find(t => t.id === (form.tmpl_id || form.template_id)) || (quoteTemplates.length === 1 ? quoteTemplates[0] : null),
            form,
            items,
            customer: customers.find(c => c.id === form.customer_id),
            autoConditions,
            vatRate,
          })}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );

  function getCustName(cid) {
    return customers.find(c => c.id === cid)?.company_name || '—';
  }
}

// ── Convert to Order Button ─────────────────────────────────────────────────

function ConvertToOrderButton({ isNew, quoteId, stage, itemsCount = 0, onSaveFirst, isSaving }) {
  const navigate = useNavigate();
  const convertMut = useConvertQuoteToOrder();
  const isSigned = stage === 'signed' || stage === 'חתומה';
  const hasItems = itemsCount > 0;
  const disabled = isNew || !isSigned || !hasItems || convertMut.isPending || isSaving;
  const title = isNew ? 'יש לשמור את ההצעה תחילה'
    : !isSigned ? 'ניתן להמיר להזמנה רק הצעה בשלב "חתומה"'
    : !hasItems ? 'לא ניתן להמיר — יש להוסיף לפחות פריט אחד להצעה'
    : 'המר הצעה זו להזמנה חדשה';

  const handleClick = async () => {
    if (!hasItems) { alert('לא ניתן להמיר הצעת מחיר להזמנה — יש להוסיף לפחות פריט אחד להצעה'); return; }
    if (!confirm('האם להמיר את ההצעה להזמנה חדשה? ההצעה תישמר תחילה.')) return;
    try {
      // Save first (without navigate) to persist latest stage + items
      if (onSaveFirst) await onSaveFirst({ skipNavigate: true });
      // Small delay to ensure DB transaction commits
      await new Promise(r => setTimeout(r, 300));
      const result = await convertMut.mutateAsync(quoteId);
      if (result.ok && result.order) {
        alert(`ההזמנה ${result.order.order_num} נוצרה בהצלחה!`);
        navigate(`/orders?edit=${result.order.id}`);
      }
    } catch (err) {
      alert(err.message || 'שגיאה בהמרת הצעה להזמנה');
    }
  };

  return (
    <button
      className="btn btn-secondary"
      onClick={handleClick}
      disabled={disabled}
      title={title}
      style={{ fontSize: 13, background: isSigned && !isNew ? 'var(--success)' : undefined, color: isSigned && !isNew ? 'white' : undefined, borderColor: isSigned && !isNew ? 'var(--success)' : undefined }}
    >
      {convertMut.isPending ? 'ממיר...' : <><i className="ti ti-package" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> המר הצעה להזמנה</>}
    </button>
  );
}

// ── Items Table Component ────────────────────────────────────────────────────

function ItemsTable({ items, allItems, filter, onUpdate, onRemove, onMove, onDuplicate, products = [], showCost = false, tableCols = [], quoteCurrency = 'ILS', exchangeRates = { ILS: 1, USD: 3.7, EUR: 4.0, GBP: 4.7 } }) {
  const filtered = allItems.map((it, idx) => ({ ...it, _idx: idx }))
    .filter(it => filter === 'recurring' ? it.costType === 'recurring' : it.costType !== 'recurring');

  // Column visibility & labels from screen designer
  const colEnabled = (colId) => { const c = tableCols.find(tc => tc.id === colId); return c ? c.enabled !== false : true; };
  const colLabel = (colId, def) => { const c = tableCols.find(tc => tc.id === colId); return c?.label ?? def; };

  const [searchIdx, setSearchIdx] = useState(null); // which row is searching
  const [searchText, setSearchText] = useState('');

  const searchResults = useMemo(() => {
    if (!searchText || searchText.length < 1) return [];
    const q = searchText.toLowerCase();
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.mfr_name || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchText, products]);

  const selectProduct = (rowIdx, prod) => {
    const rawPrice = parseFloat(prod.sale_price || prod.unit_price || 0);
    const fromCurrency = prod.sale_currency || 'ILS';
    let convertedPrice = rawPrice;
    if (fromCurrency !== quoteCurrency && rawPrice > 0) {
      // Convert: rawPrice in fromCurrency → ILS → quoteCurrency
      const inILS = rawPrice * (exchangeRates[fromCurrency] || 1);
      convertedPrice = inILS / (exchangeRates[quoteCurrency] || 1);
      convertedPrice = Math.round(convertedPrice * 100) / 100;
    }
    onUpdate(rowIdx, '_batch', {
      productName: prod.name || '',
      sku: prod.sku || '',
      unitPrice: convertedPrice || '',
      mfrSku: prod.mfr_sku || '',
      unit: prod.unit_of_use || '',
    });
    setSearchIdx(null);
    setSearchText('');
  };

  return (
    <div className="qe-items-table">
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}>{colLabel('num', '#')}</th>
            {colEnabled('productName') && <th>{colLabel('productName', 'שם מוצר / שירות')}</th>}
            {colEnabled('sku') && <th style={{ width: 100 }}>{colLabel('sku', 'מק"ט')}</th>}
            {showCost && colEnabled('cost') && <th style={{ width: 90, background: '#FEF3C7', color: '#92400E' }}>{colLabel('cost', 'עלות (פנימי)')}</th>}
            {colEnabled('qty') && <th style={{ width: 70 }}>{colLabel('qty', 'כמות')}</th>}
            {colEnabled('unit') && <th style={{ width: 60 }}>{colLabel('unit', 'יחידה')}</th>}
            {colEnabled('unitPrice') && <th style={{ width: 100 }}>{colLabel('unitPrice', 'מחיר ליחידה')}</th>}
            {colEnabled('discount') && <th style={{ width: 70 }}>{colLabel('discount', 'הנחה %')}</th>}
            <th style={{ width: 110 }}>{colLabel('total', 'סה"כ')}</th>
            {colEnabled('groupHeader') && <th style={{ width: 110 }}>{colLabel('groupHeader', 'קיבוץ כותרות')}</th>}
            <th style={{ width: 100 }}>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((it, rowIdx) => (
            <React.Fragment key={it.id}>
              <tr>
                <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{rowIdx + 1}</td>
                {colEnabled('productName') && (
                  <td style={{ position: 'relative' }}>
                    <input value={searchIdx === it._idx ? searchText : (it.productName || '')}
                      onFocus={() => { setSearchIdx(it._idx); setSearchText(it.productName || ''); }}
                      onChange={e => {
                        setSearchText(e.target.value);
                        onUpdate(it._idx, 'productName', e.target.value);
                      }}
                      onBlur={() => setTimeout(() => setSearchIdx(null), 200)}
                      placeholder="חפש מוצר או הקלד שם..."
                      style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 13, padding: '4px 0' }} />
                    {searchIdx === it._idx && searchResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 20,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 8, boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto',
                      }}>
                        {searchResults.map(p => (
                          <div key={p.id}
                            onMouseDown={e => { e.preventDefault(); selectProduct(it._idx, p); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--accent-light)'}
                            onMouseOut={e => e.currentTarget.style.background = ''}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 12 }}>
                              {p.sku && <span>מק"ט: {p.sku}</span>}
                              {(p.sale_price || p.unit_price) && <span>₪{Number(p.sale_price || p.unit_price).toLocaleString()}</span>}
                              {p.mfr_name && <span>{p.mfr_name}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                )}
                {colEnabled('sku') && (
                  <td><input value={it.sku || ''} onChange={e => onUpdate(it._idx, 'sku', e.target.value)} dir="ltr"
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, padding: '4px 0' }} /></td>
                )}
                {showCost && colEnabled('cost') && (() => {
                  const prod = products.find(p => p.sku === it.sku || p.name === it.productName);
                  const cost = prod?.unit_price;
                  return <td style={{ background: '#FEF3C7', fontSize: 12, textAlign: 'center', color: '#92400E', fontWeight: 600 }}>
                    {cost ? `₪${Number(cost).toLocaleString()}` : '—'}
                  </td>;
                })()}
                {colEnabled('qty') && (
                  <td><input type="number" value={it.quantity ?? ''} onChange={e => onUpdate(it._idx, 'quantity', e.target.value)} dir="ltr" min="0"
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 13, textAlign: 'center', padding: '4px 0' }} /></td>
                )}
                {colEnabled('unit') && (
                  <td><input value={it.unit || ''} onChange={e => onUpdate(it._idx, 'unit', e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, textAlign: 'center', padding: '4px 0' }} placeholder="יח'" /></td>
                )}
                {colEnabled('unitPrice') && (
                  <td><input type="number" value={it.unitPrice ?? ''} onChange={e => onUpdate(it._idx, 'unitPrice', e.target.value)} dir="ltr" min="0"
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 13, textAlign: 'left', padding: '4px 0' }} /></td>
                )}
                {colEnabled('discount') && (
                  <td><input type="number" value={it.discount ?? ''} onChange={e => onUpdate(it._idx, 'discount', e.target.value)} dir="ltr" min="0" max="100"
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 13, textAlign: 'center', padding: '4px 0' }} /></td>
                )}
                <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>
                  ₪{calcItemTotal(it).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </td>
                {colEnabled('groupHeader') && (
                  <td>
                    <input value={it.groupHeader || ''} onChange={e => onUpdate(it._idx, 'groupHeader', e.target.value)}
                      placeholder="כותרת קבוצה..."
                      style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 11, padding: '4px 0', color: 'var(--text-2)' }} />
                  </td>
                )}
                <td>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="action-btn" onClick={() => onMove(it._idx, -1)} title="הזז למעלה" style={{ fontSize: 11 }}>▲</button>
                    <button className="action-btn" onClick={() => onMove(it._idx, 1)} title="הזז למטה" style={{ fontSize: 11 }}>▼</button>
                    <button className="action-btn" onClick={() => onDuplicate(it._idx)} title="שכפל" aria-label="שכפל שורה"><i className="ti ti-copy" aria-hidden="true" /></button>
                    <button className="action-btn delete" onClick={() => onRemove(it._idx)} title="הסר" aria-label="הסר שורה"><i className="ti ti-x" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
              {/* Description row */}
              <tr>
                <td></td>
                <td colSpan={99}>
                  <input value={it.description || ''} onChange={e => onUpdate(it._idx, 'description', e.target.value)}
                    placeholder="תיאור / הערה..."
                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 11, color: 'var(--text-3)', padding: '0 0 4px 0' }} />
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Images Section Component ─────────────────────────────────────────────────

function ImagesSection({ images, onChange }) {
  const handleUpload = (idx) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const next = [...(images || [])];
        while (next.length <= idx) next.push(null);
        next[idx] = { data: ev.target.result, caption: file.name };
        onChange(next);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleRemove = (idx) => {
    const next = [...images];
    next[idx] = null;
    onChange(next);
  };

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>תמונות להצעה</h3>
      <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 16 }}>עד 6 תמונות. לחץ להוסיף או להחליף.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const img = images[i];
          return (
            <div key={i} className="qe-img-slot" onClick={() => !img && handleUpload(i)}>
              {img ? (
                <>
                  <img src={img.data} alt={img.caption || ''} />
                  <button className="qe-img-remove" onClick={(e) => { e.stopPropagation(); handleRemove(i); }} aria-label="הסר תמונה"><i className="ti ti-x" aria-hidden="true" /></button>
                </>
              ) : (
                <div className="qe-img-empty">
                  <span style={{ fontSize: 24 }}>+</span>
                  <span style={{ fontSize: 11 }}>תמונה {i + 1}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
