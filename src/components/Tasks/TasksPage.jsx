import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DataTable from '../Layout/DataTable';
import {
  useTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useTaskActivities, useSaveTaskActivities, useActivityTemplates,
  useCreateActivityTemplate, useUpdateActivityTemplate, useDeleteActivityTemplate,
} from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import { useCustomers } from '../../hooks/useCustomers';
import { useContacts } from '../../hooks/useContacts';
import { useSites } from '../../hooks/useSites';
import useAuthStore from '../../store/authStore';
import { api } from '../../api/client';
import { Icon, ICONS } from '../../utils/icons';
import TaskFormsSection from './TaskFormsSection';
import { TaskStatusSettings } from './TasksDashboard';
import './TasksDashboard.css';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

// ── FieldOps Color Palette ────────────────────────────────────────────────────
const FO = {
  B700: '#074876', B600: '#0A5E9A', B400: '#1A91D9',
  B200: '#8EC8F0', B100: '#C5E3F7', B50:  '#E8F4FD', BG: '#F0F7FF',
  T400: '#0097A7', T50:  '#E0F7FA',
  SUCCESS: '#00C875', WARNING: '#FFB900', DANGER: '#E2445C',
  TEXT_DARK: '#042C53', TEXT_MUTED: '#5B7FA6',
};

const TASK_STATUSES_LIST = [
  ['new', 'חדשה'],
  ['in_progress', 'בביצוע'],
  ['on_hold', 'בהמתנה'],
  ['completed', 'הושלמה'],
  ['cancelled', 'בוטלה'],
];

const TASK_STATUSES_MAP = {
  new:         { label: 'חדשה',    color: FO.WARNING,  bg: '#FFF8E1', text: '#7A5700' },
  in_progress: { label: 'בתהליך', color: FO.T400,     bg: FO.T50,   text: '#00838F' },
  on_hold:     { label: 'בהמתנה', color: '#94A3B8',   bg: '#F1F5F9', text: '#475569' },
  completed:   { label: 'הושלמה', color: FO.SUCCESS,  bg: '#E8F8F0', text: '#0A6B3C' },
  cancelled:   { label: 'בוטלה',  color: '#EF4444',   bg: '#FEE2E2', text: '#991B1B' },
};

const TODAY = new Date().toISOString().slice(0, 10);

function getPeriodRange(period, customFrom, customTo) {
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  if (period === 'custom') return { from: customFrom, to: customTo };
  if (period === 'today')  return { from: TODAY, to: TODAY };
  if (period === 'week') {
    const s = new Date(now); s.setDate(s.getDate() - s.getDay());
    const e = new Date(s);   e.setDate(e.getDate() + 6);
    return { from: fmt(s), to: fmt(e) };
  }
  if (period === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: fmt(s), to: fmt(e) };
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    const s = new Date(now.getFullYear(), q * 3, 1);
    const e = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { from: fmt(s), to: fmt(e) };
  }
  if (period === 'year') return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  return { from: '', to: '' };
}

const TASKS_COLUMNS = [
  { key: 'task_num',    label: 'מספר',       section: 'כללי', defaultVisible: true },
  { key: 'subject',     label: 'נושא',        section: 'כללי', defaultVisible: true },
  { key: 'customer',    label: 'לקוח',        section: 'כללי', defaultVisible: true },
  { key: 'assignees',   label: 'משויך ל',     section: 'כללי', defaultVisible: true },
  { key: 'start_time',  label: 'שעת התחלה',  section: 'תאריכים', defaultVisible: true },
  { key: 'due_date',    label: 'תאריך יעד',  section: 'תאריכים', defaultVisible: true },
  { key: 'status',      label: 'סטטוס',       section: 'כללי', defaultVisible: true },
  { key: 'created_at',  label: 'נוצר',        section: 'תאריכים', defaultVisible: false },
  { key: 'description', label: 'תיאור',       section: 'כללי', defaultVisible: false },
];

export default function TasksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('tasks'); // 'tasks' | 'templates'
  const [editItem, setEditItem] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Dynamic status definitions fetched from server
  const [statusDefs, setStatusDefs] = useState(TASK_STATUSES_MAP);
  const [statusList, setStatusList] = useState(TASK_STATUSES_LIST);

  const loadStatuses = useCallback(() => {
    api.get('/api/task-status-settings').then(r => {
      const rows = r?.data || [];
      if (!rows.length) return;
      const map = {};
      rows.forEach(s => {
        map[s.key] = { label: s.label, color: s.color, bg: s.bg_color, text: s.text_color };
      });
      setStatusDefs(map);
      setStatusList(rows.map(s => [s.key, s.label]));
    }).catch(() => {});
  }, []);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  // Dashboard-style filter state
  const [period, setPeriod]             = useState('month');
  const [customFrom, setCustomFrom]     = useState('');
  const [customTo, setCustomTo]         = useState('');
  const [empFilter, setEmpFilter]       = useState([]);
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [empSearch, setEmpSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const range = useMemo(() => getPeriodRange(period, customFrom, customTo), [period, customFrom, customTo]);

  const { data: rawData, isLoading } = useTasks({
    dueFrom: range.from || undefined,
    dueTo:   range.to   || undefined,
    limit:   5000,
  });
  const { data: usersData } = useUsers({ limit: 500 });
  const { data: custData }  = useCustomers({ limit: 2000 });
  const deleteMut = useDeleteTask();

  const allTasks    = rawData?.data    || [];
  const users       = usersData?.data  || [];
  const customers   = custData?.data   || [];

  // Client-side filters
  const tasks = useMemo(() => {
    let t = allTasks;
    if (empFilter.length > 0)
      t = t.filter(task => (task.assignee_ids || []).some(uid => empFilter.includes(uid)));
    if (statusFilter !== 'all')
      t = t.filter(task => task.status === statusFilter);
    return t;
  }, [allTasks, empFilter, statusFilter]);

  // Open task editor from URL (?edit=<id>)
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && allTasks.length) {
      const t = allTasks.find(x => x.id === editId);
      if (t) { setEditItem(t); setSearchParams({}, { replace: true }); }
    }
  }, [searchParams, allTasks]);

  // Apply assigneeId filter from URL (?assigneeId=<uid>)
  useEffect(() => {
    const assigneeIdParam = searchParams.get('assigneeId');
    if (assigneeIdParam) {
      setEmpFilter([assigneeIdParam]);
      setSearchParams({}, { replace: true });
    }
  }, []);

  // Open new task editor from URL (?new=1)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditItem({ subject: '', description: '', notes: '', customer_id: '', due_date: '', start_time: '', status: 'new', assignee_ids: [], contact_ids: [] });
      setSearchParams({}, { replace: true });
    }
  }, []);

  // Open templates view from URL (?templates=1)
  useEffect(() => {
    if (searchParams.get('templates') === '1') {
      setView('templates');
      setSearchParams({}, { replace: true });
    }
  }, []);

  const userName = (uid) => {
    const u = users.find(x => x.id === uid);
    return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '—' : '—';
  };
  const custName = (cid) => customers.find(c => c.id === cid)?.company_name || '—';

  const kpi = useMemo(() => {
    const count = (s) => tasks.filter(t => t.status === s).length;
    const late = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && t.due_date < TODAY).length;
    return {
      total: tasks.length,
      done: count('completed'),
      open: count('new') + count('in_progress') + count('on_hold'),
      late,
    };
  }, [tasks]);

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteMut.mutateAsync(confirmDel.id);
    setConfirmDel(null);
  };

  if (editItem) {
    return <TaskEditor task={editItem} users={users} customers={customers} statusList={statusList} statusDefs={statusDefs} onClose={() => setEditItem(null)} />;
  }

  if (view === 'templates') {
    return <TemplatesPage onBack={() => setView('tasks')} />;
  }

  const renderCell = (t, key) => {
    const stDef = statusDefs[t.status] || { label: t.status, color: '#6B7280', bg: '#F3F4F6', text: '#374151' };
    const assignees = (t.assignee_ids || []).map(userName).filter(n => n !== '—').join(', ');
    switch (key) {
      case 'task_num':    return <strong>{t.task_num}</strong>;
      case 'subject':     return t.subject;
      case 'customer':    return t.customer_id ? custName(t.customer_id) : '—';
      case 'assignees':   return <span style={{ fontSize: 12, color: FO.TEXT_MUTED }}>{assignees || '—'}</span>;
      case 'start_time':  return t.start_time ? <strong>{String(t.start_time).slice(0, 5)}</strong> : '—';
      case 'due_date':    return t.due_date ? new Date(t.due_date).toLocaleDateString('he-IL') : '—';
      case 'status':      return (
        <span style={{ padding: '3px 10px', borderRadius: 12, background: stDef.bg, color: stDef.text, border: `1px solid ${stDef.color}`, fontWeight: 600, fontSize: 11 }}>
          {stDef.label}
        </span>
      );
      case 'created_at':  return <span style={{ fontSize: 11, color: FO.TEXT_MUTED }}>{new Date(t.created_at).toLocaleDateString('he-IL')}</span>;
      case 'description': return <span style={{ fontSize: 12, color: FO.TEXT_MUTED, maxWidth: 240, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || '—'}</span>;
      default: return null;
    }
  };

  return (
    <div className="tdb-page">

      {showSettings && (
        <TaskStatusSettings onClose={() => { setShowSettings(false); loadStatuses(); }} onSaved={loadStatuses} />
      )}

      {/* Top Bar */}
      <div className="tdb-topbar">
        <div className="tdb-topbar-left">
          <span className="tdb-topbar-icon"><i className="ti ti-checkbox" aria-hidden="true" /></span>
          <h1 className="tdb-topbar-title">ניהול משימות</h1>
        </div>
        <div className="tdb-topbar-right">
          <button className="tdb-calendar-btn" onClick={() => navigate('/tasks/dashboard')}>
            <i className="ti ti-chart-bar" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> דשבורד משימות
          </button>
          <button className="tdb-calendar-btn" onClick={() => setView('templates')}>
            <i className="ti ti-clipboard-list" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> תבניות פעילויות
          </button>
          <button
            className="tdb-calendar-btn"
            onClick={() => setEditItem({ subject: '', description: '', notes: '', customer_id: '', due_date: '', start_time: '', status: 'new', assignee_ids: [], contact_ids: [] })}
            style={{ background: FO.B600, color: '#fff', borderColor: FO.B600 }}
          >
            <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> משימה חדשה
          </button>
          <button className="tdb-calendar-btn" onClick={() => navigate('/tasks/calendar')}>
            <i className="ti ti-calendar" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> יומן עובדים
          </button>
          <button className="tdb-calendar-btn" onClick={() => setShowSettings(true)} title="הגדרות מודול משימות">
            <i className="ti ti-settings" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הגדרות
          </button>
        </div>
      </div>

      {/* Toolbar — identical to dashboard */}
      <div className="tdb-toolbar">

        {/* Employee picker */}
        <div className="tdb-filter-group" style={{ position: 'relative' }}>
          <label className="tdb-filter-label">עובד:</label>
          <button className="tdb-select tdb-emp-btn" onClick={() => { setEmpPickerOpen(o => !o); setEmpSearch(''); }}>
            {empFilter.length === 0 ? 'כל העובדים' : `${empFilter.length} עובדים נבחרו`}
            {empFilter.length > 0 && <span className="tdb-emp-badge">{empFilter.length}</span>}
          </button>
          {empPickerOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => { setEmpPickerOpen(false); setEmpSearch(''); }} />
              <div className="tdb-emp-picker" style={{ zIndex: 100 }}>
                <input
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder="חיפוש עובד..."
                  autoFocus
                  style={{ width: '100%', padding: '5px 8px', marginBottom: 6, borderRadius: 6, border: '1.5px solid #C5E3F7', fontSize: 12, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                />
                <div className="tdb-emp-clear" onClick={() => setEmpFilter([])}>× נקה בחירה</div>
                {users
                  .filter(u => u.status !== 'inactive')
                  .filter(u => !empSearch || `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(empSearch.toLowerCase()))
                  .map(u => (
                    <label key={u.id} className="tdb-emp-item">
                      <input
                        type="checkbox"
                        checked={empFilter.includes(u.id)}
                        onChange={e => setEmpFilter(p => e.target.checked ? [...p, u.id] : p.filter(x => x !== u.id))}
                      />
                      {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                    </label>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Status filter */}
        <div className="tdb-filter-group">
          <label className="tdb-filter-label">סטטוס:</label>
          <select className="tdb-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">כל הסטטוסים</option>
            {statusList.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Divider */}
        <div className="tdb-toolbar-divider" />

        {/* Period buttons */}
        <span className="tdb-filter-label">תקופה:</span>
        {[['today', 'היום'], ['week', 'שבוע'], ['month', 'חודש'], ['quarter', 'רבעון'], ['year', 'שנה']].map(([v, l]) => (
          <button
            key={v}
            className={`tdb-period-btn ${period === v ? 'active' : ''}`}
            onClick={() => setPeriod(v)}
          >{l}</button>
        ))}
        <input type="date" className="tdb-date-input" value={customFrom || range.from}
          onChange={e => { setCustomFrom(e.target.value); setPeriod('custom'); }} />
        <span className="tdb-filter-label">עד</span>
        <input type="date" className="tdb-date-input" value={customTo || range.to}
          onChange={e => { setCustomTo(e.target.value); setPeriod('custom'); }} />

        {/* Clear button */}
        {(empFilter.length > 0 || statusFilter !== 'all') && (
          <button className="tdb-ghost-xs" onClick={() => { setEmpFilter([]); setStatusFilter('all'); }}>
            × נקה
          </button>
        )}

      </div>

      {/* KPI Cards */}
      <div className="tdb-kpi-grid">
        {[
          { label: 'סה"כ משימות',    value: kpi.total, color: FO.TEXT_DARK, sub: `בתקופה הנבחרת`,               icon: 'ti-clipboard-list' },
          { label: 'הושלמו',         value: kpi.done,  color: FO.SUCCESS,   sub: `${kpi.total ? Math.round(kpi.done / kpi.total * 100) : 0}% מהסה"כ`, icon: 'ti-circle-check' },
          { label: 'פתוחות',         value: kpi.open,  color: FO.WARNING,   sub: `ממתינות לביצוע`,              icon: 'ti-hourglass' },
          { label: 'באיחור',         value: kpi.late,  color: FO.DANGER,    sub: `עברו תאריך יעד`,              icon: 'ti-alert-triangle' },
        ].map(k => (
          <div key={k.label} className="tdb-kpi-card">
            <div className="tdb-kpi-header">
              <span className="tdb-kpi-label">{k.label}</span>
              <span className="tdb-kpi-icon"><i className={`ti ${k.icon}`} aria-hidden="true" /></span>
            </div>
            <div className="tdb-kpi-val" style={{ color: k.color }}>{k.value}</div>
            <div className="tdb-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      {confirmDel && (
        <div style={{ background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#EF4444' }}>מחיקת משימה {confirmDel.task_num}?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
            <button className="btn btn-danger" onClick={handleDelete}>מחק</button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        title="רשימת משימות"
        columns={TASKS_COLUMNS}
        data={tasks}
        total={tasks.length}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setEditItem({ subject: '', description: '', notes: '', customer_id: '', due_date: '', start_time: '', status: 'new', assignee_ids: [], contact_ids: [] })}
        onEdit={setEditItem}
        onDelete={setConfirmDel}
        renderCell={renderCell}
        storageKey="tasks_visible_cols"
        addLabel="+ משימה חדשה"
      />
    </div>
  );
}

// ── Task Editor (full page) ──
function TaskEditor({ task: initialTask, users, customers, statusList = TASK_STATUSES_LIST, statusDefs = TASK_STATUSES_MAP, onClose }) {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [form, setForm] = useState({
    id: initialTask.id,
    subject: initialTask.subject || '',
    description: initialTask.description || '',
    notes: initialTask.notes || '',
    customerId: initialTask.customer_id || '',
    siteId: initialTask.site_id || '',
    address: initialTask.address || '',
    dueDate: initialTask.due_date ? String(initialTask.due_date).split('T')[0] : '',
    startTime: initialTask.start_time ? String(initialTask.start_time).slice(0, 5) : '',
    durationMinutes: initialTask.duration_minutes || '',
    statusForms: (() => {
      const sf = initialTask.status_forms;
      if (!sf) return {};
      if (typeof sf === 'string') { try { return JSON.parse(sf); } catch { return {}; } }
      return sf;
    })(),
    status: initialTask.status || 'new',
    assigneeIds: initialTask.assignee_ids || [],
    contactIds: initialTask.contact_ids || [],
  });
  const [activities, setActivities] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneePending, setAssigneePending] = useState([]); // temp selection to be added
  const [contactSearch, setContactSearch] = useState('');
  const [contactPending, setContactPending] = useState([]);
  // Forms picker — used only when creating a new task (form.id is empty)
  const [allForms,        setAllForms]        = useState([]);
  const [selectedFormIds, setSelectedFormIds] = useState([]);
  const [formSearch,      setFormSearch]      = useState('');

  const { data: actsData } = useTaskActivities(form.id);
  const { data: contactsData } = useContacts({ customerId: form.customerId, limit: 500 });
  const { data: sitesData } = useSites({ customerId: form.customerId, limit: 500 });
  const { data: templatesData } = useActivityTemplates();
  const createMut = useCreateTask();
  const updateMut = useUpdateTask();
  const saveActsMut = useSaveTaskActivities();

  const contacts = contactsData?.data || [];
  const sites = sitesData?.data || [];
  const templates = templatesData?.data || [];
  const siteName = (sid) => sites.find(s => s.id === sid)?.site_name || '';
  const siteObj = (sid) => sites.find(s => s.id === sid);

  useEffect(() => {
    if (actsData?.data) {
      setActivities(actsData.data.map(a => ({
        id: a.id || 'act' + Date.now() + Math.random(),
        user_id: a.user_id || '',
        description: a.description || '',
        performed_at: a.performed_at || new Date().toISOString(),
        template_id: a.template_id || '',
      })));
    } else if (!form.id) {
      setActivities([]);
    }
  }, [actsData, form.id]);

  // Load forms catalog (for new-task picker + status→form mapping)
  useEffect(() => {
    api.get('/api/forms-list').then(r => setAllForms(r.data || [])).catch(() => {});
  }, []);

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleAssignee = (uid) => setForm(p => ({
    ...p,
    assigneeIds: p.assigneeIds.includes(uid) ? p.assigneeIds.filter(x => x !== uid) : [...p.assigneeIds, uid],
  }));
  const toggleContact = (cid) => setForm(p => ({
    ...p,
    contactIds: p.contactIds.includes(cid) ? p.contactIds.filter(x => x !== cid) : [...p.contactIds, cid],
  }));

  const addActivity = () => setActivities(p => [...p, {
    id: 'act' + Date.now() + Math.random(),
    user_id: '',
    description: '',
    // Pre-fill with the task's due date + start time if set
    performed_at: form.dueDate
      ? `${form.dueDate}T${form.startTime || '00:00'}`
      : new Date().toISOString().slice(0, 16),
    template_id: '',
  }]);
  const updActivity = (idx, k, v) => {
    setActivities(p => p.map((a, i) => i === idx ? { ...a, [k]: v } : a));
    // Selecting an employee in an activity auto-assigns them to the task
    if (k === 'user_id' && v) {
      setForm(p => ({
        ...p,
        assigneeIds: p.assigneeIds.includes(v) ? p.assigneeIds : [...p.assigneeIds, v],
      }));
    }
  };
  const removeActivity = (idx) => setActivities(p => p.filter((_, i) => i !== idx));
  const applyTemplate = (idx, templateId) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) { updActivity(idx, 'template_id', ''); return; }
    setActivities(p => p.map((a, i) => i === idx
      ? { ...a, template_id: templateId, description: tpl.description || tpl.name }
      : a));
  };

  const handleSave = async () => {
    if (!form.subject?.trim()) { alert('נושא המשימה הוא שדה חובה'); return; }
    try {
      const payload = {
        subject: form.subject, description: form.description, notes: form.notes,
        customerId: form.customerId || null,
        siteId: form.siteId || null,
        address: form.address || null,
        dueDate: form.dueDate || null,
        startTime: form.startTime || null,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null,
        statusForms: Object.fromEntries(Object.entries(form.statusForms || {}).filter(([, v]) => v)),
        status: form.status,
        assigneeIds: form.assigneeIds, contactIds: form.contactIds,
      };
      let savedId = form.id;
      const isNew = !form.id;
      if (form.id) {
        await updateMut.mutateAsync({ id: form.id, ...payload });
      } else {
        const result = await createMut.mutateAsync(payload);
        savedId = result?.id;
        setForm(p => ({ ...p, id: savedId }));
      }
      if (savedId) {
        await Promise.all([
          saveActsMut.mutateAsync({ taskId: savedId, items: activities }),
          ...(isNew ? selectedFormIds.map(fid =>
            api.post(`/api/forms/${fid}/assignments`, { entity_type: 'tasks', entity_id: savedId })
          ) : []),
        ]);
      }
      onClose();
    } catch (err) {
      alert(err.message || 'שגיאה בשמירה');
    }
  };

  const userName = (uid) => {
    const u = users.find(x => x.id === uid);
    return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '' : '';
  };
  const contactLabel = (c) => `${c.first_name || ''} ${c.last_name || ''}`.trim();

  return (
    <div className="animate-in">
      <div className="editor-topbar">
        <button className="btn btn-ghost" onClick={() => navigate('/tasks/dashboard')}><Icon svg={ICONS.back} size={16} /> חזרה</button>
        <div className="editor-topbar-title">
          <h1>{form.id ? `עריכת משימה — ${initialTask.task_num || ''}` : 'משימה חדשה'}</h1>
        </div>
        <button className="btn btn-primary" onClick={handleSave}
          disabled={createMut.isPending || updateMut.isPending || saveActsMut.isPending}>
          {(createMut.isPending || updateMut.isPending || saveActsMut.isPending) ? 'שומר...' : 'שמור'}
        </button>
      </div>

      <div className="card">
        <h3 className="form-section-title">פרטי משימה</h3>
        <div className="form-grid">
          <div className="form-field" style={{ gridColumn: '1/-1' }}>
            <label>נושא המשימה *</label>
            <input value={form.subject} onChange={e => upd('subject', e.target.value)} autoFocus />
          </div>
          <div className="form-field" style={{ gridColumn: '1/-1' }}>
            <label>תיאור משימה</label>
            <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={3} />
          </div>
          <div className="form-field">
            <label>נוצר ע"י</label>
            <input
              value={(() => {
                if (form.id) {
                  const creator = users.find(u => u.id === initialTask.created_by);
                  return creator ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.username || '' : '';
                }
                return currentUser ? `${currentUser.firstName || currentUser.first_name || ''} ${currentUser.lastName || currentUser.last_name || ''}`.trim() || currentUser.username || '' : '';
              })()}
              readOnly
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', cursor: 'default' }}
            />
          </div>
          <div className="form-field">
            <label>שם לקוח</label>
            <select value={form.customerId} onChange={e => { upd('customerId', e.target.value); upd('contactIds', []); upd('siteId', ''); upd('address', ''); }}>
              <option value="">— בחר לקוח —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>אתר לקוח</label>
            <select value={form.siteId} onChange={e => {
              const sid = e.target.value;
              const s = sid ? sites.find(x => x.id === sid) : null;
              setForm(p => ({
                ...p,
                siteId: sid,
                address: s ? [s.street, s.city].filter(Boolean).join(', ') : p.address,
              }));
            }} disabled={!form.customerId}>
              <option value="">— בחר אתר —</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.site_name}{s.city ? ` (${s.city})` : ''}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ gridColumn: '1/-1' }}>
            <label>כתובת</label>
            <input value={form.address} onChange={e => upd('address', e.target.value)} placeholder="כתובת לביצוע המשימה..." />
          </div>
          <div className="form-field">
            <label>תאריך יעד</label>
            <input type="date" value={form.dueDate} onChange={e => upd('dueDate', e.target.value)} dir="ltr" />
          </div>
          <div className="form-field">
            <label>שעת התחלה</label>
            <input type="time" value={form.startTime} onChange={e => upd('startTime', e.target.value)} dir="ltr" />
          </div>
          <div className="form-field">
            <label>משך זמן</label>
            <select value={form.durationMinutes} onChange={e => upd('durationMinutes', e.target.value)}>
              <option value="">— ללא הגדרה —</option>
              <option value="15">15 דקות</option>
              <option value="30">30 דקות</option>
              <option value="45">45 דקות</option>
              <option value="60">שעה</option>
              <option value="90">שעה וחצי</option>
              <option value="120">שעתיים</option>
              <option value="180">3 שעות</option>
              <option value="240">4 שעות</option>
            </select>
          </div>
          <div className="form-field">
            <label>סטטוס</label>
            <select value={form.status} onChange={e => upd('status', e.target.value)}
              style={{ color: statusDefs[form.status]?.color || 'var(--text-1)', fontWeight: 600 }}>
              {statusList.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ gridColumn: '1/-1' }}>
            <label>הערות</label>
            <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={3} placeholder="מידע נוסף על המשימה..." />
          </div>
        </div>

        {/* ── Status → Form mapping ── */}
        {allForms.length > 0 && (
          <>
            <h3 className="form-section-title">שיוך טפסים לסטטוסים</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -8, marginBottom: 12 }}>
              כשעובד בשטח יבחר סטטוס מסוים — הטופס המשויך יופיע אוטומטית במסך המשימה.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {statusList.filter(([v]) => v !== 'new').map(([statusKey, statusLabel]) => {
                const def = statusDefs[statusKey] || {};
                return (
                  <div key={statusKey} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      minWidth: 80, padding: '4px 10px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700, textAlign: 'center',
                      background: def.bg || '#E5E7EB',
                      color: def.text || def.color || '#475569',
                      flexShrink: 0,
                    }}>{statusLabel}</span>
                    <select
                      value={form.statusForms[statusKey] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setForm(p => {
                          const next = { ...p.statusForms };
                          if (val) next[statusKey] = val; else delete next[statusKey];
                          return { ...p, statusForms: next };
                        });
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="">— ללא טופס —</option>
                      {allForms.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── אנשי קשר של הלקוח (right after notes) ── */}
        <h3 className="form-section-title">אנשי קשר של הלקוח (בחירה מרובה)</h3>
        {!form.customerId ? (
          <div style={{ padding: 16, color: 'var(--text-3)', textAlign: 'center', fontSize: 13 }}>בחר לקוח תחילה כדי לראות אנשי קשר</div>
        ) : (() => {
          const q = contactSearch.trim().toLowerCase();
          const availableContacts = contacts.filter(c => !form.contactIds.includes(c.id));
          const searchResults = !q ? availableContacts : availableContacts.filter(c => {
            const full = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
            const phone = (c.mobile || c.phone || '').toLowerCase();
            const site = siteName(c.site_id).toLowerCase();
            return full.includes(q) || phone.includes(q) || (c.email || '').toLowerCase().includes(q) || site.includes(q);
          });
          const assignedContacts = contacts.filter(c => form.contactIds.includes(c.id));
          const togglePending = (cid) => setContactPending(p => p.includes(cid) ? p.filter(x => x !== cid) : [...p, cid]);
          const addSelected = () => {
            if (contactPending.length === 0) return;
            setForm(p => ({ ...p, contactIds: [...p.contactIds, ...contactPending.filter(id => !p.contactIds.includes(id))] }));
            setContactPending([]);
            setContactSearch('');
          };
          const contactRow = (c) => {
            const site = siteObj(c.site_id);
            const address = site ? [site.street, site.city].filter(Boolean).join(', ') : '';
            return (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{contactLabel(c) || '(ללא שם)'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {c.role && <span style={{ marginLeft: 8 }}><i className="ti ti-briefcase" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {c.role}</span>}
                  {(c.mobile || c.phone) && <span dir="ltr" style={{ marginLeft: 8 }}><i className="ti ti-device-mobile" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {c.mobile || c.phone}</span>}
                  {site?.site_name && <span style={{ marginLeft: 8 }}><i className="ti ti-map-pin" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {site.site_name}</span>}
                  {address && <span style={{ marginLeft: 8 }}><i className="ti ti-home" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {address}</span>}
                </div>
              </div>
            );
          };
          return (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                  placeholder="חיפוש איש קשר לפי שם, טלפון, מייל או אתר..."
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }} />
                {contactSearch && (
                  <button type="button" className="btn btn-ghost" onClick={() => setContactSearch('')} style={{ fontSize: 12 }}>נקה</button>
                )}
                <button type="button" className="btn btn-primary"
                  onClick={addSelected} disabled={contactPending.length === 0}
                  style={{ fontSize: 12 }}>
                  <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף {contactPending.length > 0 ? `(${contactPending.length})` : ''}
                </button>
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: 14, color: 'var(--text-3)', textAlign: 'center', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 6 }}>
                  {q ? 'לא נמצאו אנשי קשר התואמים לחיפוש'
                    : availableContacts.length === 0 && assignedContacts.length === 0 ? 'אין אנשי קשר ללקוח זה'
                    : 'כל אנשי הקשר כבר משויכים'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
                  {searchResults.map(c => {
                    const isPending = contactPending.includes(c.id);
                    return (
                      <label key={c.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10,
                        background: isPending ? 'var(--accent)11' : 'var(--bg-elevated)',
                        border: isPending ? '1px solid var(--accent)' : '1px solid transparent',
                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                      }}>
                        <input type="checkbox" checked={isPending} onChange={() => togglePending(c.id)} style={{ width: 16, height: 16, marginTop: 2 }} />
                        {contactRow(c)}
                      </label>
                    );
                  })}
                </div>
              )}
              {assignedContacts.length > 0 && (
                <div style={{ marginTop: 14, padding: 10, background: 'var(--bg-elevated)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8, fontWeight: 600 }}>
                    אנשי קשר ששויכו למשימה ({assignedContacts.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {assignedContacts.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--accent)11', border: '1px solid var(--accent)44', borderRadius: 8 }}>
                        {contactRow(c)}
                        <button type="button" onClick={() => toggleContact(c.id)} title="הסר" aria-label="הסר איש קשר"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: 4 }}><i className="ti ti-x" aria-hidden="true" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ── פעילויות ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }}>
          <h3 className="form-section-title" style={{ margin: 0 }}>פעילויות ({activities.length})</h3>
          <button type="button" className="btn btn-secondary" onClick={addActivity} style={{ fontSize: 12 }}><i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> שורה חדשה</button>
        </div>
        {activities.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 6 }}>
            אין פעילויות. לחץ "שורה חדשה" כדי להוסיף.
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>תבנית</th>
                <th style={{ width: 140 }}>שם עובד</th>
                <th>תיאור</th>
                <th style={{ width: 170 }}>מתי בוצע</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, idx) => (
                <tr key={a.id || idx}>
                  <td>
                    <select value={a.template_id || ''} onChange={e => applyTemplate(idx, e.target.value)}
                      style={{ width: '100%', padding: 4, fontSize: 12 }}>
                      <option value="">—</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={a.user_id || ''} onChange={e => updActivity(idx, 'user_id', e.target.value)}
                      style={{ width: '100%', padding: 4, fontSize: 12 }}>
                      <option value="">—</option>
                      {users.map(u => <option key={u.id} value={u.id}>{userName(u.id)}</option>)}
                    </select>
                  </td>
                  <td>
                    <input value={a.description || ''} onChange={e => updActivity(idx, 'description', e.target.value)}
                      placeholder="תיאור מה בוצע" style={{ width: '100%', padding: 4, fontSize: 12 }} />
                  </td>
                  <td>
                    <input type="datetime-local"
                      value={a.performed_at ? String(a.performed_at).slice(0, 16) : ''}
                      onChange={e => updActivity(idx, 'performed_at', e.target.value)}
                      dir="ltr" style={{ width: '100%', padding: 4, fontSize: 12 }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" onClick={() => removeActivity(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14 }} aria-label="הסר פעילות"><i className="ti ti-x" aria-hidden="true" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── שיוך לעובדים (after activities) ── */}
        <h3 className="form-section-title">שיוך לעובדים (בחירה מרובה)</h3>
        {(() => {
          const q = assigneeSearch.trim().toLowerCase();
          const availableUsers = users.filter(u => !form.assigneeIds.includes(u.id));
          const searchResults = !q ? availableUsers : availableUsers.filter(u => {
            const full = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
            return full.includes(q) || (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
          });
          const assignedUsers = users.filter(u => form.assigneeIds.includes(u.id));
          const togglePending = (uid) => setAssigneePending(p => p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid]);
          const addSelected = () => {
            if (assigneePending.length === 0) return;
            setForm(p => ({ ...p, assigneeIds: [...p.assigneeIds, ...assigneePending.filter(id => !p.assigneeIds.includes(id))] }));
            setAssigneePending([]);
            setAssigneeSearch('');
          };
          return (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <input value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                  placeholder="חיפוש עובד לפי שם, שם משתמש או מייל..."
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }} />
                {assigneeSearch && (
                  <button type="button" className="btn btn-ghost" onClick={() => setAssigneeSearch('')} style={{ fontSize: 12 }}>נקה</button>
                )}
                <button type="button" className="btn btn-primary"
                  onClick={addSelected} disabled={assigneePending.length === 0}
                  style={{ fontSize: 12 }}>
                  <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף {assigneePending.length > 0 ? `(${assigneePending.length})` : ''}
                </button>
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: 14, color: 'var(--text-3)', textAlign: 'center', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 6 }}>
                  {q ? 'לא נמצאו עובדים התואמים לחיפוש' : availableUsers.length === 0 ? 'כל העובדים כבר משויכים' : 'אין עובדים להצגה'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                  {searchResults.map(u => {
                    const isPending = assigneePending.includes(u.id);
                    return (
                      <label key={u.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: 8,
                        background: isPending ? 'var(--accent)11' : 'var(--bg-elevated)',
                        border: isPending ? '1px solid var(--accent)' : '1px solid transparent',
                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                      }}>
                        <input type="checkbox" checked={isPending} onChange={() => togglePending(u.id)} style={{ width: 16, height: 16 }} />
                        <span>{userName(u.id)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {assignedUsers.length > 0 && (
                <div style={{ marginTop: 14, padding: 10, background: 'var(--bg-elevated)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8, fontWeight: 600 }}>
                    עובדים ששויכו למשימה ({assignedUsers.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {assignedUsers.map(u => (
                      <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'var(--accent)22', color: 'var(--accent)', border: '1px solid var(--accent)44', borderRadius: 14, fontSize: 12, fontWeight: 600 }}>
                        {userName(u.id)}
                        <button type="button" onClick={() => toggleAssignee(u.id)} title="הסר" aria-label="הסר עובד"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14, padding: 0, lineHeight: 1 }}><i className="ti ti-x" aria-hidden="true" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ── Forms ── */}
        <div style={{ marginTop: 24 }}>
          {form.id ? (
            // Editing existing task — full attach/detach UI
            <TaskFormsSection taskId={form.id} />
          ) : (
            // Creating new task — picker: forms will be attached on save
            <>
              <h3 className="form-section-title">טפסים לצירוף</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  value={formSearch} onChange={e => setFormSearch(e.target.value)}
                  placeholder="חיפוש טופס..."
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
                />
                {formSearch && (
                  <button type="button" className="btn btn-ghost" onClick={() => setFormSearch('')} style={{ fontSize: 12 }}>נקה</button>
                )}
              </div>
              {allForms.length === 0 ? (
                <div style={{ padding: 14, color: 'var(--text-3)', textAlign: 'center', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 6 }}>
                  טוען טפסים...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
                  {allForms
                    .filter(f => !formSearch || f.name.includes(formSearch) || (f.form_num || '').includes(formSearch))
                    .map(f => {
                      const sel = selectedFormIds.includes(f.id);
                      return (
                        <label key={f.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                          background: sel ? 'var(--accent)11' : 'var(--bg-elevated)',
                          border: sel ? '1px solid var(--accent)' : '1px solid transparent',
                          borderRadius: 8, cursor: 'pointer', fontSize: 13,
                        }}>
                          <input type="checkbox" checked={sel}
                            onChange={() => setSelectedFormIds(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])}
                            style={{ width: 16, height: 16 }} />
                          <span style={{ fontSize: 18 }}>{f.icon?.startsWith('ti-') ? <i className={`ti ${f.icon}`} aria-hidden="true" /> : (f.icon || <i className="ti ti-forms" aria-hidden="true" />)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{f.name}</div>
                            {f.form_num && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{f.form_num}</div>}
                          </div>
                          {sel && <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}><i className="ti ti-check" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> יצורף בשמירה</span>}
                        </label>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Activity Templates Page ──
function TemplatesPage({ onBack }) {
  const navigate = useNavigate();
  const { data, isLoading } = useActivityTemplates();
  const createMut = useCreateActivityTemplate();
  const updateMut = useUpdateActivityTemplate();
  const deleteMut = useDeleteActivityTemplate();

  const [form, setForm] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const templates = data?.data || [];

  const handleSave = async () => {
    if (!form.name?.trim()) { alert('שם פעילות הוא שדה חובה'); return; }
    try {
      if (form.id) await updateMut.mutateAsync(form);
      else await createMut.mutateAsync(form);
      setForm(null);
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleDelete = async () => {
    try { await deleteMut.mutateAsync(confirmDel.id); setConfirmDel(null); }
    catch (err) { alert(err.message || 'שגיאה'); }
  };

  return (
    <div className="animate-in">
      <div className="editor-topbar">
        <button className="btn btn-ghost" onClick={() => navigate('/tasks/dashboard')}><Icon svg={ICONS.back} size={16} /> חזרה</button>
        <div className="editor-topbar-title"><h1>תבניות פעילויות במשימה</h1></div>
        <button className="btn btn-primary" onClick={() => setForm({ name: '', description: '' })}><i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> תבנית חדשה</button>
      </div>

      {form && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 className="form-section-title">{form.id ? 'עריכת תבנית' : 'תבנית חדשה'}</h3>
          <div className="form-grid">
            <div className="form-field"><label>שם פעילות *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
          </div>
          <div className="form-field" style={{ marginTop: 12 }}>
            <label>תיאור פעילות</label>
            <textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>שמור</button>
            <button className="btn btn-ghost" onClick={() => setForm(null)}>ביטול</button>
          </div>
        </div>
      )}

      {confirmDel && (
        <div style={{ background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#EF4444' }}>מחיקת תבנית "{confirmDel.name}"?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
            <button className="btn btn-danger" onClick={handleDelete}>מחק</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>שם פעילות</th>
              <th style={{ padding: 10, textAlign: 'right' }}>תיאור</th>
              <th style={{ padding: 10, textAlign: 'center', width: 100 }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="3" style={{ padding: 20, textAlign: 'center' }}>טוען...</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan="3" style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>אין תבניות פעילות</td></tr>
            ) : templates.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{t.name}</td>
                <td style={{ padding: 10, color: 'var(--text-2)' }}>{t.description || '—'}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button onClick={() => setForm(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }} title="ערוך" aria-label="ערוך תבנית"><i className="ti ti-edit" aria-hidden="true" /></button>
                  <button onClick={() => setConfirmDel(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }} title="מחק" aria-label="מחק תבנית"><i className="ti ti-trash" aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
