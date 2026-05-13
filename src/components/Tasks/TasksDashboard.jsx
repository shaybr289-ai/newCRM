import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import { useCustomers } from '../../hooks/useCustomers';
import { api } from '../../api/client';
import './TasksDashboard.css';

// ── FieldOps Color Palette ────────────────────────────────────────────────────
const FO = {
  B700: '#074876', B600: '#0A5E9A', B400: '#1A91D9',
  B200: '#8EC8F0', B100: '#C5E3F7', B50:  '#E8F4FD', BG: '#F0F7FF',
  T400: '#0097A7', T50:  '#E0F7FA',
  SUCCESS: '#00C875', WARNING: '#FFB900', DANGER: '#E2445C',
  TEXT_DARK: '#042C53', TEXT_MUTED: '#5B7FA6',
};

const TASK_STATUSES = {
  new:        { label: 'חדשה',    color: FO.WARNING,  bg: '#FFF8E1', text: '#7A5700' },
  in_progress:{ label: 'בתהליך', color: FO.T400,     bg: FO.T50,   text: '#00838F' },
  on_hold:    { label: 'בהמתנה', color: '#94A3B8',   bg: '#F1F5F9', text: '#475569' },
  completed:  { label: 'הושלמה', color: FO.SUCCESS,  bg: '#E8F8F0', text: '#0A6B3C' },
  cancelled:  { label: 'בוטלה',  color: '#EF4444',   bg: '#FEE2E2', text: '#991B1B' },
};

const TODAY = new Date().toISOString().slice(0, 10);

function isLate(task) {
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  return task.due_date && task.due_date < TODAY;
}

function effectiveStatus(task) {
  if (isLate(task)) return 'late';
  return task.status || 'new';
}

const AVATAR_COLORS = [FO.B400, FO.B600, FO.T400, '#9333EA', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6'];
const avatarColor = (id = '') =>
  AVATAR_COLORS[Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

const initials = (u) =>
  ((u.first_name || '')[0] || '').toUpperCase() + ((u.last_name || '')[0] || '').toUpperCase() || (u.username || '?')[0].toUpperCase();

const fullName = (u) =>
  `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '—';

// ── Period helpers ────────────────────────────────────────────────────────────
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

// ── Employee Drawer ────────────────────────────────────────────────────────────
function EmployeeDrawer({ employee, tasks, onClose, custName, statusDefs }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const navigate = useNavigate();

  // Sort tasks newest-first (by created_at desc, fall back to due_date desc)
  const sorted = useMemo(() => [...tasks].sort((a, b) => {
    const ca = a.created_at || a.due_date || '';
    const cb = b.created_at || b.due_date || '';
    return cb.localeCompare(ca);
  }), [tasks]);

  const list = useMemo(() => {
    let t = sorted;
    if (statusFilter !== 'all') t = t.filter(x => effectiveStatus(x) === statusFilter);
    if (dateFrom) t = t.filter(x => x.due_date >= dateFrom);
    if (dateTo)   t = t.filter(x => x.due_date <= dateTo);
    return t;
  }, [sorted, statusFilter, dateFrom, dateTo]);

  const counts = useMemo(() => {
    const c = { all: tasks.length, open: 0, completed: 0, late: 0 };
    tasks.forEach(t => {
      if (t.status === 'completed') c.completed++;
      else if (isLate(t))          c.late++;
      else                         c.open++;
    });
    return c;
  }, [tasks]);

  // Build status options from statusDefs
  const statusOptions = useMemo(() => [
    { v: 'all', l: 'כל הסטטוסים' },
    ...Object.entries(statusDefs).map(([k, d]) => ({ v: k, l: k === 'late' ? 'באיחור' : d.label })),
    { v: 'late', l: 'באיחור' },
  ].filter((o, i, arr) => arr.findIndex(x => x.v === o.v) === i), [statusDefs]);

  return (
    <div className="tdb-overlay" onClick={onClose}>
      <div className="tdb-drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="tdb-drawer-header">
          <div className="tdb-drawer-avatar" style={{ background: avatarColor(employee.id) }}>
            {initials(employee)}
          </div>
          <div className="tdb-drawer-info">
            <div className="tdb-drawer-name">{fullName(employee)}</div>
            <div className="tdb-drawer-role">{employee.department || employee.user_type || 'עובד'}</div>
          </div>
          <button className="tdb-drawer-close" onClick={onClose}>×</button>
        </div>

        {/* KPI Strip */}
        <div className="tdb-drawer-kpi">
          {[['סה"כ', counts.all, FO.TEXT_DARK], ['הושלמו', counts.completed, FO.SUCCESS],
            ['פתוחות', counts.open, FO.WARNING], ['באיחור', counts.late, FO.DANGER]].map(([l, v, c]) => (
            <div key={l} className="tdb-drawer-kpi-item">
              <div className="tdb-drawer-kpi-val" style={{ color: c }}>{v}</div>
              <div className="tdb-drawer-kpi-label">{l}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="tdb-drawer-filters">
          <select
            className="tdb-select tdb-drawer-filter-sel"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {statusOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <input type="date" className="tdb-date-input tdb-drawer-filter-date"
            value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            title="מתאריך" />
          <span style={{ fontSize: 11, color: FO.TEXT_MUTED }}>—</span>
          <input type="date" className="tdb-date-input tdb-drawer-filter-date"
            value={dateTo} onChange={e => setDateTo(e.target.value)}
            title="עד תאריך" />
          {(statusFilter !== 'all' || dateFrom || dateTo) && (
            <button
              className="tdb-ghost-xs"
              onClick={() => { setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}
            >× נקה</button>
          )}
        </div>

        {/* Task List */}
        <div className="tdb-drawer-list">
          {list.length > 0 && (
            <div className="tdb-drawer-hint">
              מוצגות {list.length} מתוך {tasks.length} משימות — לחץ לעריכה
            </div>
          )}
          {list.length === 0 ? (
            <div className="tdb-drawer-empty">אין משימות התואמות לסינון</div>
          ) : list.map(t => {
            const st = effectiveStatus(t);
            const stDef = statusDefs[st] || TASK_STATUSES[st] || TASK_STATUSES.new;
            const statusLabel = st === 'late' ? 'באיחור' : stDef.label;
            const statusColor = st === 'late' ? FO.DANGER : stDef.color;
            const statusBg    = st === 'late' ? '#FDEDF0' : stDef.bg;
            const statusText  = st === 'late' ? '#9B1B30' : stDef.text;
            return (
              <div
                key={t.id}
                className="tdb-drawer-task"
                onClick={() => { onClose(); navigate(`/tasks?edit=${t.id}`); }}
                title="לחץ לעריכת המשימה"
              >
                <span className="tdb-drawer-dot" style={{ background: statusColor }} />
                <div className="tdb-drawer-task-body">
                  <div className="tdb-drawer-task-name">{t.subject || t.task_num}</div>
                  <div className="tdb-drawer-task-meta">
                    {t.task_num}
                    {t.customer_id ? ` • ${custName(t.customer_id)}` : ''}
                    {t.due_date ? ` • ${new Date(t.due_date).toLocaleDateString('he-IL')}` : ''}
                  </div>
                </div>
                <span className="tdb-badge" style={{ background: statusBg, color: statusText }}>
                  {statusLabel}
                </span>
                <span style={{ fontSize: 14, opacity: .45, marginRight: 4 }}>✏️</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── TaskStatusSettings Modal ──────────────────────────────────────────────────
function TaskStatusSettings({ onClose, onSaved }) {
  const [statuses, setStatuses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  // New status form
  const [newKey, setNewKey]       = useState('');
  const [newLabel, setNewLabel]   = useState('');
  const [newColor, setNewColor]   = useState('#3B82F6');
  const [newBg, setNewBg]         = useState('#EFF6FF');
  const [newText, setNewText]     = useState('#1E40AF');
  // Edit mode
  const [editId, setEditId]       = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editBg, setEditBg]       = useState('');
  const [editText, setEditText]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/task-status-settings');
      setStatuses(r.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newKey.trim() || !newLabel.trim()) { setError('מפתח ושם סטטוס הם שדות חובה'); return; }
    setSaving(true); setError(null);
    try {
      await api.post('/api/task-status-settings', {
        key: newKey.trim(), label: newLabel.trim(),
        color: newColor, bg_color: newBg, text_color: newText,
      });
      setNewKey(''); setNewLabel(''); setNewColor('#3B82F6'); setNewBg('#EFF6FF'); setNewText('#1E40AF');
      await load(); onSaved?.();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (s) => {
    setEditId(s.id); setEditLabel(s.label); setEditColor(s.color); setEditBg(s.bg_color); setEditText(s.text_color);
  };

  const handleSaveEdit = async () => {
    setSaving(true); setError(null);
    try {
      await api.put(`/api/task-status-settings/${editId}`, {
        label: editLabel, color: editColor, bg_color: editBg, text_color: editText,
      });
      setEditId(null);
      await load(); onSaved?.();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('למחוק סטטוס זה?')) return;
    setSaving(true); setError(null);
    try {
      await api.delete(`/api/task-status-settings/${id}`);
      await load(); onSaved?.();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleMoveUp = async (idx) => {
    if (idx === 0) return;
    const next = [...statuses];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setStatuses(next);
    try { await api.post('/api/task-status-settings/reorder', { ids: next.map(s => s.id) }); onSaved?.(); }
    catch (e) { setError(e.message); load(); }
  };

  const handleMoveDown = async (idx) => {
    if (idx === statuses.length - 1) return;
    const next = [...statuses];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setStatuses(next);
    try { await api.post('/api/task-status-settings/reorder', { ids: next.map(s => s.id) }); onSaved?.(); }
    catch (e) { setError(e.message); load(); }
  };

  return (
    <div className="tdb-overlay" onClick={onClose}>
      <div className="tdb-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="tdb-settings-header">
          <span>⚙️ הגדרות מודול משימות</span>
          <button className="tdb-drawer-close" onClick={onClose}>×</button>
        </div>

        <h3 className="tdb-settings-section-title">סטטוסי משימות</h3>
        <p className="tdb-settings-hint">ניהול סטטוסים קיימים וסדר הצגתם. סטטוסים מובנים ניתנים לעריכה אך לא למחיקה.</p>

        {error && <div className="tdb-settings-error">{error}</div>}

        {loading ? (
          <div style={{ padding: 20, color: FO.TEXT_MUTED, textAlign: 'center' }}>טוען...</div>
        ) : (
          <div className="tdb-status-list">
            {statuses.map((s, idx) => (
              <div key={s.id} className="tdb-status-row">
                {/* Reorder arrows */}
                <div className="tdb-status-arrows">
                  <button className="tdb-arrow-btn" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>▲</button>
                  <button className="tdb-arrow-btn" onClick={() => handleMoveDown(idx)} disabled={idx === statuses.length - 1}>▼</button>
                </div>
                {editId === s.id ? (
                  <div className="tdb-status-edit-row">
                    <input className="tdb-settings-input" value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="שם" />
                    <div className="tdb-color-group">
                      <label style={{ fontSize: 10, color: FO.TEXT_MUTED }}>צבע גבול</label>
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="tdb-color-input" />
                    </div>
                    <div className="tdb-color-group">
                      <label style={{ fontSize: 10, color: FO.TEXT_MUTED }}>רקע</label>
                      <input type="color" value={editBg} onChange={e => setEditBg(e.target.value)} className="tdb-color-input" />
                    </div>
                    <div className="tdb-color-group">
                      <label style={{ fontSize: 10, color: FO.TEXT_MUTED }}>טקסט</label>
                      <input type="color" value={editText} onChange={e => setEditText(e.target.value)} className="tdb-color-input" />
                    </div>
                    <button className="tdb-settings-save-btn" onClick={handleSaveEdit} disabled={saving}>✓</button>
                    <button className="tdb-settings-cancel-btn" onClick={() => setEditId(null)}>✕</button>
                  </div>
                ) : (
                  <>
                    <span className="tdb-badge" style={{ background: s.bg_color, color: s.text_color, border: `1.5px solid ${s.color}`, marginLeft: 8 }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: 11, color: FO.TEXT_MUTED, flex: 1 }}>{s.key}{s.is_built_in ? ' (מובנה)' : ''}</span>
                    <button className="tdb-settings-edit-btn" onClick={() => startEdit(s)}>✏️</button>
                    {!s.is_built_in && (
                      <button className="tdb-settings-del-btn" onClick={() => handleDelete(s.id)} disabled={saving}>🗑</button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new status */}
        <h3 className="tdb-settings-section-title" style={{ marginTop: 20 }}>הוספת סטטוס חדש</h3>
        <div className="tdb-status-add-form">
          <input className="tdb-settings-input" value={newKey} onChange={e => setNewKey(e.target.value.replace(/\s/g, '_'))}
            placeholder="מפתח (key, ללא רווחים)" />
          <input className="tdb-settings-input" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="שם לתצוגה" />
          <div className="tdb-color-group">
            <label style={{ fontSize: 10, color: FO.TEXT_MUTED }}>צבע גבול</label>
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="tdb-color-input" />
          </div>
          <div className="tdb-color-group">
            <label style={{ fontSize: 10, color: FO.TEXT_MUTED }}>רקע</label>
            <input type="color" value={newBg} onChange={e => setNewBg(e.target.value)} className="tdb-color-input" />
          </div>
          <div className="tdb-color-group">
            <label style={{ fontSize: 10, color: FO.TEXT_MUTED }}>טקסט</label>
            <input type="color" value={newText} onChange={e => setNewText(e.target.value)} className="tdb-color-input" />
          </div>
          <button className="tdb-settings-add-btn" onClick={handleAdd} disabled={saving || !newKey.trim() || !newLabel.trim()}>
            + הוסף
          </button>
        </div>
        {newLabel && newColor && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 11, color: FO.TEXT_MUTED }}>תצוגה מקדימה: </span>
            <span className="tdb-badge" style={{ background: newBg, color: newText, border: `1.5px solid ${newColor}` }}>
              {newLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Employee Card ──────────────────────────────────────────────────────────────
function EmployeeCard({ employee, tasks, onClick }) {
  const stats = useMemo(() => {
    let total = tasks.length, done = 0, late = 0, open = 0;
    tasks.forEach(t => {
      if (t.status === 'completed') done++;
      else if (isLate(t))          late++;
      else                         open++;
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, late, open, pct };
  }, [tasks]);

  const pctColor = stats.pct >= 80 ? FO.SUCCESS
    : stats.pct >= 60 ? FO.B400
    : stats.pct >= 50 ? FO.WARNING
    : FO.DANGER;

  const hasLate = stats.late > 0;

  return (
    <div
      className={`tdb-card ${hasLate ? 'has-late' : ''}`}
      onClick={() => onClick(employee)}
    >
      {/* Header: avatar + name + percent */}
      <div className="tdb-card-header">
        <div className="tdb-avatar" style={{ background: avatarColor(employee.id) }}>
          {initials(employee)}
        </div>
        <div className="tdb-card-identity">
          <div className="tdb-card-name">{fullName(employee)}</div>
          <div className="tdb-card-role">{employee.department || employee.user_type || 'עובד'}</div>
        </div>
        <div className="tdb-card-pct" style={{ color: pctColor }}>
          <div className="tdb-card-pct-val">{stats.pct}%</div>
          <div className="tdb-card-pct-label">ביצוע</div>
        </div>
      </div>

      {/* 4 stat boxes */}
      <div className="tdb-card-stats">
        {[['סה"כ', stats.total, FO.TEXT_DARK], ['הושלמו', stats.done, FO.SUCCESS],
          ['פתוחות', stats.open, FO.WARNING], ['באיחור', stats.late, FO.DANGER]].map(([l, v, c]) => (
          <div key={l} className="tdb-stat-box">
            <div className="tdb-stat-val" style={{ color: c }}>{v}</div>
            <div className="tdb-stat-label">{l}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="tdb-progress-track">
        <div className="tdb-progress-fill" style={{ width: `${stats.pct}%`, background: pctColor }} />
      </div>
      <div className="tdb-progress-meta">
        <span>{stats.total} / {stats.done}</span>
        <span>התקדמות</span>
      </div>

      {/* Alert row */}
      {hasLate && (
        <div className="tdb-alert-row">
          <span>⚠</span>
          <span>{stats.late} משימות עברו את תאריך היעד</span>
        </div>
      )}

      {/* Tags */}
      <div className="tdb-tags">
        {hasLate
          ? <span className="tdb-tag" style={{ background: '#FDEDF0', color: FO.DANGER }}>{stats.late} באיחור</span>
          : stats.pct >= 80
            ? <span className="tdb-tag" style={{ background: '#E8F8F0', color: '#0A6B3C' }}>בזמן</span>
            : null}
        {stats.open > 0 && (
          <span className="tdb-tag" style={{ background: FO.B50, color: FO.B600 }}>{stats.open} להשלמה</span>
        )}
      </div>

      {/* Enter button — opens drawer to pick a task, then click task → editor */}
      <button
        className="tdb-enter-btn"
        onClick={e => { e.stopPropagation(); onClick(employee); }}
      >
        כניסה למשימה ←
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function TasksDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod]         = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [empFilter, setEmpFilter]   = useState([]);
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [empSearch, setEmpSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerEmp, setDrawerEmp]   = useState(null);
  const [searchSubject, setSearchSubject] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Dynamic status definitions fetched from server (falls back to built-in TASK_STATUSES)
  const [fetchedStatuses, setFetchedStatuses] = useState(null);

  const loadStatuses = useCallback(async () => {
    try {
      const r = await api.get('/api/task-status-settings');
      const map = {};
      (r.data || []).forEach(s => {
        map[s.key] = { label: s.label, color: s.color, bg: s.bg_color, text: s.text_color };
      });
      setFetchedStatuses(map);
    } catch { /* keep built-in */ }
  }, []);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  // Merged status defs: built-in TASK_STATUSES overridden by fetched values
  const statusDefs = useMemo(() => ({
    ...TASK_STATUSES,
    ...(fetchedStatuses || {}),
  }), [fetchedStatuses]);

  const range = useMemo(() => getPeriodRange(period, customFrom, customTo), [period, customFrom, customTo]);

  // Fetch all tasks for the period
  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    dueFrom: range.from || undefined,
    dueTo:   range.to   || undefined,
    limit:   5000,
  });

  const { data: usersData }    = useUsers({ limit: 500 });
  const { data: customersData } = useCustomers({ limit: 2000 });

  const allTasks    = tasksData?.data    || [];
  const allUsers    = usersData?.data    || [];
  const allCustomers = customersData?.data || [];

  const custName = (cid) => allCustomers.find(c => c.id === cid)?.company_name || '';

  // Visible users after filters
  const visibleUsers = useMemo(() => {
    let list = allUsers.filter(u => u.status !== 'inactive');
    if (groupFilter !== 'all') list = list.filter(u => (u.department || '') === groupFilter);
    if (empFilter.length > 0)  list = list.filter(u => empFilter.includes(u.id));
    return list;
  }, [allUsers, groupFilter, empFilter]);

  // Apply subject / customer search to the raw task list
  const searchedTasks = useMemo(() => {
    let t = allTasks;
    if (searchSubject.trim())  t = t.filter(x => (x.subject || '').includes(searchSubject.trim()));
    if (searchCustomer.trim()) t = t.filter(x => custName(x.customer_id).toLowerCase().includes(searchCustomer.trim().toLowerCase()));
    return t;
  }, [allTasks, searchSubject, searchCustomer, allCustomers]);

  // Map tasks to assignees (task can have multiple assignee_ids)
  const tasksByUser = useMemo(() => {
    const m = {};
    visibleUsers.forEach(u => { m[u.id] = []; });
    searchedTasks.forEach(task => {
      const ids = Array.isArray(task.assignee_ids) ? task.assignee_ids : [];
      ids.forEach(uid => { if (m[uid] !== undefined) m[uid].push(task); });
    });
    return m;
  }, [searchedTasks, visibleUsers]);

  // Filter employees by status filter + hide employees with no matching tasks when search is active
  const filteredUsers = useMemo(() => {
    let list = visibleUsers;
    if (statusFilter !== 'all') {
      list = list.filter(u => {
        const ts = tasksByUser[u.id] || [];
        return ts.some(t => effectiveStatus(t) === statusFilter);
      });
    }
    if (searchSubject.trim() || searchCustomer.trim()) {
      list = list.filter(u => (tasksByUser[u.id] || []).length > 0);
    }
    return list;
  }, [visibleUsers, statusFilter, tasksByUser, searchSubject, searchCustomer]);

  // Global KPIs
  const kpi = useMemo(() => {
    let total = 0, done = 0, open = 0, late = 0;
    filteredUsers.forEach(u => {
      const ts = tasksByUser[u.id] || [];
      ts.forEach(t => {
        total++;
        if (t.status === 'completed') done++;
        else if (isLate(t))           late++;
        else                          open++;
      });
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, open, late, pct, emps: filteredUsers.length };
  }, [filteredUsers, tasksByUser]);

  // Unique departments for group filter
  const departments = useMemo(() => {
    const set = new Set(allUsers.map(u => u.department).filter(Boolean));
    return [...set];
  }, [allUsers]);

  const todayLabel = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: 'long', year: 'numeric' });
  const monthLabel = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'][new Date().getMonth() + 1];

  return (
    <div className="tdb-page">
      {/* Top Bar */}
      <div className="tdb-topbar">
        <div className="tdb-topbar-left">
          <span className="tdb-topbar-icon">☑</span>
          <h1 className="tdb-topbar-title">דשבורד משימות — סקירת עובדים</h1>
        </div>
        <div className="tdb-topbar-right">
          <button
            className="tdb-calendar-btn"
            onClick={() => navigate('/tasks?templates=1')}
          >
            📋 תבניות פעילויות במשימה
          </button>
          <button
            className="tdb-calendar-btn"
            onClick={() => navigate('/tasks?new=1')}
            style={{ background: FO.B600, color: '#fff', borderColor: FO.B600 }}
          >
            ➕ משימה חדשה
          </button>
          <button
            className="tdb-calendar-btn"
            onClick={() => navigate('/tasks/calendar')}
          >
            📅 יומן עובדים
          </button>
          <button
            className="tdb-calendar-btn"
            onClick={() => setShowSettings(true)}
            title="הגדרות מודול משימות"
          >
            ⚙️ הגדרות
          </button>
          <span className="tdb-live-dot" />
          <span className="tdb-live-label">{todayLabel}</span>
        </div>
      </div>

      {/* Toolbar — single row */}
      <div className="tdb-toolbar">

        {/* ── Group / Employee / Status ── */}
        <div className="tdb-filter-group">
          <label className="tdb-filter-label">קבוצה:</label>
          <select className="tdb-select" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
            <option value="all">כל העובדים</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

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
                  placeholder="🔍 חיפוש עובד..."
                  autoFocus
                  style={{ width: '100%', padding: '5px 8px', marginBottom: 6, borderRadius: 6, border: '1.5px solid #C5E3F7', fontSize: 12, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                />
                <div className="tdb-emp-clear" onClick={() => setEmpFilter([])}>× נקה בחירה</div>
                {allUsers
                  .filter(u => u.status !== 'inactive')
                  .filter(u => !empSearch || fullName(u).toLowerCase().includes(empSearch.toLowerCase()))
                  .map(u => (
                    <label key={u.id} className="tdb-emp-item">
                      <input
                        type="checkbox"
                        checked={empFilter.includes(u.id)}
                        onChange={e => setEmpFilter(p => e.target.checked ? [...p, u.id] : p.filter(x => x !== u.id))}
                      />
                      {fullName(u)}
                    </label>
                  ))}
              </div>
            </>
          )}
        </div>

        <div className="tdb-filter-group">
          <label className="tdb-filter-label">סטטוס:</label>
          <select className="tdb-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">כל הסטטוסים</option>
            {Object.entries(statusDefs).map(([k, d]) => (
              <option key={k} value={k}>{d.label}</option>
            ))}
            <option value="late">באיחור</option>
          </select>
        </div>

        {/* ── Divider ── */}
        <div className="tdb-toolbar-divider" />

        {/* ── Period ── */}
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

      </div>

      {/* Search row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: FO.TEXT_MUTED }}>חיפוש לפי נושא משימה</label>
          <input
            value={searchSubject}
            onChange={e => setSearchSubject(e.target.value)}
            placeholder="הקלד נושא..."
            style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #C5E3F7', fontSize: 13, minWidth: 200, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: FO.TEXT_MUTED }}>חיפוש לפי שם לקוח</label>
          <input
            value={searchCustomer}
            onChange={e => setSearchCustomer(e.target.value)}
            placeholder="הקלד שם לקוח..."
            style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #C5E3F7', fontSize: 13, minWidth: 200, outline: 'none' }}
          />
        </div>
        {(searchSubject || searchCustomer) && (
          <button
            onClick={() => { setSearchSubject(''); setSearchCustomer(''); }}
            style={{ marginTop: 18, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', fontSize: 12, cursor: 'pointer', color: FO.TEXT_MUTED }}
          >
            × נקה חיפוש
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="tdb-kpi-grid">
        {[
          { label: 'סה"כ משימות',    value: kpi.total, color: FO.TEXT_DARK, sub: `${kpi.pct}% מהסה"כ הושלמו`, icon: '📋' },
          { label: 'הושלמו',         value: kpi.done,  color: FO.SUCCESS,   sub: `${kpi.total ? Math.round(kpi.done / kpi.total * 100) : 0}% מהסה"כ`, icon: '✓' },
          { label: 'פתוחות / באיחור', value: `${kpi.open} / ${kpi.late}`, color: FO.DANGER, sub: `${kpi.late} עברו תאריך יעד`, icon: '⏰' },
          { label: 'עובדים מוצגים',  value: kpi.emps,  color: FO.B600,     sub: `מתוך ${allUsers.length} עובדים`, icon: '👥' },
        ].map(k => (
          <div key={k.label} className="tdb-kpi-card">
            <div className="tdb-kpi-header">
              <span className="tdb-kpi-label">{k.label}</span>
              <span className="tdb-kpi-icon">{k.icon}</span>
            </div>
            <div className="tdb-kpi-val" style={{ color: k.color }}>{k.value}</div>
            <div className="tdb-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Section heading */}
      <div className="tdb-section-heading">
        ביצועי עובדים — {monthLabel} {new Date().getFullYear()}
      </div>

      {/* Employee Grid */}
      {tasksLoading ? (
        <div className="tdb-loading">טוען נתונים...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="tdb-empty">
          {allUsers.length === 0
            ? 'אין עובדים במערכת — הוסף עובדים במודול "משתמשים והרשאות"'
            : 'אין עובדים תואמים לסינון הנוכחי'}
        </div>
      ) : (
        <div className="tdb-grid">
          {filteredUsers.map(u => (
            <EmployeeCard
              key={u.id}
              employee={u}
              tasks={tasksByUser[u.id] || []}
              onClick={setDrawerEmp}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      {drawerEmp && (
        <EmployeeDrawer
          employee={drawerEmp}
          tasks={tasksByUser[drawerEmp.id] || []}
          onClose={() => setDrawerEmp(null)}
          custName={custName}
          statusDefs={statusDefs}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <TaskStatusSettings
          onClose={() => setShowSettings(false)}
          onSaved={loadStatuses}
        />
      )}
    </div>
  );
}
