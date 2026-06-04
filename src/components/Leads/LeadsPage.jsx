import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, useConvertLead } from '../../hooks/useLeads';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useFamilies } from '../../hooks/useProducts';
import { useUsers, useUserName } from '../../hooks/useUsers';
import { api, apiFetch } from '../../api/client';
import { LEADS_COLUMNS, EMPTY_LEAD, LEAD_SOURCES, LEAD_PRIORITIES } from '../../utils/constants';
import { useLookups } from '../../hooks/useLookups';
import useAuthStore from '../../store/authStore';
import DataTable from '../Layout/DataTable';
import ModuleTopbar from '../Layout/ModuleTopbar';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import { usePerms } from '../../hooks/usePerms';
import DeleteConfirmModal from '../Layout/DeleteConfirmModal';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

const ALLOWED_ACCEPT = '.doc,.docx,.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.ppt,.pptx,.mp3,.wav,.m4a,.aac,.ogg';
const ALLOWED_LABEL = 'Word, PDF, Excel, JPG/PNG, PPT, קובצי שמע (MP3/WAV/M4A)';

function getFileExt(name) { return (name || '').split('.').pop().toLowerCase(); }
function isImage(name) { return ['jpg','jpeg','png'].includes(getFileExt(name)); }
function isPdf(name)   { return getFileExt(name) === 'pdf'; }
function isAudio(name) { return ['mp3','wav','m4a','aac','ogg'].includes(getFileExt(name)); }

/* ── File viewer modal ────────────────────────────────────────────────────── */
function FileViewModal({ file, onClose }) {
  const ext = getFileExt(file.name);
  useEffect(() => () => URL.revokeObjectURL(file.url), [file.url]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-box"
        style={{ maxWidth: isImage(file.name) ? '90vw' : 860, width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{file.name}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href={file.url} download={file.name} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-download" /> הורד
            </a>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isImage(file.name) && <img src={file.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 6 }} />}
          {isPdf(file.name) && <iframe src={file.url} title={file.name} style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 6 }} />}
          {isAudio(file.name) && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <i className="ti ti-music" style={{ fontSize: 48, color: 'var(--accent)', marginBottom: 16, display: 'block' }} />
              <audio controls src={file.url} style={{ width: '100%', minWidth: 300 }} />
            </div>
          )}
          {!isImage(file.name) && !isPdf(file.name) && !isAudio(file.name) && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="ti ti-file" style={{ fontSize: 48, color: 'var(--text-3)', marginBottom: 16, display: 'block' }} />
              <p style={{ color: 'var(--text-2)', marginBottom: 20 }}>לא ניתן להציג קובץ זה בדפדפן</p>
              <a href={file.url} download={file.name} style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
                <i className="ti ti-download" style={{ marginLeft: 6 }} /> הורד קובץ
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const mkEmptySolution = () => ({
  id: 'sl' + Date.now() + Math.random().toString(36).slice(2),
  family_id: '',
  family_name: '',
  product: '',
  qty: 1,
  notes: '',
});

const PRIORITY_COLORS = { '1': '#94A3B8', '2': '#60A5FA', '3': '#F59E0B', '4': '#F97316', '5': '#EF4444' };

const FILE_BTN = {
  flexShrink: 0,
  fontSize: 13, padding: '6px 16px', borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-1)',
  cursor: 'pointer',
  fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
};

/* ── Searchable family dropdown — uses portal to avoid overflow clipping ─────── */
function FamilyCell({ value, families, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dropStyle, setDropStyle] = useState({});
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return families.slice(0, 50);
    const lq = q.toLowerCase();
    return families.filter(f =>
      (f.name || '').toLowerCase().includes(lq) || (f.num || '').toLowerCase().includes(lq)
    ).slice(0, 50);
  }, [q, families]);

  const getFamLabel = (f) => f ? (f.num ? `${f.num} — ${f.name}` : f.name) : '';
  const selectedFam = families.find(f => f.id === value);

  const handleFocus = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const dropH = 240;
      const margin = 8;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const style = {
        position: 'fixed',
        left: rect.left,
        width: Math.max(rect.width, 280),
        zIndex: 9999,
      };
      if (spaceBelow >= dropH) {
        style.top = rect.bottom + 2;
        style.maxHeight = dropH;
      } else if (spaceAbove > spaceBelow) {
        style.bottom = window.innerHeight - rect.top + 2;
        style.maxHeight = Math.min(dropH, spaceAbove);
      } else {
        style.top = rect.bottom + 2;
        style.maxHeight = Math.max(spaceBelow, 80);
      }
      setDropStyle(style);
    }
    setOpen(true);
    setQ('');
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!inputRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (disabled) return <span style={{ fontSize: 13 }}>{getFamLabel(selectedFam) || '—'}</span>;

  const dropdown = open ? createPortal(
    <div style={{
      ...dropStyle,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      overflowY: 'auto',
    }}>
      {value && (
        <div onMouseDown={e => { e.preventDefault(); onChange('', ''); setOpen(false); setQ(''); }}
          style={{ padding: '7px 12px', fontSize: 12, color: '#EF4444', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
          × נקה בחירה
        </div>
      )}
      {filtered.length === 0 && <div style={{ padding: '10px 12px', color: 'var(--text-3)', fontSize: 12 }}>לא נמצאו תוצאות</div>}
      {filtered.map(f => (
        <div key={f.id}
          onMouseDown={e => { e.preventDefault(); onChange(f.id, f.name); setOpen(false); setQ(''); }}
          style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, background: f.id === value ? 'var(--accent-light)' : '' }}
          onMouseOver={e => { if (f.id !== value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseOut={e => { e.currentTarget.style.background = f.id === value ? 'var(--accent-light)' : ''; }}>
          {getFamLabel(f)}
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <input
        ref={inputRef}
        value={open ? q : (getFamLabel(selectedFam) || '')}
        onChange={e => setQ(e.target.value)}
        onFocus={handleFocus}
        placeholder="חפש משפחה..."
        style={{ width: '100%', fontSize: 13 }}
        autoComplete="off"
      />
      {dropdown}
    </>
  );
}

/* ── Convert modal ──────────────────────────────────────────────────────────── */
function ConvertModal({ lead, customers, onClose, onConvert, isPending }) {
  const hasExistingCustomer = !!lead.customer_id;
  const hasExistingContact = !!lead.contact_id;

  const [convertCustomer, setConvertCustomer] = useState(!hasExistingCustomer);
  const [convertContact, setConvertContact] = useState(!hasExistingContact);
  const [convertDeal, setConvertDeal] = useState(true);
  const [existingCustomerId, setExistingCustomerId] = useState(lead.customer_id || '');

  const effectiveCustomerId = convertCustomer ? null : (existingCustomerId || lead.customer_id);
  const canSubmit = convertCustomer || !!effectiveCustomerId;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>המרת ליד לעסקה</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>
            בחר אילו רשומות ליצור מהליד <strong>{lead.lead_num}</strong> — {lead.first_name} {lead.last_name}
          </p>

          {/* Customer */}
          <div style={{ padding: '12px 14px', background: 'var(--bg-page)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: hasExistingCustomer ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={convertCustomer} disabled={hasExistingCustomer} onChange={e => setConvertCustomer(e.target.checked)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  יצירת לקוח פוטנציאלי חדש
                  {hasExistingCustomer && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400, marginRight: 6 }}>(לא זמין — ללקוח קיים)</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>ייווצר לקוח חדש עם סטטוס "פוטנציאל"</div>
              </div>
            </label>
            {!convertCustomer && (
              <div className="form-field" style={{ marginTop: 10, marginBottom: 0 }}>
                <label>קשר לליד לקוח קיים</label>
                <select value={existingCustomerId} onChange={e => setExistingCustomerId(e.target.value)} disabled={hasExistingCustomer}>
                  <option value="">-- בחר לקוח --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Contact */}
          <div style={{ padding: '12px 14px', background: 'var(--bg-page)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: hasExistingContact ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={convertContact} disabled={hasExistingContact} onChange={e => setConvertContact(e.target.checked)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  יצירת איש קשר חדש
                  {hasExistingContact && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400, marginRight: 6 }}>(לא זמין — לאיש קשר קיים)</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>ייווצר איש קשר המקושר ללקוח</div>
              </div>
            </label>
          </div>

          {/* Deal */}
          <div style={{ padding: '12px 14px', background: 'var(--bg-page)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={convertDeal} onChange={e => setConvertDeal(e.target.checked)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>יצירת עסקה</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>תיפתח עסקה חדשה עם הפתרונות מהליד</div>
              </div>
            </label>
          </div>
        </div>
        <div style={{ padding: '12px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)' }}>
          <button className="tdb-calendar-btn" onClick={onClose}>ביטול</button>
          <button
            className="tdb-calendar-btn"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }}
            onClick={() => onConvert({
              convertCustomer,
              convertContact,
              convertDeal,
              existingCustomerId: convertCustomer ? null : (existingCustomerId || lead.customer_id || null),
              existingContactId: convertContact ? null : (lead.contact_id || null),
            })}
            disabled={isPending || !canSubmit}
          >
            {isPending ? 'ממיר...' : 'המר ליד'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function LeadsPage() {
  const { canView, canCreate, canEdit, canDelete, canUseButton } = usePerms('leads');
  const currentUser = useAuthStore(s => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showConvert, setShowConvert] = useState(false);

  // File upload
  const fileInputRef = useRef(null);
  const pendingFileRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [loadingView, setLoadingView] = useState(false);

  const { leadStatuses, clientTypes } = useLookups();
  const { data, isLoading, error } = useLeads({ page, limit: 50, search, status: statusFilter, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const { data: contactsData } = useContacts({ customerId: editItem?.customer_id || '', limit: 500 });
  const { data: allContactsData } = useContacts({ limit: 1000 });
  const { data: famData } = useFamilies();
  const { data: usersData } = useUsers();
  const createMut = useCreateLead();
  const updateMut = useUpdateLead();
  const deleteMut = useDeleteLead();
  const convertMut = useConvertLead();

  const leads = data?.data || [];
  const customers = custData?.data || [];
  const contacts = contactsData?.data || [];
  const allContacts = allContactsData?.data || [];
  const families = famData?.data || [];
  const users = usersData?.data || [];

  const getStatusLabel = (val) => leadStatuses?.find(([v]) => v === val)?.[1] || val || '—';
  const getSourceLabel = (val) => LEAD_SOURCES.find(([v]) => v === val)?.[1] || val || '—';
  const getPriorityLabel = (val) => LEAD_PRIORITIES.find(([v]) => v === val)?.[1] || val || '—';
  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '';

  useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const isNew = searchParams.get('new');
    if (editId) {
      setSearchParams({}, { replace: true });
      api.get(`/api/leads/${editId}`).then(item => { if (item) { setViewOnly(false); setEditItem(item); } });
    } else if (viewId) {
      setSearchParams({}, { replace: true });
      api.get(`/api/leads/${viewId}`).then(item => { if (item) { setViewOnly(true); setEditItem(item); } });
    } else if (isNew) {
      setSearchParams({}, { replace: true });
      setViewOnly(false);
      setEditItem({ ...EMPTY_LEAD, owner_id: currentUser?.id || '' });
    }
  }, [searchParams]); // eslint-disable-line

  const getContactName = (id) => {
    if (!id) return '—';
    const c = allContacts.find(c => c.id === id);
    return c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—' : '—';
  };

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id) || '—';
      case 'contact_id': return getContactName(row.contact_id);
      case 'owner_id': return useUserName(users, row.owner_id);
      case 'status': {
        const label = getStatusLabel(row.status);
        const isConverted = row.status === 'converted';
        const isLost = row.status === 'lost';
        const bg = isConverted ? '#D1FAE5' : isLost ? '#FEE2E2' : 'var(--bg-card)';
        const color = isConverted ? '#065F46' : isLost ? '#991B1B' : 'var(--text-2)';
        return <span style={{ fontSize: 12, background: bg, color, border: '1px solid var(--border)', borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>{label}</span>;
      }
      case 'priority': {
        const c = PRIORITY_COLORS[row.priority] || '#94A3B8';
        return <span style={{ fontSize: 12, background: c + '22', color: c, border: `1px solid ${c}55`, borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>{getPriorityLabel(row.priority)}</span>;
      }
      case 'lead_source': return getSourceLabel(row.lead_source);
      case 'converted': return row.converted ? <span className="badge badge-success">כן</span> : <span className="badge badge-danger">לא</span>;
      case 'created_at': return row.created_at ? new Date(row.created_at).toLocaleDateString('he-IL') : '—';
      default: return row[key] || '—';
    }
  };

  const handleSave = async () => {
    if (!editItem.customer_id && !editItem.first_name?.trim() && !editItem.company_name?.trim()) {
      alert('יש למלא שם פרטי או שם חברה, או לבחור לקוח קיים');
      return;
    }
    if (editItem.id) {
      await updateMut.mutateAsync({ id: editItem.id, ...editItem });
      setEditItem(null);
    } else {
      const created = await createMut.mutateAsync(editItem);
      if (pendingFile) {
        try {
          setUploadingFile(true);
          await api.upload(`/api/leads/${created.id}/upload?filename=${encodeURIComponent(pendingFile.name)}`, pendingFile);
          const refreshed = await api.get(`/api/leads/${created.id}`);
          setEditItem(refreshed);
        } catch {
          alert('הליד נשמר אך הייתה שגיאה בהעלאת הקובץ');
          setEditItem(created);
        } finally {
          setPendingFile(null);
          setUploadingFile(false);
        }
      } else {
        setEditItem(created);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteMut.mutateAsync(confirmDel.id);
    if (editItem?.id === confirmDel.id) setEditItem(null);
    setConfirmDel(null);
  };

  const handleConvert = async (opts) => {
    try {
      await convertMut.mutateAsync({ id: editItem.id, ...opts });
      setShowConvert(false);
      const refreshed = await api.get(`/api/leads/${editItem.id}`);
      if (refreshed) setEditItem(refreshed);
    } catch (err) {
      alert(`שגיאה בהמרת ליד: ${err.message || 'שגיאה לא ידועה'}`);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editItem?.id) return;
    setUploadingFile(true);
    try {
      await api.upload(`/api/leads/${editItem.id}/upload?filename=${encodeURIComponent(file.name)}`, file);
      const refreshed = await api.get(`/api/leads/${editItem.id}`);
      if (refreshed) setEditItem(refreshed);
    } catch {
      alert('שגיאה בהעלאת קובץ');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileView = async () => {
    if (!editItem?.id || !editItem?.file_name) return;
    setLoadingView(true);
    try {
      const res = await apiFetch(`/api/leads/${editItem.id}/download?view=1`);
      if (!res.ok) { alert('שגיאה בטעינת קובץ'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setViewFile({ url, name: editItem.file_name });
    } catch (err) {
      alert('שגיאה בטעינת קובץ: ' + (err.message || ''));
    } finally {
      setLoadingView(false);
    }
  };

  const upd = (k, v) => setEditItem(p => ({ ...p, [k]: v }));
  const addSolution = () => upd('solutions', [...(editItem.solutions || []), mkEmptySolution()]);
  const updSolution = (id, field, val) => upd('solutions', (editItem.solutions || []).map(s => s.id === id ? { ...s, [field]: val } : s));
  const updSolutionFamily = (id, fid, fname) => upd('solutions', (editItem.solutions || []).map(s => s.id === id ? { ...s, family_id: fid, family_name: fname } : s));
  const removeSolution = (id) => upd('solutions', (editItem.solutions || []).filter(s => s.id !== id));

  const handleCustomerChange = (custId) => {
    const cust = customers.find(c => c.id === custId);
    setEditItem(p => ({
      ...p,
      customer_id: custId,
      contact_id: '',
      ...(cust?.client_type ? { client_type: cust.client_type } : {}),
    }));
  };

  const leadStats = useMemo(() => [
    { label: 'סה"כ לידים', value: data?.total || leads.length, color: 'var(--info)' },
    { label: 'לידים חדשים', value: leads.filter(l => l.status === 'new').length, color: 'var(--accent)' },
    { label: 'הומרו', value: leads.filter(l => l.converted).length, color: 'var(--success)' },
  ], [leads, data?.total]);

  /* ── Edit / Create form ──────────────────────────────────────────────────── */
  if (editItem) return (
    <div className="animate-in">
      <div className="tdb-topbar" style={{ marginBottom: 16 }}>
        <div className="tdb-topbar-left">
          <button className="tdb-calendar-btn" onClick={() => { setEditItem(null); setPendingFile(null); }}>← חזרה ללידים</button>
          <span className="tdb-topbar-icon"><i className="ti ti-target" aria-hidden="true" /></span>
          <h1 className="tdb-topbar-title">
            {viewOnly ? `צפייה — ${editItem.first_name || ''} ${editItem.last_name || ''}` : editItem.id ? `עריכת ליד — ${editItem.lead_num || ''}` : 'ליד חדש'}
          </h1>
          {viewOnly && <span style={{ fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B66', borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>צפייה בלבד</span>}
          {editItem.converted && <span style={{ fontSize: 11, background: '#D1FAE5', color: '#065F46', border: '1px solid #10B98166', borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>הומר</span>}
        </div>
        <div className="tdb-topbar-right">
          {!viewOnly && editItem.id && !editItem.converted && canEdit && (
            <button className="tdb-calendar-btn" style={{ background: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.5)', color: '#9D174D', fontWeight: 600 }} onClick={() => setShowConvert(true)}>
              <i className="ti ti-arrows-exchange" aria-hidden="true" /> המר ליד
            </button>
          )}
          {!viewOnly && editItem.id && canDelete && canUseButton('btn_delete') && (
            <button className="tdb-calendar-btn" style={{ background: 'rgba(220,38,38,0.18)', borderColor: 'rgba(220,38,38,0.5)' }} onClick={() => setConfirmDel(editItem)}>
              <i className="ti ti-trash" aria-hidden="true" /> מחק
            </button>
          )}
          {!viewOnly && canUseButton('btn_save') && (
            <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending || uploadingFile}>
              {(createMut.isPending || updateMut.isPending || uploadingFile) ? 'שומר...' : 'שמור'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <fieldset disabled={viewOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
          <h3 className="form-section-title">פרטי ליד</h3>
          <div className="form-grid">
            <div className="form-field"><label>שם פרטי</label><input value={editItem.first_name || ''} onChange={e => upd('first_name', e.target.value)} autoFocus /></div>
            <div className="form-field"><label>שם משפחה</label><input value={editItem.last_name || ''} onChange={e => upd('last_name', e.target.value)} /></div>
            <div className="form-field"><label>תפקיד</label><input value={editItem.role || ''} onChange={e => upd('role', e.target.value)} /></div>
            <div className="form-field"><label>שם חברה</label><input value={editItem.company_name || ''} onChange={e => upd('company_name', e.target.value)} /></div>
            <div className="form-field"><label>לקוח קיים (קישור)</label>
              <select value={editItem.customer_id || ''} onChange={e => handleCustomerChange(e.target.value)}>
                <option value="">-- בחר לקוח קיים --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="form-field"><label>איש קשר קיים</label>
              <select value={editItem.contact_id || ''} onChange={e => upd('contact_id', e.target.value)} disabled={!editItem.customer_id}>
                <option value="">-- בחר איש קשר --</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ')}{c.role ? ` (${c.role})` : ''}</option>)}
              </select>
            </div>
            <div className="form-field"><label>סוג לקוח</label>
              <select value={editItem.client_type || ''} onChange={e => upd('client_type', e.target.value)}>
                <option value="">-- בחר סוג לקוח --</option>
                {(clientTypes || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-field"><label>טלפון נייד</label><input value={editItem.mobile || ''} onChange={e => upd('mobile', e.target.value)} dir="ltr" /></div>
            <div className="form-field"><label>טלפון</label><input value={editItem.phone || ''} onChange={e => upd('phone', e.target.value)} dir="ltr" /></div>
            <div className="form-field"><label>אי-מייל</label><input value={editItem.email || ''} onChange={e => upd('email', e.target.value)} dir="ltr" type="email" /></div>
            <div className="form-field"><label>סטטוס ליד</label>
              <select value={editItem.status || 'new'} onChange={e => upd('status', e.target.value)}>
                {(leadStatuses || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-field"><label>מקור הליד</label>
              <select value={editItem.lead_source || ''} onChange={e => upd('lead_source', e.target.value)}>
                <option value="">-- בחר מקור --</option>
                {LEAD_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-field"><label>עדיפות</label>
              <select value={editItem.priority || '3'} onChange={e => upd('priority', e.target.value)}>
                {LEAD_PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <OwnerSelect value={editItem.owner_id} onChange={v => upd('owner_id', v)} label="בעלי הליד" />
          </div>

          <h3 className="form-section-title">כתובת</h3>
          <div className="form-grid">
            <div className="form-field"><label>עיר</label><input value={editItem.city || ''} onChange={e => upd('city', e.target.value)} /></div>
            <div className="form-field"><label>כתובת</label><input value={editItem.address || ''} onChange={e => upd('address', e.target.value)} /></div>
          </div>

          <h3 className="form-section-title">תיאור</h3>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <textarea value={editItem.description || ''} onChange={e => upd('description', e.target.value)} rows={4} style={{ width: '100%', resize: 'vertical' }} />
          </div>

          <h3 className="form-section-title" style={{ marginTop: 20 }}>
            פתרונות מוצעים
            {!viewOnly && (
              <button type="button" onClick={addSolution} style={{ marginRight: 12, fontSize: 12, padding: '2px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 600 }}>
                + הוסף שורה
              </button>
            )}
          </h3>
          {(editItem.solutions || []).length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'right' }}>
                    <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-2)', minWidth: 200 }}>משפחת מוצר</th>
                    <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-2)' }}>מוצר / שירות</th>
                    <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-2)', width: 80 }}>כמות</th>
                    <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-2)' }}>הערות</th>
                    {!viewOnly && <th style={{ width: 36 }} />}
                  </tr>
                </thead>
                <tbody>
                  {(editItem.solutions || []).map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '4px 6px' }}>
                        <FamilyCell value={s.family_id} families={families} disabled={viewOnly} onChange={(fid, fname) => updSolutionFamily(s.id, fid, fname)} />
                      </td>
                      <td style={{ padding: '4px 6px' }}><input value={s.product || ''} onChange={e => updSolution(s.id, 'product', e.target.value)} style={{ width: '100%' }} /></td>
                      <td style={{ padding: '4px 6px' }}><input type="number" value={s.qty || 1} onChange={e => updSolution(s.id, 'qty', e.target.value)} style={{ width: '100%' }} min={1} /></td>
                      <td style={{ padding: '4px 6px' }}><input value={s.notes || ''} onChange={e => updSolution(s.id, 'notes', e.target.value)} style={{ width: '100%' }} /></td>
                      {!viewOnly && (
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeSolution(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16 }}>×</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── File attachment ─────────────────────────────────────────────── */}
          <h3 className="form-section-title" style={{ marginTop: 20 }}>קובץ מצורף</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--bg-page)' }}>
            <i className="ti ti-file" style={{ fontSize: 22, color: 'var(--text-3)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {editItem.id && editItem.file_name ? (
                <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-file" style={{ color: 'var(--accent)' }} /> {editItem.file_name}
                </span>
              ) : pendingFile ? (
                <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>
                  <i className="ti ti-paperclip" style={{ marginLeft: 4 }} />{pendingFile.name}
                </span>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>אין קובץ מצורף</span>
              )}
            </div>
            {!viewOnly && (
              <>
                {/* Hidden inputs — restricted to allowed file types */}
                <input ref={pendingFileRef} type="file" accept={ALLOWED_ACCEPT} style={{ display: 'none' }}
                  onChange={e => { setPendingFile(e.target.files?.[0] || null); if (pendingFileRef.current) pendingFileRef.current.value = ''; }} />
                <input ref={fileInputRef} type="file" accept={ALLOWED_ACCEPT} style={{ display: 'none' }} onChange={handleFileUpload} />

                {/* New lead: choose file (uploaded on save) */}
                {!editItem.id && (
                  <>
                    <button type="button" style={{ ...FILE_BTN, opacity: uploadingFile ? 0.6 : 1 }}
                      onClick={() => pendingFileRef.current?.click()} disabled={uploadingFile}>
                      <i className="ti ti-paperclip" aria-hidden="true" />
                      {pendingFile ? 'החלף קובץ' : 'בחר קובץ'}
                    </button>
                    {pendingFile && (
                      <button type="button" onClick={() => setPendingFile(null)}
                        style={{ ...FILE_BTN, color: '#EF4444', borderColor: '#EF444444', padding: '6px 10px' }}>
                        ×
                      </button>
                    )}
                  </>
                )}

                {/* Existing lead: view + upload */}
                {editItem.id && (
                  <>
                    {editItem.file_name && (
                      <button type="button" style={{ ...FILE_BTN, opacity: loadingView ? 0.6 : 1 }}
                        onClick={handleFileView} disabled={loadingView}>
                        <i className="ti ti-eye" aria-hidden="true" />
                        {loadingView ? 'טוען...' : 'הצג קובץ'}
                      </button>
                    )}
                    <button type="button" style={{ ...FILE_BTN, opacity: uploadingFile ? 0.6 : 1 }}
                      onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
                      <i className="ti ti-upload" aria-hidden="true" />
                      {uploadingFile ? 'מעלה...' : editItem.file_name ? 'החלף קובץ' : 'העלה קובץ'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          {/* Allowed types hint */}
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 0' }}>
            סוגי קבצים מותרים: {ALLOWED_LABEL}
          </p>

          {editItem.converted && (
            <div style={{ marginTop: 20, padding: '12px 16px', background: '#D1FAE5', borderRadius: 10, border: '1px solid #10B98166' }}>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: 6 }}>ליד זה הומר</div>
              {editItem.converted_at && <div style={{ fontSize: 12, color: '#047857' }}>תאריך המרה: {new Date(editItem.converted_at).toLocaleDateString('he-IL')}</div>}
              {editItem.customer_created_id
                ? <div style={{ fontSize: 12, color: '#047857' }}>לקוח נוצר: {getCustName(editItem.customer_created_id)}</div>
                : editItem.customer_id
                  ? <div style={{ fontSize: 12, color: '#047857' }}>לקוח קיים: {getCustName(editItem.customer_id)}</div>
                  : null
              }
              {editItem.deal_id && <div style={{ fontSize: 12, color: '#047857' }}>עסקה נוצרה</div>}
            </div>
          )}
        </fieldset>
      </div>

      {showConvert && (
        <ConvertModal lead={editItem} customers={customers} onClose={() => setShowConvert(false)} onConvert={handleConvert} isPending={convertMut.isPending} />
      )}
      {confirmDel && (
        <DeleteConfirmModal
          title="מחיקת ליד"
          name={`${confirmDel.first_name || ''} ${confirmDel.last_name || ''} ${confirmDel.company_name ? `(${confirmDel.company_name})` : ''}`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          isPending={deleteMut.isPending}
        />
      )}
      {viewFile && <FileViewModal file={viewFile} onClose={() => setViewFile(null)} />}
    </div>
  );

  /* ── List view ───────────────────────────────────────────────────────────── */
  return (
    <>
      <ModuleTopbar icon="ti-target" title="לידים">
        {canCreate && canUseButton('btn_new') && (
          <button
            className="tdb-calendar-btn"
            style={{ background: 'rgba(255,255,255,.25)', borderColor: 'rgba(255,255,255,.5)', fontWeight: 700 }}
            onClick={() => { setPendingFile(null); setEditItem({ ...EMPTY_LEAD, owner_id: currentUser?.id || '' }); }}
          >
            <i className="ti ti-plus" aria-hidden="true" /> ליד חדש
          </button>
        )}
      </ModuleTopbar>

      <StatsBar stats={leadStats} />

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={`btn ${!statusFilter ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setStatusFilter(''); setPage(1); }}
          style={{ fontSize: 12, padding: '5px 12px' }}
        >
          הכל ({data?.total || leads.length})
        </button>
        {(leadStatuses || []).map(([v, l]) => {
          const count = leads.filter(ld => ld.status === v).length;
          return (
            <button
              key={v}
              className={`btn ${statusFilter === v ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setStatusFilter(statusFilter === v ? '' : v); setPage(1); }}
              style={{ fontSize: 12, padding: '5px 12px' }}
            >
              {l} ({count})
            </button>
          );
        })}
      </div>

      <DataTable
        columns={LEADS_COLUMNS}
        data={leads}
        total={data?.total || 0}
        page={page}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        error={error}
        onSearchChange={s => { setSearch(s); setPage(1); }}
        onPageChange={setPage}
        onEdit={canEdit ? row => { setViewOnly(false); setEditItem({ ...row }); } : undefined}
        onView={!canEdit && canView ? row => { setViewOnly(true); setEditItem({ ...row }); } : undefined}
        onDelete={canDelete ? row => setConfirmDel(row) : undefined}
        renderCell={renderCell}
        storageKey="biz_leads_cols_v1"
        hideHeader
        customers={customers}
        onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }}
      />
      {confirmDel && !editItem && (
        <DeleteConfirmModal
          title="מחיקת ליד"
          name={`${confirmDel.first_name || ''} ${confirmDel.last_name || ''}`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          isPending={deleteMut.isPending}
        />
      )}
    </>
  );
}
