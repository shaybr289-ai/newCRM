import { useState } from 'react';
import { useAttendanceSessions, useApproveOvertime } from '../../hooks/useAttendance';

function minToHHMM(min) {
  if (!min) return '0:00';
  return `${Math.floor(min/60)}:${String(min%60).padStart(2,'0')}`;
}

export default function OvertimePanel() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [notesMap, setNotesMap] = useState({});
  const approve = useApproveOvertime();

  const { data, isLoading } = useAttendanceSessions({ month, year, limit: 200 });
  const rows = (data?.data || []).filter(r => r.overtime_minutes > 0 && r.overtime_status === 'pending');

  const handle = async (id, decision) => {
    try {
      await approve.mutateAsync({ id, decision, notes: notesMap[id] || '' });
    } catch {}
  };

  const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const years = [now.getFullYear(), now.getFullYear()-1, now.getFullYear()-2];

  return (
    <div>
      <div className="att-filters" style={{ marginBottom: 16 }}>
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

      {isLoading ? <p style={{ color: 'var(--text-2)' }}>טוען...</p> : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
            {rows.length} רשומות ממתינות לאישור
          </p>
          <div className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr><th>עובד</th><th>תאריך</th><th>שעות נטו</th><th>ש"נ</th><th>הערה מנהל</th><th>פעולה</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-2)' }}>אין שעות נוספות ממתינות</td></tr>
                )}
                {rows.map(s => (
                  <tr key={s.id} className="overtime-row">
                    <td>{s.first_name} {s.last_name}</td>
                    <td>{new Date(s.date).toLocaleDateString('he-IL')}</td>
                    <td>{minToHHMM(s.net_work_minutes)}</td>
                    <td><span className="att-badge ot-pending">{minToHHMM(s.overtime_minutes)}</span></td>
                    <td>
                      <input className="att-input" style={{ maxWidth: 180 }}
                        placeholder="הערה (אופציונלי)"
                        value={notesMap[s.id] || ''}
                        onChange={e => setNotesMap(m => ({ ...m, [s.id]: e.target.value }))}
                      />
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 12px' }}
                        onClick={() => handle(s.id, 'approved')} disabled={approve.isPending}>
                        אשר
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 12px' }}
                        onClick={() => handle(s.id, 'rejected')} disabled={approve.isPending}>
                        דחה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
