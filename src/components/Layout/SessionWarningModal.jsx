export default function SessionWarningModal({ secondsLeft, onStayActive }) {
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = minutes > 0
    ? `${minutes}:${String(secs).padStart(2, '0')} דקות`
    : `${secs} שניות`;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, direction: 'rtl',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 32, width: 380, maxWidth: '90vw',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#FEF3C7', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text-1)' }}>
          פג תוקף הפעילות בקרוב
        </h2>
        <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
          לא זוהתה פעילות. המערכת תנתק אותך בעוד:
        </p>
        <div style={{
          fontSize: 32, fontWeight: 800, color: secondsLeft <= 30 ? '#EF4444' : '#D97706',
          margin: '12px 0 20px', fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.3s',
        }}>
          {timeStr}
        </div>

        <button
          onClick={onStayActive}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10,
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          שמור אותי מחובר
        </button>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
          כל פעולה במערכת תאפס את הטיימר אוטומטית
        </p>
      </div>
    </div>
  );
}
