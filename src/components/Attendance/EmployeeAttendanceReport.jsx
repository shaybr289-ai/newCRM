import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAttendanceReport } from '../../hooks/useAttendance';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const DOW_HE  = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

function minToHHMM(min) {
  if (!min || min === 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(raw) {
  const d = raw instanceof Date ? raw : new Date(raw);
  const dow = DOW_HE[d.getDay()];
  return `${dow} ${d.toLocaleDateString('he-IL')}`;
}

const RECORD_TYPE_LABEL = {
  work_day:       'יום עבודה',
  customer_visit: 'ביקור לקוח',
};
const RECORD_TYPE_COLOR = {
  work_day:       '#059669',
  customer_visit: '#6366F1',
};

// ── Single expandable day-row ─────────────────────────────────────────────────
function DayRow({ row }) {
  const [open, setOpen] = useState(false);
  const multiSession = Number(row.session_count) > 1;
  const hasOpenSession = row.sessions?.some(s => s.is_open);
  const isOpen = !row.last_out || hasOpenSession;

  return (
    <>
      <tr
        onClick={multiSession ? () => setOpen(o => !o) : undefined}
        style={{
          cursor: multiSession ? 'pointer' : 'default',
          background: multiSession && open ? 'var(--bg-muted, #F9FAFB)' : undefined,
        }}
      >
        {/* Date */}
        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          {fmtDate(row.date)}
        </td>

        {/* First in */}
        <td style={{ color: '#059669', fontWeight: 600 }}>
          {fmtTime(row.first_in)}
        </td>

        {/* Last out */}
        <td style={{ color: isOpen ? '#F59E0B' : '#EF4444', fontWeight: 600 }}>
          {isOpen ? <span style={{ color: '#F59E0B' }}>פתוח</span> : fmtTime(row.last_out)}
        </td>

        {/* Net hours */}
        <td style={{ fontWeight: 700, color: 'var(--text-1)' }}>
          {minToHHMM(row.work_min)}
        </td>

        {/* Overtime */}
        <td>
          {Number(row.ot_min) > 0
            ? <span className={`att-badge ${row.ot_pending ? 'ot-pending' : 'ot-approved'}`}>
                {minToHHMM(row.ot_min)}
              </span>
            : '—'}
        </td>

        {/* Anomalies / visits */}
        <td>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(row.anomalies || []).map(a => (
              <span key={a} className="att-badge anomaly" style={{ fontSize: 10 }}>
                {a === '"late_arrival"' || a === 'late_arrival' ? 'איחור' :
                 a === '"outside_geofence"' || a === 'outside_geofence' ? 'חריגת אזור' :
                 a === '"no_gps"' || a === 'no_gps' ? 'ללא GPS' : a}
              </span>
            ))}
            {Number(row.visit_count) > 0 && (
              <span className="att-badge" style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 10 }}>
                <i className="ti ti-building" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> {row.visit_count} ביקורים
              </span>
            )}
          </div>
        </td>

        {/* Expand indicator */}
        <td style={{ textAlign: 'center', width: 40 }}>
          {multiSession && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#EEF2FF', color: '#4F46E5',
              borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 600,
            }}>
              <span>{row.session_count}</span>
              <span style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
          )}
        </td>
      </tr>

      {/* ── Expanded session detail ── */}
      {multiSession && open && (
        <tr>
          <td colSpan={7} style={{ padding: 0, background: 'var(--bg-muted, #F9FAFB)' }}>
            <div style={{ padding: '8px 16px 12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--text-2)' }}>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>סוג</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>כניסה</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>יציאה</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>שעות נטו</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>הפסקה</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>ש"נ</th>
                  </tr>
                </thead>
                <tbody>
                  {(row.sessions || []).map((s, i) => (
                    <tr key={s.id || i} style={{ borderTop: '1px solid var(--border, #E5E7EB)' }}>
                      <td style={{ padding: '5px 8px' }}>
                        <span style={{
                          color: RECORD_TYPE_COLOR[s.record_type] || 'var(--text-1)',
                          fontWeight: 600,
                        }}>
                          {RECORD_TYPE_LABEL[s.record_type] || s.record_type}
                        </span>
                      </td>
                      <td style={{ padding: '5px 8px', color: '#059669', fontWeight: 600 }}>
                        {fmtTime(s.clock_in_at)}
                      </td>
                      <td style={{ padding: '5px 8px' }}>
                        {s.is_open
                          ? <span style={{ color: '#F59E0B', fontWeight: 600 }}>פתוח</span>
                          : <span style={{ color: '#EF4444', fontWeight: 600 }}>{fmtTime(s.clock_out_at)}</span>
                        }
                      </td>
                      <td style={{ padding: '5px 8px', fontWeight: 700 }}>
                        {minToHHMM(s.net_work_minutes)}
                      </td>
                      <td style={{ padding: '5px 8px', color: 'var(--text-2)' }}>
                        {s.break_minutes > 0 ? `${s.break_minutes}′` : '—'}
                      </td>
                      <td style={{ padding: '5px 8px' }}>
                        {s.overtime_minutes > 0
                          ? <span className="att-badge ot-pending" style={{ fontSize: 10 }}>{minToHHMM(s.overtime_minutes)}</span>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Employee summary card (shown in summary view) ─────────────────────────────
function EmployeeSummaryRow({ t, onClick }) {
  return (
    <tr onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted, #F9FAFB)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{t.user_name}</td>
      <td>{t.department || '—'}</td>
      <td>{t.days_worked}</td>
      <td style={{ fontWeight: 700 }}>{minToHHMM(t.total_work_min)}</td>
      <td>
        {Number(t.total_ot_min) > 0
          ? <span className="att-badge ot-pending">{minToHHMM(t.total_ot_min)}</span>
          : '—'}
      </td>
      <td>{t.late_count > 0 ? <span className="att-badge anomaly">{t.late_count}</span> : '—'}</td>
      <td>{t.sick_days > 0 ? t.sick_days : '—'}</td>
      <td>{t.vacation_days > 0 ? t.vacation_days : '—'}</td>
      <td style={{ color: 'var(--accent)', fontSize: 12 }}>לפירוט ←</td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmployeeAttendanceReport() {
  const now = new Date();
  const [month, setMonth]           = useState(now.getMonth() + 1);
  const [year, setYear]             = useState(now.getFullYear());
  const [userId, setUserId]         = useState('');
  const [department, setDepartment] = useState('');

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  // Users list for filter
  const { data: usersData } = useQuery({
    queryKey: ['attendance-users'],
    queryFn:  () => api.get('/api/attendance/users'),
  });
  const users       = usersData?.data || [];
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  const { data, isLoading, refetch, error } = useAttendanceReport({
    month, year,
    userId:     userId || undefined,
    department: department || undefined,
  });

  const rows   = data?.rows   || [];
  const totals = data?.totals || [];

  // ── Derived data ────────────────────────────────────────────────────────────

  // When a specific user is selected → per-day detail view
  // When "all"                       → per-user summary view
  const isDetailMode = !!userId;

  // Summary grand total
  const grand = useMemo(() => totals.reduce(
    (acc, t) => ({
      total_work_min:  acc.total_work_min  + (Number(t.total_work_min)  || 0),
      total_ot_min:    acc.total_ot_min    + (Number(t.total_ot_min)    || 0),
      days_worked:     acc.days_worked     + (Number(t.days_worked)     || 0),
      late_count:      acc.late_count      + (Number(t.late_count)      || 0),
      sick_days:       acc.sick_days       + (Number(t.sick_days)       || 0),
      vacation_days:   acc.vacation_days   + (Number(t.vacation_days)   || 0),
    }),
    { total_work_min: 0, total_ot_min: 0, days_worked: 0, late_count: 0, sick_days: 0, vacation_days: 0 }
  ), [totals]);

  // Detail-mode totals (from per-day rows, for the selected employee)
  const detailTotals = useMemo(() => rows.reduce(
    (acc, r) => ({
      work_min: acc.work_min + (Number(r.work_min) || 0),
      ot_min:   acc.ot_min   + (Number(r.ot_min)   || 0),
      days:     acc.days + 1,
    }),
    { work_min: 0, ot_min: 0, days: 0 }
  ), [rows]);

  // ── Excel export ─────────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (isDetailMode) {
      // Per-day export
      const selectedUser = users.find(u => u.id === userId);
      const wsData = [
        [`דוח נוכחות — ${selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name || ''}` : ''}  ${MONTHS[month-1]} ${year}`],
        [],
        ['תאריך', 'יום', 'כניסה ראשונה', 'יציאה אחרונה', 'שעות נטו', 'שעות נוספות', 'כניסות', 'הערות'],
      ];
      for (const r of rows) {
        const d = r.date instanceof Date ? r.date : new Date(r.date);
        wsData.push([
          d.toLocaleDateString('he-IL'),
          DOW_HE[d.getDay()],
          fmtTime(r.first_in),
          r.last_out ? fmtTime(r.last_out) : 'פתוח',
          minToHHMM(r.work_min),
          Number(r.ot_min) > 0 ? minToHHMM(r.ot_min) : '',
          Number(r.session_count) > 1 ? `${r.session_count} כניסות` : '',
          (r.anomalies || []).join(', '),
        ]);
      }
      wsData.push([]);
      wsData.push(['סה"כ', '', '', '', minToHHMM(detailTotals.work_min), minToHHMM(detailTotals.ot_min), `${detailTotals.days} ימים`, '']);
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [18, 8, 14, 14, 12, 12, 12, 20].map(wch => ({ wch }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'נוכחות');
      XLSX.writeFile(wb, `נוכחות_${selectedUser?.first_name || 'עובד'}_${MONTHS[month-1]}_${year}.xlsx`);
    } else {
      // Summary export
      const wsData = [
        [`דוח נוכחות עובדים — ${MONTHS[month-1]} ${year}`],
        [],
        ['שם עובד', 'מחלקה', 'ימי עבודה', 'שעות נטו', 'ש"נ', 'איחורים', 'מחלה', 'חופשה'],
      ];
      for (const t of totals) {
        wsData.push([
          t.user_name, t.department || '',
          t.days_worked, minToHHMM(t.total_work_min),
          minToHHMM(t.total_ot_min), t.late_count, t.sick_days, t.vacation_days,
        ]);
      }
      wsData.push([]);
      wsData.push(['סה"כ', '', grand.days_worked, minToHHMM(grand.total_work_min),
        minToHHMM(grand.total_ot_min), grand.late_count, grand.sick_days, grand.vacation_days]);
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = wsData[2].map(() => ({ wch: 16 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'נוכחות עובדים');
      XLSX.writeFile(wb, `נוכחות_עובדים_${MONTHS[month-1]}_${year}.xlsx`);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Filters ── */}
      <div className="att-filters" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label className="att-label">חודש</label>
          <select className="att-input" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="att-label">שנה</label>
          <select className="att-input" value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 160 }}>
          <label className="att-label">מחלקה</label>
          <select className="att-input" value={department} onChange={e => { setDepartment(e.target.value); setUserId(''); }}>
            <option value="">-- כל המחלקות --</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <label className="att-label">עובד</label>
          <select className="att-input" value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">-- כל העובדים (סיכום) --</option>
            {users
              .filter(u => !department || u.department === department)
              .map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name || ''}{u.department ? ` (${u.department})` : ''}
                </option>
              ))}
          </select>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 'auto' }} onClick={() => refetch()}>
          הפק דוח
        </button>
        <button className="btn btn-secondary" style={{ marginTop: 'auto' }}
          onClick={exportExcel}
          disabled={(isDetailMode ? rows : totals).length === 0}>
          ייצוא Excel
        </button>
      </div>

      {/* ── Breadcrumb when in detail mode ── */}
      {isDetailMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setUserId('')}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
              fontSize: 12, color: 'var(--text-2)',
            }}
          >
            ← חזרה לסיכום
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            {users.find(u => u.id === userId)
              ? `${users.find(u => u.id === userId).first_name} ${users.find(u => u.id === userId).last_name || ''}`
              : ''}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            — {MONTHS[month - 1]} {year}
          </span>
        </div>
      )}

      {isLoading && <p style={{ color: 'var(--text-2)' }}>טוען...</p>}

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: 14, color: '#991B1B', fontSize: 13, marginBottom: 16 }}>
          שגיאה: {error?.message || 'נסה שוב'}
        </div>
      )}

      {!isLoading && !error && (isDetailMode ? rows : totals).length === 0 && (
        <p style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: 40 }}>
          אין נתונים לתקופה שנבחרה
        </p>
      )}

      {/* ══════════════════════════════════════════════════════
          DETAIL MODE — per-day rows for a single employee
          ════════════════════════════════════════════════════*/}
      {!isLoading && isDetailMode && rows.length > 0 && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'ימי עבודה',   value: detailTotals.days,               color: '#3B82F6' },
              { label: 'שעות נטו',    value: minToHHMM(detailTotals.work_min), color: '#059669' },
              { label: 'שעות נוספות', value: minToHHMM(detailTotals.ot_min),   color: '#F59E0B' },
            ].map(c => (
              <div key={c.label} style={{
                flex: 1, background: '#fff', border: '1px solid var(--border, #E5E7EB)',
                borderRadius: 12, padding: '14px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Hint */}
          <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
            <i className="ti ti-info-circle" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> ימים עם מספר כניסות מסומנים — לחץ על השורה לפירוט
          </p>

          <div className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>כניסה ראשונה</th>
                  <th>יציאה אחרונה</th>
                  <th>שעות נטו</th>
                  <th>שעות נוספות</th>
                  <th>הערות</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => <DayRow key={`${r.user_id}|${r.date}|${i}`} row={r} />)}
                {/* Totals row */}
                <tr className="att-report-total-row">
                  <td>סה"כ ({detailTotals.days} ימים)</td>
                  <td>—</td>
                  <td>—</td>
                  <td style={{ fontWeight: 800 }}>{minToHHMM(detailTotals.work_min)}</td>
                  <td>{minToHHMM(detailTotals.ot_min)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          SUMMARY MODE — one row per employee
          ════════════════════════════════════════════════════*/}
      {!isLoading && !isDetailMode && totals.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
            <i className="ti ti-info-circle" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> לחץ על שם עובד לצפייה בפירוט יומי
          </p>
          <div className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>שם עובד</th>
                  <th>מחלקה</th>
                  <th>ימי עבודה</th>
                  <th>שעות נטו</th>
                  <th>ש"נ</th>
                  <th>איחורים</th>
                  <th>מחלה</th>
                  <th>חופשה</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {totals.map(t => (
                  <EmployeeSummaryRow
                    key={t.user_id}
                    t={t}
                    onClick={() => setUserId(t.user_id)}
                  />
                ))}
                <tr className="att-report-total-row">
                  <td colSpan={2}>סה"כ ({totals.length} עובדים)</td>
                  <td>{grand.days_worked}</td>
                  <td style={{ fontWeight: 800 }}>{minToHHMM(grand.total_work_min)}</td>
                  <td>{minToHHMM(grand.total_ot_min)}</td>
                  <td>{grand.late_count}</td>
                  <td>{grand.sick_days}</td>
                  <td>{grand.vacation_days}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
