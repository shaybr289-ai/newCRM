import { useState, useEffect } from 'react';
import { useAttendanceStatus, useClockIn, useClockOut, useBreakStart, useBreakEnd } from '../../hooks/useAttendance';

function fmt(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function getBrowserGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 30000 }
    );
  });
}

export default function MyClockWidget() {
  const { data, isLoading } = useAttendanceStatus();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const session = data?.session;
  const activeBreak = data?.activeBreak;
  const state = !session ? 'out' : activeBreak ? 'break' : 'in';

  useEffect(() => {
    if (!session?.clock_in_at) return;
    const update = () => setElapsed(Math.round((Date.now() - new Date(session.clock_in_at)) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [session?.clock_in_at]);

  const handleClockIn = async () => {
    setError('');
    try {
      const gps = await getBrowserGPS();
      await clockIn.mutateAsync({ lat: gps?.lat, lng: gps?.lng, accuracy: gps?.accuracy });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'שגיאה בדיווח כניסה';
      setError(msg);
    }
  };

  const handleClockOut = async () => {
    setError('');
    try {
      const gps = await getBrowserGPS();
      await clockOut.mutateAsync({ lat: gps?.lat, lng: gps?.lng });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'שגיאה';
      setError(msg);
    }
  };

  const handleBreakStart = async () => {
    setError('');
    try { await breakStart.mutateAsync({}); } catch (err) { setError(err?.message); }
  };
  const handleBreakEnd = async () => {
    setError('');
    try { await breakEnd.mutateAsync({ breakId: activeBreak?.id }); } catch (err) { setError(err?.message); }
  };

  const busy = clockIn.isPending || clockOut.isPending || breakStart.isPending || breakEnd.isPending;
  const cardBg = state === 'in' ? '#D1FAE5' : state === 'break' ? '#FEF3C7' : '#F3F4F6';
  const cardBorder = state === 'in' ? '#6EE7B7' : state === 'break' ? '#FCD34D' : '#D1D5DB';

  if (isLoading) return null;

  return (
    <div style={{
      background: cardBg,
      border: `2px solid ${cardBorder}`,
      borderRadius: 14,
      padding: '16px 20px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 32 }}>
          {state === 'in'
            ? <i className="ti ti-circle-check" aria-hidden="true" style={{ color: '#22c55e' }} />
            : state === 'break'
              ? <i className="ti ti-coffee" aria-hidden="true" style={{ color: '#f59e0b' }} />
              : <i className="ti ti-circle-filled" aria-hidden="true" style={{ color: '#ef4444' }} />}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            {state === 'in' ? 'במצב כניסה לעבודה' : state === 'break' ? 'בהפסקה' : 'לא מדווח כעת'}
          </div>
          {session && (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              כניסה: {new Date(session.clock_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              <span style={{ fontWeight: 600, color: '#059669' }}>שהייה: {fmt(elapsed)}</span>
              {session.session_num && <span style={{ marginInlineStart: 8, fontSize: 11 }}>#{session.session_num}</span>}
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {state === 'out' && (
          <button onClick={handleClockIn} disabled={busy}
            style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
            ▶ כניסה לעבודה
          </button>
        )}
        {state === 'in' && (
          <>
            <button onClick={handleBreakStart} disabled={busy}
              style={{ background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>
              <i className="ti ti-coffee" aria-hidden="true" style={{ marginLeft: 4 }} /> הפסקה
            </button>
            <button onClick={handleClockOut} disabled={busy}
              style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
              <i className="ti ti-player-stop" aria-hidden="true" style={{ marginLeft: 4 }} /> יציאה
            </button>
          </>
        )}
        {state === 'break' && (
          <button onClick={handleBreakEnd} disabled={busy}
            style={{ background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
            ▶ סיים הפסקה
          </button>
        )}
      </div>
    </div>
  );
}
