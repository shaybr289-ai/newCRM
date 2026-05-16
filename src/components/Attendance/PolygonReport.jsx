import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useGeofenceZones, usePolygonReport } from '../../hooks/useAttendance';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

function fmtMin(min) {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function PolygonReport() {
  const { data: zonesData } = useGeofenceZones();
  const zones = zonesData?.data || [];

  const [zoneId, setZoneId] = useState('');
  const [from, setFrom] = useState(todayISO(-30));
  const [to, setTo] = useState(todayISO());
  const [userId, setUserId] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['attendance-users'],
    queryFn: () => api.get('/api/attendance/users'),
  });
  const users = usersData?.data || [];

  const { data, isLoading } = usePolygonReport({ zoneId: zoneId || undefined, from, to, userId: userId || undefined });

  const summary = data?.summary || [];
  const sessions = data?.sessions || [];

  const exportExcel = () => {
    const rows = sessions.map(s => ({
      'אזור': s.zone_name || '(לא בתוך אזור)',
      'מספר רשומה': s.session_num,
      'עובד': s.user_name,
      'מחלקה': s.department || '',
      'סוג': s.record_type === 'customer_visit' ? 'ביקור לקוח' : 'יום עבודה',
      'לקוח': s.customer_name || '',
      'תאריך': s.date,
      'כניסה': fmtDateTime(s.clock_in_at),
      'יציאה': fmtDateTime(s.clock_out_at),
      'שעות נטו': fmtMin(s.net_work_minutes),
      'תקין': s.geofence_valid ? 'כן' : 'לא',
      'GPS כניסה': s.clock_in_lat ? `${s.clock_in_lat.toFixed(5)}, ${s.clock_in_lng.toFixed(5)}` : '',
      'אנומליות': Array.isArray(s.anomalies) ? s.anomalies.join(', ') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!views'] = [{ RTL: true }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'דוח פוליגון');
    const fname = `polygon_report_${zoneId ? zones.find(z => z.id === zoneId)?.name + '_' : ''}${from}_${to}.xlsx`;
    XLSX.writeFile(wb, fname);
  };

  return (
    <div>
      <p className="att-section-title">דוח נוכחות לפי פוליגון</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20, padding: 16, background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <div style={{ minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>אזור</label>
          <select className="att-input" value={zoneId} onChange={e => setZoneId(e.target.value)}>
            <option value="">-- כל האזורים --</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}{z.enforce ? ' (אכוף)' : ''}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>מתאריך</label>
          <input type="date" className="att-input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>עד תאריך</label>
          <input type="date" className="att-input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div style={{ minWidth: 180 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>עובד</label>
          <select className="att-input" value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">-- כל העובדים --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name || ''}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={exportExcel} disabled={!sessions.length}>
          <i className="ti ti-chart-bar" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> ייצא לאקסל ({sessions.length})
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-2)', textAlign: 'center', padding: 30 }}>טוען...</p>
      ) : (
        <>
          {/* Summary cards by zone */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
            {summary.map(z => (
              <div key={z.zone_id} style={{
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                ...(zoneId === z.zone_id ? { borderColor: '#3B82F6', boxShadow: '0 0 0 2px #DBEAFE' } : {}),
              }} onClick={() => setZoneId(zoneId === z.zone_id ? '' : z.zone_id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{z.zone_name}</strong>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: z.enforce ? '#FEE2E2' : '#FEF3C7', color: z.enforce ? '#991B1B' : '#92400E' }}>
                    {z.enforce ? <><i className="ti ti-lock" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> אכוף</> : <><i className="ti ti-alert-triangle" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> אזהרה</>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  <span>דיווחים</span><strong style={{ color: '#111827' }}>{z.total_reports}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  <span>הושלמו</span><strong style={{ color: '#111827' }}>{z.completed}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  <span>עובדים שונים</span><strong style={{ color: '#111827' }}>{z.unique_users}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  <span>שעות סה"כ</span><strong style={{ color: '#059669' }}>{fmtMin(z.total_minutes)}</strong>
                </div>
              </div>
            ))}
            {summary.length === 0 && (
              <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-2)', padding: 20 }}>
                אין אזורים מוגדרים. צור אזור חדש בטאב "הגדרות".
              </p>
            )}
          </div>

          {/* Sessions table */}
          <div className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>אזור</th>
                  <th>עובד</th>
                  <th>סוג</th>
                  <th>תאריך</th>
                  <th>כניסה</th>
                  <th>יציאה</th>
                  <th>שעות נטו</th>
                  <th>תקין</th>
                  <th>אנומליות</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>{s.zone_name || <span style={{ color: '#EF4444' }}>(מחוץ לאזור)</span>}</td>
                    <td>{s.user_name}{s.customer_name ? ` (${s.customer_name})` : ''}</td>
                    <td>{s.record_type === 'customer_visit' ? <><i className="ti ti-building" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> ביקור</> : <><i className="ti ti-briefcase" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> עבודה</>}</td>
                    <td>{s.date}</td>
                    <td>{fmtDateTime(s.clock_in_at)}</td>
                    <td>{fmtDateTime(s.clock_out_at) || <span style={{ color: '#F59E0B' }}>פתוח</span>}</td>
                    <td>{fmtMin(s.net_work_minutes)}</td>
                    <td>{s.geofence_valid ? <i className="ti ti-circle-check" aria-hidden="true" style={{ color: '#22c55e' }} /> : <i className="ti ti-alert-triangle" aria-hidden="true" style={{ color: '#f59e0b' }} />}</td>
                    <td style={{ fontSize: 11 }}>{Array.isArray(s.anomalies) ? s.anomalies.join(', ') : ''}</td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-2)', padding: 30 }}>אין דיווחים בטווח שנבחר</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
