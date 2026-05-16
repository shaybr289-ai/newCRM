/**
 * Reusable stats cards bar — displays at the top of module pages
 * Usage: <StatsBar stats={[{ label: 'Total', value: 42, color: 'var(--accent)' }, ...]} />
 */
export default function StatsBar({ stats }) {
  if (!stats || stats.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 6)}, 1fr)`, gap: 12, marginBottom: 16 }}>
      {stats.map(s => (
        <div key={s.label} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: s.color || 'var(--accent)' }}>{s.value}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
