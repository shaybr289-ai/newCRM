import { useState } from 'react';
import { useMyAttendance } from '../../hooks/useAttendance';

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const DAYS_HE = ['א','ב','ג','ד','ה','ו','ש'];

function minToHHMM(min) {
  if (!min) return '0:00';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2,'0')}`;
}

const ABSENCE_LABELS = { sick: 'מחלה', vacation: 'חופשה', holiday: 'חג', personal: 'אישי', other: 'אחר' };

export default function MyAttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useMyAttendance({ month, year });
  const sessions = data?.sessions || [];
  const absences = data?.absences || [];
  const summary = data?.summary || {};

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) years.push(y);

  // Build sessions/absence map keyed by date string
  const sessionMap = {};
  for (const s of sessions) {
    const d = s.date?.slice(0,10);
    if (!sessionMap[d]) sessionMap[d] = [];
    sessionMap[d].push(s);
  }
  const absenceMap = {};
  for (const a of absences) absenceMap[a.date?.slice(0,10)] = a;

  // Build calendar days for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const calDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(year, month - 1, d).getDay();
    const daySessions = sessionMap[dateStr] || [];
    const absence = absenceMap[dateStr];
    const isToday = dateStr === now.toISOString().slice(0,10);
    const isFuture = new Date(dateStr) > now;
    const isWeekend = dow === 6; // Saturday
    const netMin = daySessions.reduce((s, r) => s + (r.net_work_minutes || 0), 0);
    calDays.push({ d, dateStr, dow, daySessions, absence, isToday, isFuture, isWeekend, netMin });
  }

  // Padding before first day
  const padding = Array(firstDow).fill(null);

  return (
    <div>
      {/* Month picker */}
      <div className="att-filters" style={{ marginBottom: 20 }}>
        <div>
          <label className="att-label">חודש</label>
          <select className="att-input" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="att-label">שנה</label>
          <select className="att-input" value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="att-summary-bar">
        <div className="att-summary-item">
          <div className="label">סה"כ שעות</div>
          <div className="value">{minToHHMM(summary.totalNetMin)}</div>
        </div>
        <div className="att-summary-item">
          <div className="label">ימי עבודה</div>
          <div className="value">{summary.daysWorked || 0}</div>
        </div>
        <div className="att-summary-item">
          <div className="label">איחורים</div>
          <div className="value" style={{ color: summary.lateCount > 0 ? '#F59E0B' : undefined }}>
            {summary.lateCount || 0}
          </div>
        </div>
      </div>

      {isLoading && <p style={{ color: 'var(--text-2)' }}>טוען...</p>}

      {!isLoading && (
        <>
          {/* Day-of-week header */}
          <div className="att-calendar" style={{ marginBottom: 6 }}>
            {DAYS_HE.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-2)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="att-calendar">
            {padding.map((_, i) => <div key={`pad-${i}`} />)}
            {calDays.map(({ d, dateStr, daySessions, absence, isToday, isFuture, isWeekend, netMin }) => {
              let cls = 'att-day-cell';
              if (isToday) cls += ' today';
              else if (isFuture) cls += ' future';
              else if (isWeekend) cls += ' weekend';
              else if (daySessions.length > 0) cls += ' present';
              else if (absence) cls += ' absent';

              return (
                <div key={dateStr} className={cls} title={absence ? ABSENCE_LABELS[absence.absence_type] : ''}>
                  <span className="day-num">{d}</span>
                  {netMin > 0 && <span className="day-hrs">{minToHHMM(netMin)}</span>}
                  {absence && !isFuture && (
                    <span style={{ fontSize: 9, color: '#991B1B' }}>{ABSENCE_LABELS[absence.absence_type]}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Session list */}
          {sessions.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p className="att-section-title">פירוט דיווחים</p>
              <div className="att-table-wrap">
                <table className="att-table">
                  <thead>
                    <tr>
                      <th>תאריך</th>
                      <th>כניסה</th>
                      <th>יציאה</th>
                      <th>שעות נטו</th>
                      <th>הפסקות</th>
                      <th>שעות נוספות</th>
                      <th>סוג</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id}>
                        <td>{new Date(s.date).toLocaleDateString('he-IL')}</td>
                        <td>{s.clock_in_at ? new Date(s.clock_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td>{s.clock_out_at ? new Date(s.clock_out_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : <span className="att-badge clocked-in">פתוח</span>}</td>
                        <td>{minToHHMM(s.net_work_minutes)}</td>
                        <td>{s.break_minutes ? `${s.break_minutes}'` : '—'}</td>
                        <td>
                          {s.overtime_minutes > 0
                            ? <span className={`att-badge ot-${s.overtime_status || 'pending'}`}>{minToHHMM(s.overtime_minutes)}</span>
                            : '—'}
                        </td>
                        <td>{s.record_type === 'customer_visit' ? 'ביקור לקוח' : 'יום עבודה'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
