import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks, useCreateTask, useUpdateTask, useActivityTemplates, useSaveTaskActivities } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useSites } from '../../hooks/useSites';
import { api } from '../../api/client';
import './TasksCalendar.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const START_HOUR  = 6;
const END_HOUR    = 22;
const HOUR_H      = 64;   // px per hour
const GUTTER_W    = 56;   // px for time label column

const DAY_NAMES   = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const _today = new Date();
const TODAY_STR = `${_today.getFullYear()}-${String(_today.getMonth()+1).padStart(2,'0')}-${String(_today.getDate()).padStart(2,'0')}`;

const STATUS_CFG = {
  new:         { label: 'חדשה',    color: '#FFB900', bg: '#FFF8E1', text: '#7A5700',  border: '#F59E0B' },
  in_progress: { label: 'בביצוע', color: '#00BCD4', bg: '#E0F7FA', text: '#006064',  border: '#00BCD4' },
  on_hold:     { label: 'בהמתנה', color: '#94A3B8', bg: '#F1F5F9', text: '#475569',  border: '#94A3B8' },
  completed:   { label: 'הושלמה', color: '#00C875', bg: '#E8F8F0', text: '#0A6B3C',  border: '#00C875' },
  cancelled:   { label: 'בוטלה',  color: '#EF4444', bg: '#FEE2E2', text: '#991B1B',  border: '#EF4444' },
  late:        { label: 'באיחור', color: '#E2445C', bg: '#FDEDF0', text: '#9B1B30',  border: '#E2445C' },
};

const AVATAR_COLORS = ['#1A91D9','#0A5E9A','#0097A7','#9333EA','#EC4899','#F59E0B','#10B981','#EF4444','#6366F1','#14B8A6'];
const avatarColor = id =>
  AVATAR_COLORS[Math.abs((id+'').split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

// ── Date helpers ──────────────────────────────────────────────────────────────
// Use local date parts (not toISOString/UTC) to avoid timezone-shift of ±1 day
const fmt = d => {
  if (d instanceof Date) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
  return String(d).slice(0, 10);
};

function getWeekDays(date) {
  const d = new Date(date);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start); x.setDate(start.getDate() + i); return x;
  });
}

function getMonthCells(date) {
  const y = date.getFullYear(), m = date.getMonth();
  const firstDay = new Date(y, m, 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => new Date(y, m, 1 - offset + i));
}

function getRange(view, date) {
  if (view === 'day')  return { from: fmt(date), to: fmt(date) };
  if (view === 'week') { const d = getWeekDays(date); return { from: fmt(d[0]), to: fmt(d[6]) }; }
  const y = date.getFullYear(), m = date.getMonth();
  return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
}

const parseTime = t => {
  if (!t) return null;
  const [h, mm] = String(t).split(':').map(Number);
  return { h, m: mm || 0 };
};

const userLabel = u => `${u.first_name||''} ${u.last_name||''}`.trim() || u.username || '—';
const userInit  = u => (((u.first_name||'')[0]||'') + ((u.last_name||'')[0]||'')).toUpperCase() || (u.username||'?')[0].toUpperCase();
const taskStatus = t => {
  if (t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && String(t.due_date).slice(0,10) < TODAY_STR)
    return 'late';
  return t.status || 'new';
};

// ── Drag helpers ──────────────────────────────────────────────────────────────
const DRAG_KEY = 'application/tcal-task';

function setDragData(e, task) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData(DRAG_KEY, JSON.stringify({
    id:        task.id,
    origDate:  String(task.due_date || '').slice(0, 10),
    origTime:  task.start_time ? String(task.start_time).slice(0, 5) : '',
  }));
  // offset within the event block (in minutes) so drop feels natural
  const rect = e.currentTarget.getBoundingClientRect();
  const offsetMin = Math.round((e.clientY - rect.top) / (HOUR_H / 60));
  e.dataTransfer.setData('application/tcal-offset', String(offsetMin));
}

function getDragData(e) {
  try { return JSON.parse(e.dataTransfer.getData(DRAG_KEY)); }
  catch { return null; }
}

// Snap minutes to nearest 15
function snapMin(rawMin) { return Math.round(rawMin / 15) * 15 % 60; }

// ── Task Event Block ───────────────────────────────────────────────────────────
function TaskEvent({ task, onClick, style = {}, compact = false, onDragStart, onDragEnd }) {
  const [dragging, setDragging] = useState(false);
  const st = STATUS_CFG[taskStatus(task)] || STATUS_CFG.new;

  const handleDragStart = e => {
    setDragging(true);
    setDragData(e, task);
    if (onDragStart) onDragStart(task.id);
  };
  const handleDragEnd = e => {
    setDragging(false);
    if (onDragEnd) onDragEnd();
  };

  return (
    <div
      className={`tcal-event${compact ? ' tcal-event--chip' : ''}${dragging ? ' tcal-event--dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ background: st.bg, borderRight: `3px solid ${st.border}`, color: st.text, ...style }}
      onClick={e => { e.stopPropagation(); onClick(task); }}
      title={`${task.subject} · ${st.label}${task.start_time ? ' · ' + String(task.start_time).slice(0,5) : ''} — גרור לשינוי מועד`}
    >
      <span className="tcal-event-dot"   style={{ background: st.color }} />
      <span className="tcal-event-title">{task.subject || task.task_num}</span>
      {!compact && task.start_time && (
        <span className="tcal-event-time">{String(task.start_time).slice(0,5)}</span>
      )}
      {!compact && <span className="tcal-drag-handle" title="גרור לשינוי מועד">⠿</span>}
    </div>
  );
}

// ── Full Create Modal ─────────────────────────────────────────────────────────
const inpSt = { flex: 1, padding: '6px 10px', borderRadius: 6, border: '1.5px solid #C5E3F7', fontSize: 12, fontFamily: 'Rubik,sans-serif', outline: 'none', boxSizing: 'border-box' };
const taSt  = { padding: '7px 10px', border: '1.5px solid #C5E3F7', borderRadius: 8, fontSize: 13, fontFamily: 'Rubik,sans-serif', resize: 'vertical', width: '100%', boxSizing: 'border-box' };

function NewTaskModal({ slot, users, onClose, onSave }) {
  const [subject,        setSubject]        = useState('');
  const [description,    setDescription]    = useState('');
  const [notes,          setNotes]          = useState('');
  const [customerId,     setCustomerId]     = useState('');
  const [assigneeIds,    setAssigneeIds]    = useState(slot.empId ? [slot.empId] : []);
  const [contactIds,     setContactIds]     = useState([]);
  const [date,           setDate]           = useState(slot.date || TODAY_STR);
  const [time,           setTime]           = useState(
    slot.hour != null
      ? `${String(slot.hour).padStart(2,'0')}:${String(slot.min||0).padStart(2,'0')}`
      : ''
  );
  const [status,         setStatus]         = useState('new');
  const [siteId,         setSiteId]         = useState('');
  const [address,        setAddress]        = useState('');
  const [activities,     setActivities]     = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneePend,   setAssigneePend]   = useState([]);
  const [contactSearch,  setContactSearch]  = useState('');
  const [contactPend,    setContactPend]    = useState([]);
  const [allForms,       setAllForms]       = useState([]);
  const [selectedFormIds,setSelectedFormIds]= useState([]);
  const [formSearch,     setFormSearch]     = useState('');
  const [busy,           setBusy]           = useState(false);

  const { data: custData }      = useCustomers({ limit: 500 });
  const { data: contactsData }  = useContacts({ customerId: customerId || undefined, limit: 500 });
  const { data: sitesData }     = useSites({ customerId: customerId || undefined, limit: 500 });
  const { data: templatesData } = useActivityTemplates();
  const saveActsMut             = useSaveTaskActivities();

  const customers = custData?.data     || [];
  const contacts  = contactsData?.data || [];
  const sites     = sitesData?.data    || [];
  const templates = templatesData?.data || [];

  useEffect(() => {
    api.get('/api/forms-list').then(r => setAllForms(r.data || [])).catch(() => {});
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const uName    = uid => { const u = users.find(x => x.id === uid); return u ? `${u.first_name||''} ${u.last_name||''}`.trim() || u.username || '' : ''; };
  const cLabel   = c   => `${c.first_name||''} ${c.last_name||''}`.trim();
  const siteObj  = sid => sites.find(s => s.id === sid);
  const siteName = sid => siteObj(sid)?.site_name || '';

  const toggleAssignee = id => setAssigneeIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleContact  = id => setContactIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleForm     = id => setSelectedFormIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // ── Activities ──────────────────────────────────────────────────────────
  const addActivity = () => setActivities(p => [...p, {
    id: 'act' + Date.now() + Math.random(),
    user_id: '', description: '',
    performed_at: new Date().toISOString().slice(0, 16),
    template_id: '',
  }]);
  const updAct = (idx, k, v) => setActivities(p => p.map((a, i) => i === idx ? { ...a, [k]: v } : a));
  const rmAct  = idx => setActivities(p => p.filter((_, i) => i !== idx));
  const applyTemplate = (idx, tplId) => {
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) { updAct(idx, 'template_id', ''); return; }
    setActivities(p => p.map((a, i) => i === idx ? { ...a, template_id: tplId, description: tpl.description || tpl.name } : a));
  };

  // ── Save: create task → attach forms → save activities → close ───────────
  const save = async () => {
    if (!subject.trim()) return;
    setBusy(true);
    try {
      const result = await onSave({ subject, description, notes,
        customerId: customerId || null,
        siteId: siteId || null,
        address: address || null,
        dueDate: date, startTime: time || null, status,
        assigneeIds, contactIds });
      const taskId = result?.id;
      if (taskId) {
        await Promise.all([
          activities.length > 0
            ? saveActsMut.mutateAsync({ taskId, items: activities })
            : Promise.resolve(),
          ...selectedFormIds.map(fid =>
            api.post(`/api/forms/${fid}/assignments`, { entity_type: 'tasks', entity_id: taskId })
          ),
        ]);
      }
      onClose();
    } finally { setBusy(false); }
  };

  // ── Assignee search state ────────────────────────────────────────────────
  const aq = assigneeSearch.trim().toLowerCase();
  const availAssignees  = users.filter(u => !assigneeIds.includes(u.id));
  const assigneeResults = !aq ? availAssignees : availAssignees.filter(u => {
    const full = `${u.first_name||''} ${u.last_name||''}`.toLowerCase();
    return full.includes(aq) || (u.username||'').toLowerCase().includes(aq);
  });
  const assignedUsers = users.filter(u => assigneeIds.includes(u.id));
  const addPendingAssignees = () => {
    if (!assigneePend.length) return;
    setAssigneeIds(p => [...p, ...assigneePend.filter(id => !p.includes(id))]);
    setAssigneePend([]); setAssigneeSearch('');
  };

  // ── Contact search state ─────────────────────────────────────────────────
  const cq = contactSearch.trim().toLowerCase();
  const availContacts  = contacts.filter(c => !contactIds.includes(c.id));
  const contactResults = !cq ? availContacts : availContacts.filter(c => {
    const full  = `${c.first_name||''} ${c.last_name||''}`.toLowerCase();
    const phone = (c.mobile || c.phone || '').toLowerCase();
    return full.includes(cq) || phone.includes(cq)
      || (c.email||'').toLowerCase().includes(cq)
      || siteName(c.site_id).toLowerCase().includes(cq);
  });
  const assignedContacts = contacts.filter(c => contactIds.includes(c.id));
  const addPendingContacts = () => {
    if (!contactPend.length) return;
    setContactIds(p => [...p, ...contactPend.filter(id => !p.includes(id))]);
    setContactPend([]); setContactSearch('');
  };

  const contactRow = c => {
    const site = siteObj(c.site_id);
    return (
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{cLabel(c) || '(ללא שם)'}</div>
        <div style={{ fontSize: 11, color: '#8BA8C7', marginTop: 2 }}>
          {c.role && <span style={{ marginLeft: 8 }}><i className="ti ti-briefcase" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {c.role}</span>}
          {(c.mobile||c.phone) && <span dir="ltr" style={{ marginLeft: 8 }}><i className="ti ti-device-mobile" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {c.mobile||c.phone}</span>}
          {site?.site_name && <span style={{ marginLeft: 8 }}><i className="ti ti-map-pin" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {site.site_name}</span>}
        </div>
      </div>
    );
  };

  // ── Phase 1: creation form ───────────────────────────────────────────────
  return (
    <div className="tcal-overlay" onClick={onClose}>
      <div className="tcal-new-modal" onClick={e => e.stopPropagation()}>
        <div className="tcal-new-header">
          <span><i className="ti ti-calendar" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> משימה חדשה</span>
          <button className="tcal-new-close" onClick={onClose}>×</button>
        </div>

        <div className="tcal-new-body">
          {/* Subject */}
          <input className="tcal-new-subject" placeholder="נושא המשימה *"
            value={subject} onChange={e => setSubject(e.target.value)} autoFocus />

          {/* Description */}
          <div className="tcal-new-field">
            <label>תיאור</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={taSt} />
          </div>

          {/* Customer + Status */}
          <div className="tcal-new-row">
            <div className="tcal-new-field">
              <label>לקוח</label>
              <select value={customerId} onChange={e => { setCustomerId(e.target.value); setContactIds([]); setSiteId(''); setAddress(''); }}>
                <option value="">— ללא לקוח —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="tcal-new-field">
              <label>סטטוס</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ color: STATUS_CFG[status]?.color, fontWeight: 600 }}>
                {Object.entries(STATUS_CFG).filter(([k]) => k !== 'late').map(([v, s]) =>
                  <option key={v} value={v}>{s.label}</option>
                )}
              </select>
            </div>
          </div>

          {/* Site + Address */}
          <div className="tcal-new-row">
            <div className="tcal-new-field">
              <label>אתר לקוח</label>
              <select value={siteId} onChange={e => {
                const sid = e.target.value;
                setSiteId(sid);
                const s = sid ? sites.find(x => x.id === sid) : null;
                if (s) setAddress([s.street, s.city].filter(Boolean).join(', '));
              }} disabled={!customerId}>
                <option value="">— ללא אתר —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.site_name}</option>)}
              </select>
            </div>
            <div className="tcal-new-field">
              <label>כתובת</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="כתובת..." style={inpSt} />
            </div>
          </div>

          {/* Date + Time */}
          <div className="tcal-new-row">
            <div className="tcal-new-field">
              <label>תאריך יעד</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} dir="ltr" />
            </div>
            <div className="tcal-new-field">
              <label>שעת התחלה</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} dir="ltr" />
            </div>
          </div>

          {/* ── Assignees ── */}
          <div className="tcal-new-section">
            <div className="tcal-new-section-hdr">שיוך לעובדים</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                placeholder="חיפוש עובד..." style={inpSt} />
              {assigneeSearch && (
                <button type="button" className="tcal-ghost-btn" onClick={() => setAssigneeSearch('')}>נקה</button>
              )}
              <button type="button" className="tcal-add-btn"
                onClick={addPendingAssignees} disabled={!assigneePend.length}>
                <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף{assigneePend.length > 0 ? ` (${assigneePend.length})` : ''}
              </button>
            </div>
            {assigneeResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 5, maxHeight: 120, overflowY: 'auto' }}>
                {assigneeResults.map(u => {
                  const ip = assigneePend.includes(u.id);
                  return (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: ip ? '#E3F0FF' : '#F8FAFC', border: `1px solid ${ip ? '#1A91D9' : 'transparent'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                      <input type="checkbox" checked={ip} onChange={() => setAssigneePend(p => p.includes(u.id) ? p.filter(x => x !== u.id) : [...p, u.id])} style={{ width: 14, height: 14 }} />
                      <span>{uName(u.id)}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {assignedUsers.length > 0 && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#F0F7FF', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#5B7FA6', marginBottom: 6, fontWeight: 600 }}>עובדים משויכים ({assignedUsers.length}):</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {assignedUsers.map(u => (
                    <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#1A91D922', color: '#1A91D9', border: '1px solid #1A91D944', borderRadius: 14, fontSize: 12, fontWeight: 600 }}>
                      {uName(u.id)}
                      <button type="button" onClick={() => toggleAssignee(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, padding: 0, lineHeight: 1 }} aria-label="הסר עובד"><i className="ti ti-x" aria-hidden="true" /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Contacts ── */}
          <div className="tcal-new-section">
            <div className="tcal-new-section-hdr">אנשי קשר</div>
            {!customerId ? (
              <div style={{ padding: 10, color: '#8BA8C7', textAlign: 'center', fontSize: 12 }}>בחר לקוח תחילה כדי לראות אנשי קשר</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                    placeholder="חיפוש איש קשר לפי שם, טלפון, אתר..." style={inpSt} />
                  {contactSearch && (
                    <button type="button" className="tcal-ghost-btn" onClick={() => setContactSearch('')}>נקה</button>
                  )}
                  <button type="button" className="tcal-add-btn"
                    onClick={addPendingContacts} disabled={!contactPend.length}>
                    <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף{contactPend.length > 0 ? ` (${contactPend.length})` : ''}
                  </button>
                </div>
                {contactResults.length === 0 ? (
                  <div style={{ padding: 10, color: '#8BA8C7', textAlign: 'center', fontSize: 12, border: '1px dashed #C5E3F7', borderRadius: 6 }}>
                    {cq ? 'לא נמצאו אנשי קשר' : availContacts.length === 0 && assignedContacts.length === 0 ? 'אין אנשי קשר ללקוח זה' : 'כל אנשי הקשר משויכים'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                    {contactResults.map(c => {
                      const ip = contactPend.includes(c.id);
                      return (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: 8, background: ip ? '#E3F0FF' : '#F8FAFC', border: `1px solid ${ip ? '#1A91D9' : 'transparent'}`, borderRadius: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={ip} onChange={() => setContactPend(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} style={{ width: 14, height: 14, marginTop: 2 }} />
                          {contactRow(c)}
                        </label>
                      );
                    })}
                  </div>
                )}
                {assignedContacts.length > 0 && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#F0F7FF', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#5B7FA6', marginBottom: 6, fontWeight: 600 }}>אנשי קשר משויכים ({assignedContacts.length}):</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {assignedContacts.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#1A91D911', border: '1px solid #1A91D944', borderRadius: 8 }}>
                          {contactRow(c)}
                          <button type="button" onClick={() => toggleContact(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, padding: 3 }} aria-label="הסר איש קשר"><i className="ti ti-x" aria-hidden="true" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Activities ── */}
          <div className="tcal-new-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="tcal-new-section-hdr" style={{ margin: 0 }}>פעילויות ({activities.length})</div>
              <button type="button" className="tcal-ghost-btn" onClick={addActivity}><i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> שורה חדשה</button>
            </div>
            {activities.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center', color: '#8BA8C7', border: '1px dashed #C5E3F7', borderRadius: 6, fontSize: 12 }}>
                לחץ "שורה חדשה" להוספת פעילות
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F0F7FF' }}>
                      <th style={{ width: 120, padding: '5px 6px', textAlign: 'right', fontWeight: 600 }}>תבנית</th>
                      <th style={{ width: 120, padding: '5px 6px', textAlign: 'right', fontWeight: 600 }}>מי ביצע</th>
                      <th style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600 }}>תיאור</th>
                      <th style={{ width: 155, padding: '5px 6px', textAlign: 'right', fontWeight: 600 }}>מתי בוצע</th>
                      <th style={{ width: 34 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a, idx) => (
                      <tr key={a.id || idx} style={{ borderBottom: '1px solid #E8F0FA' }}>
                        <td style={{ padding: '4px 6px' }}>
                          <select value={a.template_id||''} onChange={e => applyTemplate(idx, e.target.value)} style={{ width: '100%', padding: '3px 4px', fontSize: 12 }}>
                            <option value="">—</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <select value={a.user_id||''} onChange={e => updAct(idx, 'user_id', e.target.value)} style={{ width: '100%', padding: '3px 4px', fontSize: 12 }}>
                            <option value="">—</option>
                            {users.map(u => <option key={u.id} value={u.id}>{uName(u.id)}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input value={a.description||''} onChange={e => updAct(idx, 'description', e.target.value)} placeholder="תיאור" style={{ width: '100%', padding: '3px 4px', fontSize: 12 }} />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input type="datetime-local" value={a.performed_at ? String(a.performed_at).slice(0,16) : ''} onChange={e => updAct(idx, 'performed_at', e.target.value)} dir="ltr" style={{ width: '100%', padding: '3px 4px', fontSize: 12 }} />
                        </td>
                        <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                          <button type="button" onClick={() => rmAct(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14 }} aria-label="הסר פעילות"><i className="ti ti-x" aria-hidden="true" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Forms ── */}
          <div className="tcal-new-section">
            <div className="tcal-new-section-hdr">טפסים לצירוף</div>
            <input value={formSearch} onChange={e => setFormSearch(e.target.value)}
              placeholder="חיפוש טופס..." style={{ ...inpSt, width: '100%', marginBottom: 8 }} />
            {allForms.length === 0 ? (
              <div style={{ padding: 8, color: '#8BA8C7', textAlign: 'center', fontSize: 12 }}>
                {allForms.length === 0 ? 'טוען טפסים...' : 'אין טפסים זמינים'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                {allForms
                  .filter(f => !formSearch || f.name.includes(formSearch) || (f.form_num||'').includes(formSearch))
                  .map(f => {
                    const sel = selectedFormIds.includes(f.id);
                    return (
                      <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: sel ? '#E3F0FF' : '#F8FAFC', border: `1px solid ${sel ? '#1A91D9' : 'transparent'}`, borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleForm(f.id)} style={{ width: 14, height: 14 }} />
                        <span style={{ fontSize: 16 }}>{f.icon?.startsWith('ti-') ? <i className={`ti ${f.icon}`} aria-hidden="true" /> : (f.icon || <i className="ti ti-forms" aria-hidden="true" />)}</span>
                        <span style={{ fontWeight: 600 }}>{f.name}</span>
                        {f.form_num && <span style={{ color: '#8BA8C7', fontSize: 11 }}>{f.form_num}</span>}
                      </label>
                    );
                  })}
              </div>
            )}
            {selectedFormIds.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {selectedFormIds.map(fid => {
                  const f = allForms.find(x => x.id === fid);
                  if (!f) return null;
                  return (
                    <span key={fid} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#1A91D922', color: '#1A91D9', border: '1px solid #1A91D944', borderRadius: 14, fontSize: 12, fontWeight: 600 }}>
                      {f.icon?.startsWith('ti-') ? <i className={`ti ${f.icon}`} aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> : (f.icon || <i className="ti ti-forms" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} />)} {f.name}
                      <button type="button" onClick={() => toggleForm(fid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, padding: 0, lineHeight: 1 }} aria-label="הסר טופס"><i className="ti ti-x" aria-hidden="true" /></button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="tcal-new-field">
            <label>הערות</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={taSt} />
          </div>
        </div>

        <div className="tcal-new-footer">
          <button className="tcal-btn-cancel" onClick={onClose}>ביטול</button>
          <button className="tcal-btn-save" onClick={save} disabled={!subject.trim() || busy}>
            {busy ? 'שומר...' : <><i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף משימה</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── All-Day Row ───────────────────────────────────────────────────────────────
function AllDayRow({ columns, onTaskClick, onTaskDrop }) {
  const [dropCol, setDropCol] = useState(null);
  const hasAny = columns.some(c => c.tasks.some(t => !t.start_time));
  if (!hasAny) return null;
  return (
    <div className="tcal-allday-row">
      <div className="tcal-allday-gutter" style={{ width: GUTTER_W }}>כל היום</div>
      {columns.map(col => (
        <div key={col.key}
          className={`tcal-allday-cell${dropCol === col.key ? ' tcal-drop-target' : ''}`}
          onDragOver={e => { e.preventDefault(); setDropCol(col.key); }}
          onDragLeave={() => setDropCol(null)}
          onDrop={e => {
            e.preventDefault(); setDropCol(null);
            const data = getDragData(e); if (!data) return;
            onTaskDrop({ taskId: data.id, newDate: col.dateStr });
          }}
        >
          {col.tasks.filter(t => !t.start_time).map(t =>
            <TaskEvent key={t.id} task={t} onClick={onTaskClick}
              compact onDragStart={() => {}} onDragEnd={() => {}} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Time Grid (shared by Week + Day views) ─────────────────────────────────────
function TimeGrid({ columns, onSlotClick, onTaskClick, onTaskDrop }) {
  const hours    = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const nowHour  = new Date().getHours();
  const nowMin   = new Date().getMinutes();
  const [dropKey, setDropKey] = useState(null); // `${colKey}-${hour}`

  return (
    <div className="tcal-time-grid">
      {/* Hour labels */}
      <div className="tcal-gutter" style={{ width: GUTTER_W }}>
        {hours.map(h => (
          <div key={h} className="tcal-hour-label" style={{ height: HOUR_H }}>
            {String(h).padStart(2,'0')}:00
          </div>
        ))}
      </div>

      {/* Day columns */}
      {columns.map(col => {
        const isToday = col.dateStr === TODAY_STR;
        return (
          <div key={col.key}
            className={`tcal-col${isToday ? ' tcal-col--today' : ''}`}
            style={{ height: HOUR_H * (END_HOUR - START_HOUR) }}>

            {/* Hour slots — clickable AND droppable */}
            {hours.map(h => {
              const slotKey = `${col.key}-${h}`;
              const isDropOver = dropKey === slotKey;
              return (
                <div key={h}
                  className={`tcal-slot${isDropOver ? ' tcal-slot--drop' : ''}`}
                  style={{ top: (h - START_HOUR) * HOUR_H, height: HOUR_H }}
                  onClick={() => onSlotClick({ date: col.dateStr, hour: h, min: 0, empId: col.empId })}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropKey(slotKey); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropKey(null); }}
                  onDrop={e => {
                    e.preventDefault(); setDropKey(null);
                    const data = getDragData(e); if (!data) return;
                    // Subtract the grab-offset so drop feels natural
                    // e.g. grabbed at 10:15 → offsetMin=15, drop at 09:XX → subtract → 09:00
                    const offsetMin = parseInt(e.dataTransfer.getData('application/tcal-offset') || '0');
                    const rect      = e.currentTarget.getBoundingClientRect();
                    const yInSlot   = Math.max(0, e.clientY - rect.top);
                    const rawMin    = Math.max(0, (yInSlot / HOUR_H) * 60 - offsetMin);
                    const min       = snapMin(rawMin);
                    const newTime   = `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
                    onTaskDrop({ taskId: data.id, newDate: col.dateStr, newTime });
                  }}
                />
              );
            })}

            {/* Current time line */}
            {isToday && nowHour >= START_HOUR && nowHour < END_HOUR && (
              <div className="tcal-now-line"
                style={{ top: (nowHour - START_HOUR) * HOUR_H + nowMin * (HOUR_H / 60) }}>
                <span className="tcal-now-dot" />
              </div>
            )}

            {/* Timed task events */}
            {col.tasks.filter(t => t.start_time).map(t => {
              const tp = parseTime(t.start_time);
              if (!tp || tp.h < START_HOUR || tp.h >= END_HOUR) return null;
              const top = (tp.h - START_HOUR) * HOUR_H + tp.m * (HOUR_H / 60);
              const height = t.duration_minutes ? Math.max(52, (t.duration_minutes / 60) * HOUR_H) : 52;
              return (
                <TaskEvent key={t.id} task={t} onClick={onTaskClick}
                  onDragStart={() => {}} onDragEnd={() => {}}
                  style={{ position: 'absolute', top, left: 3, right: 3, height, zIndex: 2 }} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ days, tasksByDate, onSlotClick, onTaskClick, onTaskDrop }) {
  const columns = days.map(d => ({
    key:     fmt(d),
    dateStr: fmt(d),
    label:   `${DAY_NAMES[d.getDay()]} ${d.getDate()}`,
    isToday: fmt(d) === TODAY_STR,
    tasks:   tasksByDate[fmt(d)] || [],
  }));

  return (
    <div className="tcal-week-view">
      <div className="tcal-col-headers">
        <div style={{ width: GUTTER_W, flexShrink: 0 }} />
        {columns.map(c => (
          <div key={c.key} className={`tcal-col-hdr${c.isToday ? ' tcal-col-hdr--today' : ''}`}>
            <div className="tcal-col-hdr-day">{c.label.split(' ')[0]}</div>
            <div className={`tcal-col-hdr-num${c.isToday ? ' today' : ''}`}>{c.label.split(' ')[1]}</div>
          </div>
        ))}
      </div>
      <AllDayRow columns={columns} onTaskClick={onTaskClick} onTaskDrop={onTaskDrop} />
      <div className="tcal-scroll-body">
        <TimeGrid columns={columns} onSlotClick={onSlotClick}
          onTaskClick={onTaskClick} onTaskDrop={onTaskDrop} />
      </div>
    </div>
  );
}

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({ date, tasksByDate, users, empFilter, onSlotClick, onTaskClick, onTaskDrop }) {
  const dateStr  = fmt(date);
  const allTasks = tasksByDate[dateStr] || [];
  const empList  = empFilter.length > 0
    ? users.filter(u => empFilter.includes(u.id))
    : users.filter(u => allTasks.some(t => (t.assignee_ids||[]).includes(u.id)));
  const columns  = empList.length > 0
    ? empList.map(u => ({
        key: u.id, dateStr, empId: u.id, label: userLabel(u),
        tasks: allTasks.filter(t => (t.assignee_ids||[]).includes(u.id)),
      }))
    : [{ key: 'all', dateStr, label: 'כל המשימות', tasks: allTasks }];

  return (
    <div className="tcal-day-view">
      <div className="tcal-col-headers">
        <div style={{ width: GUTTER_W, flexShrink: 0 }} />
        {columns.map(c => (
          <div key={c.key} className={`tcal-col-hdr${dateStr === TODAY_STR ? ' tcal-col-hdr--today' : ''}`}>
            {c.empId && (
              <div className="tcal-col-hdr-avatar" style={{ background: avatarColor(c.empId) }}>
                {userInit(users.find(u => u.id === c.empId) || {})}
              </div>
            )}
            <div className="tcal-col-hdr-day" style={{ fontSize: 12 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <AllDayRow columns={columns} onTaskClick={onTaskClick} onTaskDrop={onTaskDrop} />
      <div className="tcal-scroll-body">
        <TimeGrid columns={columns} onSlotClick={onSlotClick}
          onTaskClick={onTaskClick} onTaskDrop={onTaskDrop} />
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ date, tasksByDate, onSlotClick, onTaskClick, onTaskDrop }) {
  const cells    = getMonthCells(date);
  const curMonth = date.getMonth();
  const [dropCell, setDropCell] = useState(null);

  return (
    <div className="tcal-month-view">
      <div className="tcal-month-hdr">
        {DAY_NAMES.map(d => <div key={d} className="tcal-month-dayname">{d}</div>)}
      </div>
      <div className="tcal-month-grid">
        {cells.map((d, i) => {
          const ds      = fmt(d);
          const isToday = ds === TODAY_STR;
          const inMonth = d.getMonth() === curMonth;
          const tasks   = tasksByDate[ds] || [];
          const shown   = tasks.slice(0, 3);
          const more    = tasks.length - 3;
          return (
            <div key={i}
              className={`tcal-month-cell${isToday ? ' today' : ''}${!inMonth ? ' other' : ''}${dropCell === ds ? ' tcal-drop-target' : ''}`}
              onClick={() => onSlotClick({ date: ds, hour: 9, min: 0 })}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropCell(ds); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropCell(null); }}
              onDrop={e => {
                e.preventDefault(); setDropCell(null);
                const data = getDragData(e); if (!data) return;
                // Month drop: change only the date, preserve time
                onTaskDrop({ taskId: data.id, newDate: ds });
              }}
            >
              <div className={`tcal-month-num${isToday ? ' today' : ''}`}>{d.getDate()}</div>
              {shown.map(t =>
                <TaskEvent key={t.id} task={t} onClick={onTaskClick} compact
                  onDragStart={() => {}} onDragEnd={() => {}} />
              )}
              {more > 0 && <div className="tcal-month-more">+{more} נוספות</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Toast notification ────────────────────────────────────────────────────────
function DragToast({ msg, onDone }) {
  return (
    <div className="tcal-toast" onAnimationEnd={onDone}>
      <i className="ti ti-check" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {msg}
    </div>
  );
}

// ── Main Calendar Page ────────────────────────────────────────────────────────
export default function TasksCalendar() {
  const navigate = useNavigate();
  const [view, setView]           = useState('week');
  const [date, setDate]           = useState(new Date());
  const [empFilter, setEmpFilter] = useState([]);
  const [newSlot, setNewSlot]     = useState(null);
  const [toast, setToast]         = useState(null);

  const range = useMemo(() => getRange(view, date), [view, date]);

  const { data: tasksData, isLoading } = useTasks({ dueFrom: range.from, dueTo: range.to, limit: 3000 });
  const { data: usersData }             = useUsers({ limit: 500 });
  const createTask                      = useCreateTask();
  const updateTask                      = useUpdateTask();

  const allTasks = tasksData?.data || [];
  const allUsers = (usersData?.data || []).filter(u => u.status !== 'inactive');

  const tasksByDate = useMemo(() => {
    const m = {};
    allTasks.forEach(t => {
      const d = String(t.due_date || '').slice(0, 10);
      if (!d) return;
      const empOk = empFilter.length === 0 || (t.assignee_ids||[]).some(id => empFilter.includes(id));
      if (!empOk) return;
      (m[d] = m[d] || []).push(t);
    });
    return m;
  }, [allTasks, empFilter]);

  // ── Drag-and-drop: move task to new date/time ─────────────────────────────
  const handleTaskDrop = useCallback(async ({ taskId, newDate, newTime }) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const origDate = String(task.due_date || '').slice(0, 10);
    const origTime = task.start_time ? String(task.start_time).slice(0, 5) : null;
    const finalTime = newTime !== undefined ? newTime : origTime; // month-drop keeps original time

    // No change → skip
    if (newDate === origDate && finalTime === origTime) return;

    try {
      await updateTask.mutateAsync({
        id:          taskId,
        subject:     task.subject,
        description: task.description,
        notes:       task.notes,
        status:      task.status,
        customerId:  task.customer_id || null,
        dueDate:     newDate,
        startTime:   finalTime || null,
        assigneeIds: task.assignee_ids  || [],
        contactIds:  task.contact_ids   || [],
      });

      const timeStr = finalTime ? ` · ${finalTime}` : '';
      const dateObj = new Date(newDate + 'T00:00:00');
      const dateStr = dateObj.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
      setToast(`המשימה הועברה ל-${dateStr}${timeStr}`);
    } catch {
      setToast('שגיאה בעדכון המשימה');
    }
  }, [allTasks, updateTask]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const move = dir => setDate(d => {
    const x = new Date(d);
    if (view === 'day')   x.setDate(x.getDate() + dir);
    if (view === 'week')  x.setDate(x.getDate() + dir * 7);
    if (view === 'month') x.setMonth(x.getMonth() + dir);
    return x;
  });

  const onTaskClick = task => navigate(`/tasks?edit=${task.id}`);
  const onSlotClick = slot => setNewSlot(slot);

  const handleCreate = async data => {
    const result = await createTask.mutateAsync(data);
    return result;
  };

  const title = useMemo(() => {
    if (view === 'day')
      return date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const w = getWeekDays(date);
      return `${w[0].getDate()}–${w[6].getDate()} ${MONTH_NAMES[w[6].getMonth()]} ${w[6].getFullYear()}`;
    }
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  }, [view, date]);

  const weekDays = useMemo(() => getWeekDays(date), [date]);

  return (
    <div className="tcal-page">

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="tcal-topbar">
        <div className="tcal-topbar-start">
          <button className="tcal-back-btn" onClick={() => navigate('/tasks/dashboard')}>← דשבורד</button>
          <span className="tcal-topbar-icon"><i className="ti ti-calendar" aria-hidden="true" /></span>
          <h1 className="tcal-topbar-title">יומן עובדים</h1>
        </div>
        <div className="tcal-view-toggle">
          {[['day','יומי'],['week','שבועי'],['month','חודשי']].map(([v,l]) => (
            <button key={v} className={`tcal-view-btn${view===v?' active':''}`}
              onClick={() => setView(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="tcal-toolbar">
        <div className="tcal-nav">
          <button className="tcal-nav-arr" onClick={() => move(-1)}>‹</button>
          <button className="tcal-today-btn" onClick={() => setDate(new Date())}>היום</button>
          <button className="tcal-nav-arr" onClick={() => move(1)}>›</button>
          <span className="tcal-nav-title">{title}</span>
        </div>

        <div className="tcal-emp-pills">
          <span className="tcal-pills-label">עובדים:</span>
          <button className={`tcal-pill${empFilter.length===0?' active':''}`}
            onClick={() => setEmpFilter([])}>הכל</button>
          {allUsers.map(u => {
            const sel = empFilter.includes(u.id);
            return (
              <button key={u.id}
                className={`tcal-pill tcal-pill--emp${sel?' active':''}`}
                style={sel ? { background: avatarColor(u.id), borderColor: avatarColor(u.id), color: '#fff' } : {}}
                onClick={() => setEmpFilter(p => sel ? p.filter(x=>x!==u.id) : [...p, u.id])}>
                <span className="tcal-pill-av" style={{ background: avatarColor(u.id) }}>{userInit(u)}</span>
                {userLabel(u)}
              </button>
            );
          })}
        </div>

        <div className="tcal-legend">
          {Object.entries(STATUS_CFG).map(([k,s]) => (
            <span key={k} className="tcal-legend-item">
              <span className="tcal-legend-dot" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Calendar Body ─────────────────────────────────────────────────── */}
      <div className="tcal-body">
        {isLoading ? (
          <div className="tcal-loading">טוען יומן...</div>
        ) : view === 'week' ? (
          <WeekView days={weekDays} tasksByDate={tasksByDate}
            onSlotClick={onSlotClick} onTaskClick={onTaskClick} onTaskDrop={handleTaskDrop} />
        ) : view === 'day' ? (
          <DayView date={date} tasksByDate={tasksByDate} users={allUsers}
            empFilter={empFilter} onSlotClick={onSlotClick} onTaskClick={onTaskClick} onTaskDrop={handleTaskDrop} />
        ) : (
          <MonthView date={date} tasksByDate={tasksByDate}
            onSlotClick={onSlotClick} onTaskClick={onTaskClick} onTaskDrop={handleTaskDrop} />
        )}
      </div>

      {/* ── Quick Create Modal ───────────────────────────────────────────── */}
      {newSlot && (
        <NewTaskModal slot={newSlot} users={allUsers}
          onClose={() => setNewSlot(null)} onSave={handleCreate} />
      )}

      {/* ── Toast confirmation ───────────────────────────────────────────── */}
      {toast && <DragToast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
