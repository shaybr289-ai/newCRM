import { useState, useEffect } from 'react';
import { useAttendanceDashboard } from '../../hooks/useAttendance';

function minutesToHHMM(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2,'0')}`;
}

function durationSince(isoStr) {
  const diff = Math.round((Date.now() - new Date(isoStr)) / 60000);
  return minutesToHHMM(diff);
}

const ANOMALY_LABELS = {
  late_arrival: 'איחור',
  early_departure: 'יציאה מוקדמת',
  outside_geofence: 'מחוץ לאזור',
  no_gps: 'ללא GPS',
  missing_clock_out: 'חסר יציאה',
};

export default function AttendanceDashboard() {
  const { data, isLoading, refetch, error, dataUpdatedAt } = useAttendanceDashboard();
  const [lastRefresh, setLastRefresh] = useState('');

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastRefresh(new Date(dataUpdatedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [dataUpdatedAt]);

  if (isLoading) return <div className="att-loading">טוען...</div>;

  if (error) {
    return (
      <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: 20, color: '#991B1B' }}>
        <strong>שגיאה בטעינת הדשבורד</strong>
        <p style={{ margin: '8px 0 0', fontSize: 13 }}>{error?.message || 'נסה לרענן'}</p>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => refetch()}>נסה שוב</button>
      </div>
    );
  }

  const { clockedIn = [], missingClockOut = [], anomaliesToday = [] } = data || {};

  return (
    <div className="att-dashboard">
      {/* KPI cards */}
      <div className="att-kpi-row">
        <div className="att-kpi-card success">
          <div className="kpi-value">{clockedIn.length}</div>
          <div className="kpi-label">מחוברים כעת</div>
        </div>
        <div className={`att-kpi-card ${missingClockOut.length > 0 ? 'danger' : ''}`}>
          <div className="kpi-value">{missingClockOut.length}</div>
          <div className="kpi-label">חסרי דיווח יציאה</div>
        </div>
        <div className={`att-kpi-card ${anomaliesToday.length > 0 ? 'warning' : ''}`}>
          <div className="kpi-value">{anomaliesToday.length}</div>
          <div className="kpi-label">אנומליות היום</div>
        </div>
      </div>

      {/* Currently clocked in */}
      <div>
        <p className="att-section-title">עובדים מחוברים כעת</p>
        {clockedIn.length === 0 ? (
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>אין עובדים מחוברים</p>
        ) : (
          <div className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>עובד</th>
                  <th>מחלקה</th>
                  <th>שעת כניסה</th>
                  <th>שהייה</th>
                  <th>סוג</th>
                  <th>GPS</th>
                </tr>
              </thead>
              <tbody>
                {clockedIn.map(s => (
                  <tr key={s.id}>
                    <td>{s.first_name} {s.last_name}</td>
                    <td>{s.department || '—'}</td>
                    <td>{new Date(s.clock_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{durationSince(s.clock_in_at)}</td>
                    <td>{s.record_type === 'customer_visit' ? 'ביקור לקוח' : s.record_type === 'break' ? 'הפסקה' : 'יום עבודה'}</td>
                    <td>{s.geofence_valid ? <i className="ti ti-circle-check" aria-hidden="true" style={{ color: '#22c55e' }} /> : <i className="ti ti-alert-triangle" aria-hidden="true" style={{ color: '#f59e0b' }} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Missing clock-out */}
      {missingClockOut.length > 0 && (
        <div>
          <p className="att-section-title" style={{ color: '#EF4444' }}>חסרי דיווח יציאה (מעל 14 שעות)</p>
          <div className="att-table-wrap">
            <table className="att-table">
              <thead><tr><th>עובד</th><th>מס' רשומה</th><th>שעת כניסה</th></tr></thead>
              <tbody>
                {missingClockOut.map(s => (
                  <tr key={s.id}>
                    <td>{s.first_name} {s.last_name}</td>
                    <td>{s.session_num}</td>
                    <td>{new Date(s.clock_in_at).toLocaleString('he-IL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Anomalies today */}
      {anomaliesToday.length > 0 && (
        <div>
          <p className="att-section-title" style={{ color: '#F59E0B' }}>אנומליות היום</p>
          <div className="att-table-wrap">
            <table className="att-table">
              <thead><tr><th>עובד</th><th>אנומליות</th></tr></thead>
              <tbody>
                {anomaliesToday.map(s => (
                  <tr key={s.id}>
                    <td>{s.first_name} {s.last_name}</td>
                    <td>
                      {(s.anomalies || []).map(a => (
                        <span key={a} className="att-badge anomaly" style={{ marginInlineEnd: 4 }}>
                          {ANOMALY_LABELS[a] || a}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 8 }}>
        {lastRefresh && (
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>עודכן: {lastRefresh}</span>
        )}
        <button className="btn btn-secondary" onClick={() => refetch()} style={{ fontSize: 12 }}>
          <i className="ti ti-refresh" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> רענן
        </button>
      </div>
    </div>
  );
}
