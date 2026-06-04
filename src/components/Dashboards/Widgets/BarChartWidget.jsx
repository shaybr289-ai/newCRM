import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList,
} from 'recharts';

const DEFAULT_PALETTE = ['#7C3AED','#10B981','#F97316','#3B82F6','#EAB308','#EF4444'];

export default function BarChartWidget({ chartData, config, style, widgetType }) {
  const palette = style?.chartPalette || DEFAULT_PALETTE;
  const isHorizontal = widgetType === 'column_chart';
  const showGrid  = style?.showGrid  ?? true;
  const showLegend = style?.showLegend ?? false;

  const fmt = (v) => {
    if (config?.format === 'currency') return `₪${Number(v).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
    return Number(v).toLocaleString('he-IL', { maximumFractionDigits: 0 });
  };

  if (!chartData?.length) {
    return <div className="widget-empty">אין נתונים להצגה</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={!isHorizontal}
            horizontal={isHorizontal}
          />
        )}
        {isHorizontal ? (
          <>
            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
            <YAxis dataKey="label" type="category" width={90} tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: 'var(--text-2)' }} width={60} />
          </>
        )}
        <Tooltip
          formatter={(v) => [fmt(v), config?.metricLabel || 'ערך']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        <Bar dataKey="value" radius={isHorizontal ? [0,4,4,0] : [4,4,0,0]} maxBarSize={48}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
          <LabelList
            dataKey="value"
            position={isHorizontal ? 'right' : 'top'}
            formatter={fmt}
            style={{ fontSize: 11, fill: 'var(--text-2)', fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
