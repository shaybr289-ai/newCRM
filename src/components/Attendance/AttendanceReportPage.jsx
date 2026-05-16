import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useAttendanceReport } from '../../hooks/useAttendance';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function minToHHMM(min) {
  if (min == null || min === 0) return '0:00';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}:${String(m).padStart(2,'0')}`;
}

const ABSENCE_LABELS = { sick: 'מחלה', vacation: 'חופשה', holiday: 'חג', personal: 'אישי', other: 'אחר' };
const ANOMALY_LABELS = { late_arrival: 'איחור', early_departure: 'יציאה מוקדמת', outside_geofence: 'מחוץ לאזור', no_gps: 'ללא GPS' };
const DOW_HE = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

export default function AttendanceReportPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [userId, setUserId] = useState('');
  const [customerId, setCustomerId] = useState('');

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  // Fetch active users for filter dropdown
  const { data: usersData } = useQuery({
    queryKey: ['attendance-users'],
    queryFn: () => api.get('/api/attendance/users'),
  });
  const users = usersData?.data || [];

  // Fetch customers for filter dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => api.get('/api/customers?limit=500'),
  });
  const customers = customersData?.data || customersData || [];

  const { data, isLoading, refetch, error } = useAttendanceReport({ month, year, userId: userId || undefined, customerId: customerId || undefined });
  const rows = data?.rows || [];
  const totals = data?.totals || [];

  // Group rows by user
  const byUser = {};
  for (const r of rows) {
    if (!byUser[r.user_id]) byUser[r.user_id] = { meta: { user_name: r.user_name, department: r.department }, rows: [] };
    byUser[r.user_id].rows.push(r);
  }
  const userIds = Object.keys(byUser);

  const exportExcel = () => {
    if (rows.length === 0) return;
    const wsData = [
      ['שם עובד','מחלקה','תאריך','יום','שעת כניסה','שעת יציאה','שעות נטו','הפסקות (ד)','שעות נוספות','סטטוס ש"נ','ביקורי לקוח','היעדרות','אנומליות'],
    ];
    const totalsMap = {};
    for (const t of totals) totalsMap[t.user_id] = t;

    for (const uid of userIds) {
      const { meta, rows: uRows } = byUser[uid];
      for (const r of uRows) {
        const dow = r.date ? DOW_HE[new Date(r.date).getDay()] : '';
        wsData.push([
          meta.user_name,
          meta.department || '',
          r.date ? new Date(r.date).toLocaleDateString('he-IL') : '',
          dow,
          r.first_in ? new Date(r.first_in).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '',
          r.last_out ? new Date(r.last_out).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '',
          minToHHMM(r.work_min),
          r.break_min ? minToHHMM(r.break_min) : '',
          minToHHMM(r.ot_min),
          r.ot_pending ? 'ממתין' : '',
          r.visit_count || 0,
          r.absence_type ? ABSENCE_LABELS[r.absence_type] : '',
          (r.anomalies || []).map(a => ANOMALY_LABELS[a.replace(/"/g,'')] || a).join(', '),
        ]);
      }
      // Summary row per user — compute from rows so it matches the displayed table
      const t = totalsMap[uid];
      const exWorkMin  = uRows.reduce((a, r) => a + Math.max(0, Number(r.work_min)  || 0), 0);
      const exOtMin    = uRows.reduce((a, r) => a + Math.max(0, Number(r.ot_min)    || 0), 0);
      wsData.push([
        `סה"כ - ${meta.user_name}`, meta.department || '', '', '', '', '',
        minToHHMM(exWorkMin), '', minToHHMM(exOtMin), '',
        '', `מחלה: ${t?.sick_days ?? 0} | חופשה: ${t?.vacation_days ?? 0}`,
        `ימי עבודה: ${uRows.length} | איחורים: ${t?.late_count ?? 0}`,
      ]);
      wsData.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = wsData[0].map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'נוכחות');
    XLSX.writeFile(wb, `נוכחות_${MONTHS[month-1]}_${year}${userId ? '_' + (users.find(u=>u.id===userId)?.last_name||'') : ''}.xlsx`);
  };

  return (
    <div>
      {/* Filters */}
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
        <div style={{ minWidth: 180 }}>
          <label className="att-label">עובד</label>
          <select className="att-input" value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">-- כל העובדים --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name || ''}{u.department ? ` (${u.department})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <label className="att-label">לקוח</label>
          <select className="att-input" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">-- כל הלקוחות --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.company_name || c.name || c.cust_num || c.id}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 'auto' }} onClick={() => refetch()}>
          הפק דוח
        </button>
        <button className="btn btn-secondary" style={{ marginTop: 'auto' }} onClick={exportExcel} disabled={rows.length === 0}>
          ייצוא Excel
        </button>
      </div>

      {isLoading && <p style={{ color: 'var(--text-2)' }}>טוען...</p>}

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: 14, color: '#991B1B', fontSize: 13, marginBottom: 16 }}>
          שגיאה בטעינת הדוח: {error?.message || 'נסה שוב'}
        </div>
      )}

      {!isLoading && !error && userIds.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: 40 }}>אין נתונים לתקופה שנבחרה</p>
      )}

      {!isLoading && userIds.map(uid => {
        const { meta, rows: uRows } = byUser[uid];
        const t = totals.find(x => x.user_id === uid);
        // Compute work/break/ot totals client-side from displayed rows so the summary
        // always matches the table values exactly, regardless of server-side edge cases.
        const rowWorkMin  = uRows.reduce((acc, r) => acc + Math.max(0, Number(r.work_min)  || 0), 0);
        const rowBreakMin = uRows.reduce((acc, r) => acc + Math.max(0, Number(r.break_min) || 0), 0);
        const rowOtMin    = uRows.reduce((acc, r) => acc + Math.max(0, Number(r.ot_min)    || 0), 0);
        return (
          <div key={uid} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p className="att-section-title" style={{ margin: 0 }}>
                {meta.user_name} {meta.department ? `· ${meta.department}` : ''}
              </p>
              {t && (
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  סה"כ: {minToHHMM(rowWorkMin)} | ימי עבודה: {t.days_worked} | ש"נ: {minToHHMM(rowOtMin)} | איחורים: {t.late_count}
                </span>
              )}
            </div>
            <div className="att-table-wrap">
              <table className="att-table">
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>יום</th>
                    <th>כניסה</th>
                    <th>יציאה</th>
                    <th>שעות נטו</th>
                    <th>הפסקות</th>
                    <th>ש"נ</th>
                    <th>ביקורי לקוח</th>
                    <th>היעדרות</th>
                    <th>אנומליות</th>
                  </tr>
                </thead>
                <tbody>
                  {uRows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.date ? new Date(r.date).toLocaleDateString('he-IL') : '—'}</td>
                      <td>{r.date ? DOW_HE[new Date(r.date).getDay()] : ''}</td>
                      <td>{r.first_in ? new Date(r.first_in).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{r.last_out ? new Date(r.last_out).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{minToHHMM(r.work_min)}</td>
                      <td>{r.break_min ? minToHHMM(r.break_min) : '—'}</td>
                      <td>
                        {r.ot_min > 0 && (
                          <span className={`att-badge ot-${r.ot_pending ? 'pending' : 'approved'}`}>
                            {minToHHMM(r.ot_min)}
                          </span>
                        )}
                      </td>
                      <td>{r.visit_count || '—'}</td>
                      <td>{r.absence_type ? ABSENCE_LABELS[r.absence_type] : '—'}</td>
                      <td>
                        {(r.anomalies || []).map(a => {
                          const key = String(a).replace(/"/g, '');
                          return <span key={key} className="att-badge anomaly" style={{ marginInlineEnd: 3 }}>{ANOMALY_LABELS[key] || key}</span>;
                        })}
                      </td>
                    </tr>
                  ))}
                  {(t || uRows.length > 0) && (
                    <tr className="att-report-total-row">
                      <td colSpan={4}>סיכום</td>
                      <td>{minToHHMM(rowWorkMin)}</td>
                      <td>{rowBreakMin > 0 ? minToHHMM(rowBreakMin) : '—'}</td>
                      <td>{minToHHMM(rowOtMin)}</td>
                      <td>—</td>
                      <td>מחלה: {t?.sick_days ?? 0} | חופשה: {t?.vacation_days ?? 0}</td>
                      <td>איחורים: {t?.late_count ?? 0}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
