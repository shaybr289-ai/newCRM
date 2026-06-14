import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal } from '../../hooks/useDeals';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useFamilies } from '../../hooks/useProducts';
import { useUsers } from '../../hooks/useUsers';
import { DEALS_COLUMNS, EMPTY_DEAL, DEAL_STAGES, DEAL_TYPES, DEAL_PRIORITIES, DEAL_STAGE_COLORS, STATUS_OPTIONS } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import DataTable from '../Layout/DataTable';
import ModuleTopbar from '../Layout/ModuleTopbar';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import { usePerms } from '../../hooks/usePerms';
import DeleteConfirmModal from '../Layout/DeleteConfirmModal';
import { useT } from '../../hooks/useT';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import { useScreenMeta } from '../Quotes/ScreenDesigner';
import ScreenDesignerModal from '../Quotes/ScreenDesigner';
import '../Customers/CustomerModal.css';
import './DealEditor.css';

export default function DealsPage() {
  const { t } = useT();
  const { canView, canCreate, canEdit, canDelete, canUseButton } = usePerms('deals');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [customerAlert, setCustomerAlert] = useState(null);
  const [showScreenDesigner, setShowScreenDesigner] = useState(false);

  const qc = useQueryClient();
  const authUser = useAuthStore(s => s.user);
  const isAdmin = authUser?.userType === 'admin' || authUser?.userType === 'superAdmin' || authUser?.user_type === 'admin' || authUser?.user_type === 'superAdmin';
  const screenMeta = useScreenMeta('deals');
  const stageOpts     = screenMeta.goo('deal_info', 'stage', DEAL_STAGES) || DEAL_STAGES;
  const stageOptsMain = stageOpts.filter(([k]) => k !== 'הפסד');
  const lossStageLabel = stageOpts.find(([k]) => k === 'הפסד')?.[1] || t('הפסד');
  const PIPELINE_COLORS = ['#94A3B8','#60A5FA','#F59E0B','#3B82F6','#7C3AED','#EC4899','#14B8A6','#F97316','#10B981'];

  const { data, isLoading, error } = useDeals({ page, limit: 50, search, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: contactData } = useContacts({ limit: 500 });
  const { data: famData } = useFamilies();
  const { data: usersData } = useUsers({ limit: 500 });
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

  const users = usersData?.data || [];
  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';
  const showCustomerAlertIfNeeded = (custId) => {
    if (!custId) return;
    const cust = customers.find(c => c.id === custId);
    if (cust?.alert_message?.trim()) setCustomerAlert({ message: cust.alert_message, custName: cust.company_name });
  };
  const getContactName = (id) => { const c = allContacts.find(x => x.id === id); return c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '—'; };
  const getOwnerName = (id) => { const u = users.find(x => x.id === id); return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '—' : '—'; };
  const custContacts = useMemo(() => editItem?.customer_id ? allContacts.filter(c => c.customer_id === editItem.customer_id) : [], [editItem?.customer_id, allContacts]);

  // Open edit from URL (e.g. navigating from relations map)
  useEffect(() => {
    const editId = searchParams.get('edit');
    const isNew = searchParams.get('new');
    const custId = searchParams.get('customer_id');
    const viewOnlyParam = searchParams.get('viewOnly') === '1';
    if (editId && deals.length) {
      const deal = deals.find(d => d.id === editId);
      if (deal) {
        const item = { ...deal };
        if (item.custom_data) {
          if (typeof item.custom_data === 'string') { try { item.custom_data = JSON.parse(item.custom_data); } catch { item.custom_data = {}; } }
          if (typeof item.custom_data === 'object') Object.assign(item, item.custom_data);
        }
        setViewOnly(viewOnlyParam); setEditItem(item); setSearchParams({}, { replace: true }); showCustomerAlertIfNeeded(deal.customer_id);
      }
    } else if (isNew) {
      setEditItem({ ...EMPTY_DEAL, solutions: [], customer_id: custId || '' });
      setSearchParams({}, { replace: true });
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
      case 'owner': return getOwnerName(row.owner);
      default: return row[key] || '—';
    }
  };

  const handleSave = async () => {
    const form = { ...editItem };
    if (!form.deal_name?.trim()) { alert(t('שם עסקה הוא שדה חובה')); return; }
    if (form.stage === 'חתומה' && !form.actual_close_date) {
      form.actual_close_date = new Date().toISOString().split('T')[0];
    }
    const customData = {};
    for (const k of Object.keys(form)) {
      if (/^cf\d+$/.test(k)) { customData[k] = form[k]; delete form[k]; }
    }
    form.custom_data = { ...(form.custom_data || {}), ...customData };
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
    if (editItem?.id === confirmDel.id) setEditItem(null);
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

  const renderCustomField = useCallback((f) => {
    const val = editItem ? (editItem[f.id] ?? '') : '';
    const onChange = v => upd(f.id, v);
    if (f.type === 'textarea') return <textarea value={val} onChange={e => onChange(e.target.value)} rows={3} maxLength={f.maxLength} />;
    if (f.type === 'select' || f.type === 'multiselect') {
      const opts = f.options || [];
      const isMulti = f.type === 'multiselect';
      const multiVal = Array.isArray(val) ? val : (val ? String(val).split(',').filter(Boolean) : []);
      return (
        <select value={isMulti ? multiVal : val} multiple={isMulti} onChange={e => isMulti ? onChange(Array.from(e.target.selectedOptions, o => o.value)) : onChange(e.target.value)} style={isMulti ? { minHeight: 80 } : {}}>
          {!isMulti && <option value="">— {t('בחר')} —</option>}
          {opts.map((opt, oi) => {
            const k = Array.isArray(opt) ? opt[0] : (opt?.key ?? opt);
            const lbl = Array.isArray(opt) ? opt[1] : (opt?.label ?? opt?.value ?? opt);
            const v = k || lbl || String(oi);
            return <option key={v} value={v}>{lbl}</option>;
          })}
        </select>
      );
    }
    if (f.type === 'radio') {
      const opts = f.options || [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
          {opts.map(([k, lbl]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="radio" name={f.id} value={k} checked={val === k} onChange={() => onChange(k)} style={{ width: 15, height: 15 }} />
              {lbl}
            </label>
          ))}
        </div>
      );
    }
    if (f.type === 'date') return <input type="date" value={val} onChange={e => onChange(e.target.value)} dir="ltr" />;
    if (f.type === 'datetime') return <input type="datetime-local" value={val} onChange={e => onChange(e.target.value)} dir="ltr" />;
    if (f.type === 'number') return <input type="number" value={val} onChange={e => onChange(e.target.value)} />;
    if (f.type === 'bigint') return <input type="number" step="1" value={val} onChange={e => onChange(e.target.value)} />;
    if (f.type === 'percent') {
      const dp = f.decimalPlaces ?? 0;
      return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" value={val} min={0} max={100} step={dp > 0 ? Math.pow(10, -dp) : 1}
            onChange={e => onChange(e.target.value)} style={{ flex: 1 }} dir="ltr" />
          <span style={{ fontSize: 15, color: 'var(--text-2)', fontWeight: 700, flexShrink: 0 }}>%</span>
        </div>
      );
    }
    if (f.type === 'currency') {
      const sym = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' }[f.currencyCode || 'ILS'] || '₪';
      return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700, padding: '8px 8px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)', flexShrink: 0 }}>{sym}</span>
          <input type="number" value={val} onChange={e => onChange(e.target.value)} style={{ flex: 1 }} dir="ltr" />
        </div>
      );
    }
    if (f.type === 'autonumber') return (
      <input type="text" value={val || `${f.autoPrefix || ''}${String(1).padStart(f.autoDigits || 4, '0')}`} readOnly
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', fontWeight: 600, cursor: 'default' }} />
    );
    if (f.type === 'user') return (
      <select value={val} onChange={e => onChange(e.target.value)}>
        <option value="">— {t('בחר משתמש')} —</option>
        {users.map(u => {
          const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email || u.id;
          return <option key={u.id} value={u.id}>{name}</option>;
        })}
      </select>
    );
    if (f.type === 'file') return (
      <div>
        <input type="file" id={`cf-file-${f.id}`} style={{ display: 'none' }}
          onChange={e => { const file = e.target.files?.[0]; if (file) onChange(file.name); }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label htmlFor={`cf-file-${f.id}`} style={{ cursor: 'pointer', padding: '7px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-paperclip" aria-hidden="true" />{t('בחר קובץ')}
          </label>
          {val && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{val}</span>}
        </div>
      </div>
    );
    if (f.type === 'image') return (
      <div>
        <input type="file" accept="image/*" id={`cf-img-${f.id}`} style={{ display: 'none' }}
          onChange={e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => onChange(ev.target.result); reader.readAsDataURL(file); }} />
        {val && <img src={val} alt="" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, marginBottom: 6, display: 'block', objectFit: 'cover' }} />}
        <label htmlFor={`cf-img-${f.id}`} style={{ cursor: 'pointer', padding: '7px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-photo" aria-hidden="true" />{val ? t('שנה תמונה') : t('בחר תמונה')}
        </label>
      </div>
    );
    if (f.type === 'address') {
      let addr = {};
      try { addr = val && typeof val === 'string' ? JSON.parse(val) : (val && typeof val === 'object' ? val : {}); } catch { addr = {}; }
      const updAddr = (k, v) => onChange(JSON.stringify({ ...addr, [k]: v }));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input type="text" value={addr.street || ''} onChange={e => updAddr('street', e.target.value)} placeholder={t('רחוב ומספר')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <input type="text" value={addr.city || ''} onChange={e => updAddr('city', e.target.value)} placeholder={t('עיר')} />
            <input type="text" value={addr.zip || ''} onChange={e => updAddr('zip', e.target.value)} placeholder={t('מיקוד')} dir="ltr" />
          </div>
          <input type="text" value={addr.country || ''} onChange={e => updAddr('country', e.target.value)} placeholder={t('מדינה')} />
        </div>
      );
    }
    if (f.type === 'checkbox') return <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input type="checkbox" checked={!!editItem?.[f.id]} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16 }} />{f.label}</label>;
    if (f.type === 'email') return <input type="email" value={val} onChange={e => onChange(e.target.value)} dir="ltr" />;
    if (f.type === 'phone') return <input type="tel" value={val} onChange={e => onChange(e.target.value)} dir="ltr" />;
    if (f.type === 'url') return <input type="url" value={val} onChange={e => onChange(e.target.value)} dir="ltr" />;
    if (f.type === 'subform') {
      const cols = f.subformFields || [];
      let rows = [];
      try { rows = JSON.parse(val || '[]'); if (!Array.isArray(rows)) rows = []; } catch { rows = []; }
      const setRows = (r) => onChange(JSON.stringify(r));
      return (
        <div style={{ gridColumn: '1/-1', overflowX: 'auto' }}>
          {cols.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: cols.length * 120 }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {cols.map(col => <th key={col.id} style={{ padding: '5px 8px', border: '1px solid var(--border)', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{col.label}</th>)}
                  <th style={{ width: 32, border: '1px solid var(--border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-elevated)' }}>
                    {cols.map(col => (
                      <td key={col.id} style={{ padding: 2, border: '1px solid var(--border)' }}>
                        {col.type === 'checkbox'
                          ? <input type="checkbox" checked={!!row[col.id]} onChange={e => { const r = [...rows]; r[ri] = { ...r[ri], [col.id]: e.target.checked }; setRows(r); }} style={{ margin: '6px auto', display: 'block' }} />
                          : <input
                              type={col.type === 'number' || col.type === 'currency' || col.type === 'percent' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                              value={row[col.id] ?? ''}
                              onChange={e => { const r = [...rows]; r[ri] = { ...r[ri], [col.id]: e.target.value }; setRows(r); }}
                              style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 6px', fontSize: 13 }}
                            />
                        }
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', border: '1px solid var(--border)' }}>
                      <button onClick={() => setRows(rows.filter((_, i) => i !== ri))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, lineHeight: 1 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '6px 0' }}>הגדר עמודות בעורך השדות</div>}
          <button onClick={() => setRows([...rows, {}])} className="btn btn-ghost" style={{ marginTop: 6, fontSize: 12, padding: '5px 10px' }}>
            <i className="ti ti-plus" aria-hidden="true" /> הוסף שורה
          </button>
        </div>
      );
    }
    return <input type="text" value={val} onChange={e => onChange(e.target.value)} maxLength={f.maxLength} />;
  }, [editItem, users, t]); // eslint-disable-line

  const addSolution = () => upd('solutions', [...getSolutions(), { family_id: '', desc: '', qty: 1 }]);
  const updSolution = (idx, key, val) => upd('solutions', getSolutions().map((s, i) => i === idx ? { ...s, [key]: val } : s));
  const removeSolution = (idx) => upd('solutions', getSolutions().filter((_, i) => i !== idx));

  const dealStats = useMemo(() => {
    const active = deals.filter(d => d.stage && d.stage !== 'הפסד' && d.stage !== 'חתומה').length;
    const won = deals.filter(d => d.stage === 'חתומה').length;
    const potentialOT = deals.filter(d => d.stage !== 'הפסד').reduce((s, d) => s + (parseFloat(d.expected_one_time) || 0), 0);
    const potentialRec = deals.filter(d => d.stage !== 'הפסד').reduce((s, d) => s + (parseFloat(d.expected_recurring) || 0), 0);
    return [
      { label: t('עסקאות פעילות'), value: active, color: 'var(--accent)' },
      { label: t('עסקאות שנסגרו'), value: won, color: 'var(--success)' },
      { label: t('פוטנציאל חד"פ'), value: `₪${Math.round(potentialOT).toLocaleString()}`, color: 'var(--info)' },
      { label: t('פוטנציאל שוטף'), value: `₪${Math.round(potentialRec).toLocaleString()}`, color: 'var(--warning)' },
    ];
  }, [deals]);

  // ── Deal Editor (full page) ───────────────────────────────────────────
  if (editItem) {
    const currentStageIdx = stageOptsMain.findIndex(([k]) => k === editItem.stage);
    const isLost = editItem.stage === 'הפסד';
    const isWon = editItem.stage === 'חתומה';

    // Base field renderers (input only, no label/wrapper — renderSectionFields adds those)
    const baseFieldContent = {
      deal_name:           () => <input value={editItem.deal_name || ''} onChange={e => upd('deal_name', e.target.value)} autoFocus />,
      customer_id:         () => (
        <>
          <select value={editItem.customer_id || ''} onChange={e => upd('customer_id', e.target.value)}>
            <option value="">{t('-- בחר לקוח --')}</option>
            {customers.map(c => {
              const statusLabel = STATUS_OPTIONS.find(([v]) => v === c.status)?.[1] || '';
              const showStatus = c.status && c.status !== 'active';
              return <option key={c.id} value={c.id}>{c.cust_num ? `${c.cust_num} — ` : ''}{c.company_name}{showStatus ? ` (${statusLabel})` : ''}</option>;
            })}
          </select>
          {editItem.customer_id && (() => {
            const cust = customers.find(c => c.id === editItem.customer_id);
            const STATUS_COLORS = { warning: '#f59e0b', limited: '#ef4444', potential: '#3b82f6', inactive: '#94a3b8' };
            if (!cust || !cust.status || cust.status === 'active') return null;
            const sl = STATUS_OPTIONS.find(([v]) => v === cust.status)?.[1] || cust.status;
            return <span style={{ fontSize: 12, color: STATUS_COLORS[cust.status] || '#64748b', fontWeight: 600, marginTop: 4, display: 'block' }}>⚠ {sl}</span>;
          })()}
        </>
      ),
      contact_id:          () => (
        <select value={editItem.contact_id || ''} onChange={e => upd('contact_id', e.target.value)} disabled={!editItem.customer_id}>
          <option value="">{t('-- בחר --')}</option>
          {custContacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </select>
      ),
      deal_type:           () => {
        const opts = screenMeta.goo('deal_info', 'deal_type', DEAL_TYPES);
        return (
          <select value={editItem.deal_type || 'חדשה'} onChange={e => upd('deal_type', e.target.value)}>
            {(opts || DEAL_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        );
      },
      stage:               () => {
        const opts = screenMeta.goo('deal_info', 'stage', DEAL_STAGES);
        return (
          <select value={editItem.stage || 'תחילת תהליך'} onChange={e => upd('stage', e.target.value)}
            style={{ color: DEAL_STAGE_COLORS[editItem.stage] || 'var(--text-1)', fontWeight: 600 }}>
            {(opts || DEAL_STAGES).map(([k, l, p]) => <option key={k} value={k}>{l}{p ? ` (${p}%)` : ''}</option>)}
          </select>
        );
      },
      priority:            () => {
        const opts = screenMeta.goo('deal_info', 'priority', DEAL_PRIORITIES);
        return (
          <select value={editItem.priority || '3'} onChange={e => upd('priority', e.target.value)}>
            {(opts || DEAL_PRIORITIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        );
      },
      expected_one_time:   () => <input type="number" value={editItem.expected_one_time || ''} onChange={e => upd('expected_one_time', e.target.value)} dir="ltr" />,
      expected_recurring:  () => <input type="number" value={editItem.expected_recurring || ''} onChange={e => upd('expected_recurring', e.target.value)} dir="ltr" />,
      expected_close_date: () => <input type="date" value={editItem.expected_close_date ? editItem.expected_close_date.split('T')[0] : ''} onChange={e => upd('expected_close_date', e.target.value)} dir="ltr" />,
      actual_close_date:   () => (
        <>
          <input type="date" value={editItem.actual_close_date ? editItem.actual_close_date.split('T')[0] : ''} onChange={e => upd('actual_close_date', e.target.value)} dir="ltr"
            style={isWon ? { background: '#F0FDF4', fontWeight: 600, color: '#166534' } : {}} />
          {isWon && editItem.actual_close_date && <span style={{ fontSize: 10, color: 'var(--success)', marginTop: 2 }}>{t('הוזן אוטומטית עם סגירת העסקה')}</span>}
        </>
      ),
      notes:               () => <textarea value={editItem.notes || ''} onChange={e => upd('notes', e.target.value)} rows={3} placeholder={t('הערות, פרטים נוספים...')} />,
    };

    const renderSectionFields = (secId) =>
      screenMeta.getFieldOrder(secId).map(f => {
        if (f.id === 'owner') return <OwnerSelect key={f.id} value={editItem.owner} onChange={v => upd('owner', v)} label={f.label || t('בעלי רשומה עסקה')} />;
        if (f.isCustom) return (
          <div key={f.id} className="form-field" style={f.fieldWidth === 'full' ? { gridColumn: '1/-1' } : {}}>
            <label>{f.label}{f.required && ' *'}</label>
            {renderCustomField(f)}
          </div>
        );
        const content = baseFieldContent[f.id]?.();
        return content ? (
          <div key={f.id} className="form-field" style={f.fieldWidth === 'full' ? { gridColumn: '1/-1' } : {}}>
            <label>{f.label}{f.required && ' *'}</label>
            {content}
          </div>
        ) : null;
      });

    return (
      <div className="animate-in">
        {/* Top bar */}
        <div className="tdb-topbar" style={{ marginBottom: 16 }}>
          <div className="tdb-topbar-left">
            <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>{t('← חזרה לעסקאות')}</button>
            {editItem.customer_id && (
              <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}`)}>
                <i className="ti ti-building-store" aria-hidden="true" /> {t('לכרטיס לקוח')}
              </button>
            )}
            <span className="tdb-topbar-icon"><i className="ti ti-briefcase" aria-hidden="true" /></span>
            <div>
              <h1 className="tdb-topbar-title">
                {viewOnly ? `${t('צפייה')} — ${editItem.deal_name || ''}` : (editItem.id ? `${t('עריכת עסקה')} — ${editItem.deal_name || ''}` : t('עסקה חדשה'))}
                {viewOnly && <span style={{ marginRight: 8, fontSize: 11, background: '#F59E0B', color: '#fff', borderRadius: 20, padding: '2px 10px', fontWeight: 600, verticalAlign: 'middle' }}>{t('צפייה בלבד')}</span>}
              </h1>
              {editItem.deal_num && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>#{editItem.deal_num}</div>}
            </div>
          </div>
          <div className="tdb-topbar-right">
            {isAdmin && !viewOnly && (
              <button className="tdb-calendar-btn" onClick={() => setShowScreenDesigner(true)} title={t('עיצוב מסך — ערוך שדות, סדר וערכים')}>
                <i className="ti ti-tool" aria-hidden="true" /> {t('ערוך שדות')}
              </button>
            )}
            {editItem.id && canUseButton('btn_new_quote') && (
              <button className="tdb-calendar-btn" onClick={() => {
                const params = new URLSearchParams();
                if (editItem.customer_id) params.set('customer_id', editItem.customer_id);
                params.set('deal_id', editItem.id);
                params.set('deal_name', editItem.deal_name || '');
                navigate(`/quotes/new?${params}`);
              }}>
                <i className="ti ti-file-invoice" aria-hidden="true" /> {t('הצעת מחיר חדשה')}
              </button>
            )}
            {!viewOnly && canEdit && editItem.customer_id && (
              <button className="tdb-calendar-btn" onClick={() => navigate(`/customers/${editItem.customer_id}/relations`)}>
                <i className="ti ti-hierarchy" aria-hidden="true" /> {t('מפת קשרים')}
              </button>
            )}
            {!viewOnly && editItem.id && canDelete && canUseButton('btn_delete') && (
              <button className="tdb-calendar-btn" style={{ background: 'rgba(220,38,38,0.18)', borderColor: 'rgba(220,38,38,0.5)' }} onClick={() => setConfirmDel(editItem)}>
                <i className="ti ti-trash" aria-hidden="true" /> {t('מחק')}
              </button>
            )}
            {!viewOnly && (canEdit || (!editItem.id && canCreate)) && (
              <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) ? t('שומר...') : t('שמור')}
              </button>
            )}
          </div>
        </div>

        {/* Stage Progress Bar */}
        <div className="de-pipeline card">
          <div className="de-pipeline-bar">
            {stageOptsMain.map(([key, label, pct], idx) => {
              const isCurrent = key === editItem.stage;
              const isPast = !isLost && currentStageIdx > idx;
              const color = DEAL_STAGE_COLORS[key] || PIPELINE_COLORS[idx % PIPELINE_COLORS.length];
              return (
                <button key={key} className={`de-stage-step${isCurrent ? ' current' : ''}${isPast ? ' done' : ''}`}
                  onClick={() => upd('stage', key)}
                  style={{ '--stage-color': color }}>
                  <div className="de-stage-dot">{isPast ? <i className="ti ti-check" aria-hidden="true" /> : (pct != null ? pct + '%' : '')}</div>
                  <div className="de-stage-label">{label}</div>
                </button>
              );
            })}
          </div>
          {/* Lost button separate */}
          <button className={`de-stage-lost${isLost ? ' active' : ''}`} onClick={() => upd('stage', 'הפסד')}>
            {lossStageLabel}
          </button>
        </div>

        {/* Form body */}
        <div className="card" style={{ marginTop: 16 }}>
          <fieldset disabled={viewOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
          <h3 className="form-section-title">{screenMeta.gsl('deal_info', t('פרטי עסקה'))}</h3>
          <div className="form-grid">
            {renderSectionFields('deal_info')}
          </div>

          {isLost && (
            <div className="form-field" style={{ marginTop: 12 }}>
              <label>{t('סיבת הפסד')}</label>
              <textarea value={editItem.loss_reason || ''} onChange={e => upd('loss_reason', e.target.value)} rows={2} placeholder={t('מדוע העסקה הופסדה...')} />
            </div>
          )}

          <h3 className="form-section-title">{screenMeta.gsl('deal_amounts', t('סכומים ותאריכים'))}</h3>
          <div className="form-grid">
            {renderSectionFields('deal_amounts')}
          </div>

          <h3 className="form-section-title">{t('פתרונות מוצעים')}</h3>
          {getSolutions().length > 0 && (
            <div style={{ overflowX: 'auto', marginBottom: 8 }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead><tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 200 }}>{t('משפחת מוצר')}</th>
                  <th>{t('תיאור')}</th>
                  <th style={{ width: 70 }}>{t('כמות')}</th>
                  <th style={{ width: 50 }}></th>
                </tr></thead>
                <tbody>
                  {getSolutions().map((sol, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{idx + 1}</td>
                      <td>
                        <select value={sol.family_id || ''} onChange={e => updSolution(idx, 'family_id', e.target.value)}
                          style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, padding: '4px 0' }}>
                          <option value="">{t('-- משפחה --')}</option>
                          {families.map(f => <option key={f.id} value={f.id}>{f.num ? `${f.num} — ` : ''}{f.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input value={sol.desc || ''} onChange={e => updSolution(idx, 'desc', e.target.value)} placeholder={t('תיאור הפתרון...')}
                          style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, padding: '4px 0' }} />
                      </td>
                      <td>
                        <input type="number" value={sol.qty || ''} onChange={e => updSolution(idx, 'qty', e.target.value)} min="1" dir="ltr"
                          style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12, textAlign: 'center', padding: '4px 0' }} />
                      </td>
                      <td><button type="button" className="action-btn delete" onClick={() => removeSolution(idx)} title={t('הסר')}><i className="ti ti-x" aria-hidden="true" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button type="button" className="btn btn-secondary" onClick={addSolution} style={{ fontSize: 12 }}>{t('+ הוסף פתרון')}</button>

          <div className="form-grid" style={{ marginTop: 16 }}>
            {renderSectionFields('deal_notes')}
          </div>

          {/* Linked quotes for this deal */}
          {editItem.id && <LinkedQuotes dealId={editItem.id} onOpen={(qId) => navigate(`/quotes/${qId}/edit`)} />}
          </fieldset>
        </div>
      {showScreenDesigner && (
        <ScreenDesignerModal
          moduleId="deals"
          modMeta={screenMeta.modMeta}
          onClose={() => setShowScreenDesigner(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['screen-meta', 'deals'] })}
        />
      )}
      {customerAlert && <CustomerAlertModal alert={customerAlert} onClose={() => setCustomerAlert(null)} />}
      </div>
    );
  }

  // ── Deals List ────────────────────────────────────────────────────────
  return (
    <>
      <ModuleTopbar icon="ti-currency-shekel" title={t('עסקאות')}>
        {canCreate && (
          <button className="tdb-calendar-btn" onClick={() => { setViewOnly(false); setEditItem({ ...EMPTY_DEAL, solutions: [] }); }}>
            <i className="ti ti-plus" aria-hidden="true" /> {t('עסקה חדשה')}
          </button>
        )}
      </ModuleTopbar>
      <StatsBar stats={dealStats} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={`btn ${!stageFilter ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStageFilter('')} style={{ fontSize: 12, padding: '5px 12px' }}>
          {t('הכל')} ({deals.length})
        </button>
        {stageOpts.map(([key, label], idx) => {
          const count = deals.filter(d => d.stage === key).length;
          const color = DEAL_STAGE_COLORS[key] || PIPELINE_COLORS[idx % PIPELINE_COLORS.length];
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
        onEdit={canEdit ? row => {
          const item = { ...row };
          if (item.custom_data) {
            if (typeof item.custom_data === 'string') { try { item.custom_data = JSON.parse(item.custom_data); } catch { item.custom_data = {}; } }
            if (typeof item.custom_data === 'object') Object.assign(item, item.custom_data);
          }
          setViewOnly(false); setEditItem(item); showCustomerAlertIfNeeded(row.customer_id);
        } : undefined}
        onView={!canEdit && canView ? row => {
          const item = { ...row };
          if (item.custom_data) {
            if (typeof item.custom_data === 'string') { try { item.custom_data = JSON.parse(item.custom_data); } catch { item.custom_data = {}; } }
            if (typeof item.custom_data === 'object') Object.assign(item, item.custom_data);
          }
          setViewOnly(true); setEditItem(item); showCustomerAlertIfNeeded(row.customer_id);
        } : undefined}
        onDelete={canDelete ? row => setConfirmDel(row) : undefined}
        renderCell={renderCell}
        storageKey="biz_deals_cols_v3"
        hideHeader
        customers={customers}
        onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }}
      />

      {confirmDel && (
        <DeleteConfirmModal
          title={t('מחיקת עסקה')}
          name={confirmDel.deal_name}
          cascade={t('מחיקת העסקה תסיר אותה לצמיתות, כולל כל הצעות המחיר וההזמנות המשויכות אליה.')}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          isPending={deleteMut.isPending}
        />
      )}
      {customerAlert && <CustomerAlertModal alert={customerAlert} onClose={() => setCustomerAlert(null)} />}
    </>
  );
}

// ── Customer Alert Modal ──────────────────────────────────────────────────
function CustomerAlertModal({ alert, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, border: '2px solid #f59e0b' }}>
        <div className="modal-header" style={{ background: '#FEF3C7', borderBottom: '1px solid #F59E0B66' }}>
          <h2 style={{ color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" style={{ color: '#f59e0b' }} />
            הודעה חריגה — {alert.custName}
          </h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '20px 24px', fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {alert.message}
        </div>
        <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>הבנתי</button>
        </div>
      </div>
    </div>
  );
}

// ── Linked Quotes ─────────────────────────────────────────────────────────
function LinkedQuotes({ dealId, onOpen }) {
  const { t } = useT();
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
      <h3 className="form-section-title">{t('הצעות מחיר משויכות')} ({quotes.length})</h3>
      {quotes.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          {t('אין הצעות מחיר משויכות לעסקה זו')}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr>
              <th style={{ width: 110 }}>{t("מס' הצעה")}</th>
              <th>{t('שם הצעה')}</th>
              <th style={{ width: 90 }}>{t('שלב')}</th>
              <th style={{ width: 90 }}>{t('תאריך')}</th>
              <th style={{ width: 110 }}>{t('סה"כ חד"פ')}</th>
              <th style={{ width: 80 }}>{t('רווחיות חד"פ')}</th>
              <th style={{ width: 110 }}>{t('סה"כ שוטף')}</th>
              <th style={{ width: 80 }}>{t('רווחיות שוטף')}</th>
              <th style={{ width: 60 }}></th>
            </tr></thead>
            <tbody>
              {quotes.map(q => (
                <QuoteRow key={q.id} q={q} onOpen={onOpen} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuoteRow({ q, onOpen }) {
  const { t } = useT();
  const { data: itemsData } = useQuery({
    queryKey: ['quote-items', q.id],
    queryFn: () => api.get(`/api/quotes/${q.id}/items`),
    enabled: !!q.id,
    staleTime: 60000,
  });
  const items = itemsData?.data || [];

  const calcTotal = (it) =>
    (parseFloat(it.unit_price) || 0) * (parseFloat(it.quantity) || 0) * (1 - (parseFloat(it.discount) || 0) / 100);

  const onetimeSub = items.filter(it => it.cost_type !== 'recurring').reduce((s, it) => s + calcTotal(it), 0);
  const recurringSub = items.filter(it => it.cost_type === 'recurring').reduce((s, it) => s + calcTotal(it), 0);
  const onetimeCost = items.filter(it => it.cost_type !== 'recurring').reduce((s, it) => s + (parseFloat(it.cost) || 0) * (parseFloat(it.quantity) || 0), 0);
  const recurringCost = items.filter(it => it.cost_type === 'recurring').reduce((s, it) => s + (parseFloat(it.cost) || 0) * (parseFloat(it.quantity) || 0), 0);
  const profitPct = (rev, cost) => rev > 0 ? Math.round(((rev - cost) / rev) * 100) : null;
  const otProfit = profitPct(onetimeSub, onetimeCost);
  const recProfit = profitPct(recurringSub, recurringCost);
  const fmt = (v) => v > 0 ? `₪${Math.round(v).toLocaleString()}` : '—';
  const fmtPct = (v) => v !== null ? `${v}%` : '—';
  const profitColor = (p) => p === null ? 'var(--text-3)' : p >= 30 ? 'var(--success)' : p >= 15 ? 'var(--warning)' : 'var(--danger)';

  return (
    <tr style={{ cursor: 'pointer' }} onClick={() => onOpen(q.id)}
      onMouseOver={e => e.currentTarget.style.background = 'var(--accent-light)'}
      onMouseOut={e => e.currentTarget.style.background = ''}>
      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{q.quote_num || '—'}</td>
      <td>{q.quote_name || '—'}</td>
      <td>{q.stage || '—'}</td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{q.quote_date ? new Date(q.quote_date).toLocaleDateString('he-IL') : '—'}</td>
      <td style={{ fontWeight: 600 }}>{fmt(onetimeSub)}</td>
      <td style={{ fontWeight: 700, color: profitColor(otProfit) }}>{fmtPct(otProfit)}</td>
      <td style={{ fontWeight: 600 }}>{fmt(recurringSub)}</td>
      <td style={{ fontWeight: 700, color: profitColor(recProfit) }}>{fmtPct(recProfit)}</td>
      <td onClick={e => e.stopPropagation()}>
        <button className="action-btn edit" onClick={() => onOpen(q.id)} title={t('ערוך')}><i className="ti ti-edit" aria-hidden="true" /></button>
      </td>
    </tr>
  );
}
