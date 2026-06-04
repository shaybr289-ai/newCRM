export default function KpiCard({ chartData, config, style }) {
  const value = chartData?.[0]?.value ?? 0;
  const prev  = chartData?.[0]?.prevValue;
  const delta = (prev != null && prev !== 0) ? ((value - prev) / prev) * 100 : null;
  const positive = delta == null ? null : delta >= 0;

  const palette = style?.chartPalette || ['#7C3AED'];
  const fmt = (v) => {
    if (config?.format === 'currency') return `₪${Number(v).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
    if (config?.format === 'percent') return `${Number(v).toFixed(1)}%`;
    return Number(v).toLocaleString('he-IL', { maximumFractionDigits: 0 });
  };

  return (
    <div className="kpi-inner">
      <div className="kpi-value" style={{ color: palette[0] }}>{fmt(value)}</div>
      {delta !== null && (
        <div className="kpi-delta" style={{
          color: positive
            ? (style?.conditionalColors?.positive || '#10B981')
            : (style?.conditionalColors?.negative || '#EF4444'),
        }}>
          <i className={`ti ti-trending-${positive ? 'up' : 'down'}`} />
          {Math.abs(delta).toFixed(1)}%
          <span className="kpi-vs">לעומת תקופה קודמת</span>
        </div>
      )}
      {config?.subtitle && <div className="kpi-subtitle">{config.subtitle}</div>}
    </div>
  );
}
