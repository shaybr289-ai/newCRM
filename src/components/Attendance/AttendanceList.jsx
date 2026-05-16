import { useState } from 'react';
import { useAttendanceSessions } from '../../hooks/useAttendance';
import AttendanceSessionModal from './AttendanceSessionModal';

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function minToHHMM(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2,'0')}`;
}

const ANOMALY_LABELS = { late_arrival:'איחור', early_departure:'יציאה מוקדמת', outside_geofence:'מחוץ לאזור', no_gps:'ללא GPS' };

export default function AttendanceList() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [userId, setUserId] = useState('');
  const [hasAnomaly, setHasAnomaly] = useState(false);
  const [page, setPage] = useState(1);
  const [editSession, setEditSession] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useAttendanceSessions({ page, month, year, userId: userId || undefined, hasAnomaly: hasAnomaly || undefined });
  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  return (
    <div>
      {/* Filters */}
      <div className="att-filters">
        <div>
          <label className="att-label">חודש</label>
          <select className="att-input" value={month} onChange={e => { setMonth(+e.target.value); setPage(1); }}>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="att-label">שנה</label>
          <select className="att-input" value={year} onChange={e => { setYear(+e.target.value); setPage(1); }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="att-label">אנומליות בלבד</label>
          <select className="att-input" value={hasAnomaly ? 'true' : ''} onChange={e => { setHasAnomaly(e.target.value === 'true'); setPage(1); }}>
            <option value="">הכל</option>
            <option value="true">עם אנומליות</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 'auto' }}>
          + הוסף רשומה
        </button>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
        {total} רשומות
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-2)', fontSize: 13 }}>טוען...</p>
      ) : (
        <div className="att-table-wrap">
          <table className="att-table">
            <thead>
              <tr>
                <th>מס'</th>
                <th>עובד</th>
                <th>תאריך</th>
                <th>כניסה</th>
                <th>יציאה</th>
                <th>שעות נטו</th>
                <th>הפסקות</th>
                <th>ש"נ</th>
                <th>סוג</th>
                <th>לקוח</th>
                <th>אנומליות</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-2)', padding: 20 }}>אין נתונים</td></tr>
              )}
              {rows.map(s => (
                <tr key={s.id}>
                  <td><code style={{ fontSize: 11 }}>{s.session_num}</code></td>
                  <td>{s.first_name} {s.last_name}</td>
                  <td>{new Date(s.date).toLocaleDateString('he-IL')}</td>
                  <td>{s.clock_in_at ? new Date(s.clock_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{s.clock_out_at ? new Date(s.clock_out_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : <span className="att-badge clocked-in">פתוח</span>}</td>
                  <td>{minToHHMM(s.net_work_minutes)}</td>
                  <td>{s.break_minutes ? `${s.break_minutes} ד'` : '—'}</td>
                  <td>
                    {s.overtime_minutes > 0 && (
                      <span className={`att-badge ot-${s.overtime_status || 'pending'}`}>
                        {minToHHMM(s.overtime_minutes)}
                      </span>
                    )}
                  </td>
                  <td>{s.record_type === 'customer_visit' ? 'ביקור לקוח' : 'יום עבודה'}</td>
                  <td style={{ fontSize: 12 }}>{s.customer_name || (s.record_type === 'customer_visit' ? '—' : '')}</td>
                  <td>
                    {(s.anomalies || []).map(a => (
                      <span key={a} className="att-badge anomaly" style={{ marginInlineEnd: 3, marginBottom: 2 }}>
                        {ANOMALY_LABELS[a] || a}
                      </span>
                    ))}
                    {s.is_manual && <span className="att-badge manual">ידני</span>}
                  </td>
                  <td>
                    {s.clock_out_at
                      ? <span className="att-badge clocked-out">הושלם</span>
                      : <span className="att-badge clocked-in">פתוח</span>
                    }
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => setEditSession(s)}>
                      עריכה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>קודם</button>
          <span style={{ color: 'var(--text-2)', fontSize: 13, alignSelf: 'center' }}>{page} / {totalPages}</span>
          <button className="btn btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>הבא</button>
        </div>
      )}

      {(editSession || showCreate) && (
        <AttendanceSessionModal
          session={editSession}
          onClose={() => { setEditSession(null); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
