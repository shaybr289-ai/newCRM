const SOURCES = [
  {
    id: 'orders',
    label: 'הזמנות',
    icon: 'ti-shopping-cart',
    endpoint: '/api/orders',
    fields: [
      { key: 'status',       label: 'סטטוס',       type: 'text' },
      { key: 'created_at',   label: 'תאריך יצירה', type: 'date' },
      { key: 'total_amount', label: 'סכום כולל',   type: 'number' },
      { key: 'customer_id',  label: 'לקוח',        type: 'text' },
    ],
    metrics: [
      { key: 'count',                   label: 'ספירה (מס׳ רשומות)' },
      { key: 'sum:total_amount',        label: 'סכום הזמנות (₪)' },
      { key: 'avg:total_amount',        label: 'ממוצע הזמנה (₪)' },
    ],
    groupByOptions: [
      { key: 'status',     label: 'לפי סטטוס' },
      { key: 'created_at', label: 'לפי תאריך', periods: ['day','month','year'] },
    ],
  },
  {
    id: 'customers',
    label: 'לקוחות',
    icon: 'ti-users',
    endpoint: '/api/customers',
    fields: [
      { key: 'status',     label: 'סטטוס',       type: 'text' },
      { key: 'created_at', label: 'תאריך הצטרפות', type: 'date' },
      { key: 'region',     label: 'אזור',         type: 'text' },
    ],
    metrics: [
      { key: 'count', label: 'ספירת לקוחות' },
    ],
    groupByOptions: [
      { key: 'status',     label: 'לפי סטטוס' },
      { key: 'created_at', label: 'לפי תאריך', periods: ['month','year'] },
    ],
  },
  {
    id: 'tasks',
    label: 'משימות',
    icon: 'ti-checkbox',
    endpoint: '/api/tasks',
    fields: [
      { key: 'status',   label: 'סטטוס',    type: 'text' },
      { key: 'due_date', label: 'תאריך יעד', type: 'date' },
    ],
    metrics: [
      { key: 'count', label: 'ספירת משימות' },
    ],
    groupByOptions: [
      { key: 'status',   label: 'לפי סטטוס' },
      { key: 'due_date', label: 'לפי תאריך', periods: ['day','month'] },
    ],
  },
  {
    id: 'quotes',
    label: 'הצעות מחיר',
    icon: 'ti-file-invoice',
    endpoint: '/api/quotes',
    fields: [
      { key: 'status',     label: 'סטטוס',     type: 'text' },
      { key: 'created_at', label: 'תאריך',      type: 'date' },
      { key: 'total',      label: 'סכום כולל',  type: 'number' },
    ],
    metrics: [
      { key: 'count',      label: 'ספירת הצעות' },
      { key: 'sum:total',  label: 'סכום הצעות (₪)' },
    ],
    groupByOptions: [
      { key: 'status',     label: 'לפי סטטוס' },
      { key: 'created_at', label: 'לפי תאריך', periods: ['month','year'] },
    ],
  },
  {
    id: 'deals',
    label: 'עסקאות',
    icon: 'ti-briefcase',
    endpoint: '/api/deals',
    fields: [
      { key: 'stage',               label: 'שלב',           type: 'text' },
      { key: 'deal_type',           label: 'סוג עסקה',      type: 'text' },
      { key: 'owner',               label: 'סוכן',          type: 'text' },
      { key: 'priority',            label: 'עדיפות',        type: 'text' },
      { key: 'created_at',          label: 'תאריך יצירה',   type: 'date' },
      { key: 'expected_close_date', label: 'תאריך סגירה',   type: 'date' },
      { key: 'expected_one_time',   label: 'חד פעמי (₪)',   type: 'number' },
      { key: 'expected_recurring',  label: 'חודשי (₪)',     type: 'number' },
    ],
    metrics: [
      { key: 'count',                    label: 'ספירת עסקאות' },
      { key: 'sum:expected_one_time',    label: 'סכום חד פעמי (₪)' },
      { key: 'sum:expected_recurring',   label: 'סכום חודשי (₪)' },
      { key: 'avg:expected_one_time',    label: 'ממוצע חד פעמי (₪)' },
    ],
    groupByOptions: [
      { key: 'stage',               label: 'לפי שלב' },
      { key: 'deal_type',           label: 'לפי סוג עסקה' },
      { key: 'owner',               label: 'לפי סוכן' },
      { key: 'priority',            label: 'לפי עדיפות' },
      { key: 'created_at',          label: 'לפי תאריך יצירה', periods: ['month','year'] },
      { key: 'expected_close_date', label: 'לפי תאריך סגירה', periods: ['month','year'] },
    ],
  },
  {
    id: 'contacts',
    label: 'אנשי קשר',
    icon: 'ti-address-book',
    endpoint: '/api/contacts',
    fields: [
      { key: 'created_at', label: 'תאריך', type: 'date' },
    ],
    metrics: [{ key: 'count', label: 'ספירת אנשי קשר' }],
    groupByOptions: [
      { key: 'created_at', label: 'לפי תאריך', periods: ['month','year'] },
    ],
  },
  {
    id: 'service_agreements',
    label: 'הסכמי שירות',
    icon: 'ti-file-check',
    endpoint: '/api/service-agreements',
    fields: [
      { key: 'status',        label: 'סטטוס',          type: 'text' },
      { key: 'monthly_fee',   label: 'תשלום חודשי',    type: 'number' },
    ],
    metrics: [
      { key: 'count',            label: 'ספירת הסכמים' },
      { key: 'sum:monthly_fee',  label: 'סכום חודשי (₪)' },
    ],
    groupByOptions: [
      { key: 'status', label: 'לפי סטטוס' },
    ],
  },
  {
    id: 'attendance',
    label: 'נוכחות',
    icon: 'ti-clock',
    endpoint: '/api/attendance/sessions',
    fields: [
      { key: 'date',             label: 'תאריך',            type: 'date' },
      { key: 'net_work_minutes', label: 'דקות עבודה',       type: 'number' },
    ],
    metrics: [
      { key: 'count',                 label: 'ספירת יומנים' },
      { key: 'sum:net_work_minutes',  label: 'סה״כ דקות עבודה' },
    ],
    groupByOptions: [
      { key: 'date', label: 'לפי תאריך', periods: ['day','month'] },
    ],
  },
];

export { SOURCES };

export default function DataSourceSelector({ config, onChange }) {
  const source = SOURCES.find(s => s.endpoint === config?.endpoint) || null;

  const [metricField, metricAgg] = (config?.metric || 'count').includes(':')
    ? config.metric.split(':')
    : [config?.metric || 'count', null];

  const handleSource = (src) => {
    onChange({
      ...config,
      endpoint: src.endpoint,
      metric: src.metrics[0]?.key || 'count',
      groupBy: undefined,
      groupByPeriod: undefined,
    });
  };

  const handleMetric = (val) => onChange({ ...config, metric: val });

  const handleGroupBy = (val) => {
    if (!val) return onChange({ ...config, groupBy: undefined, groupByPeriod: undefined });
    const [field, period] = val.split(':');
    onChange({ ...config, groupBy: field, groupByPeriod: period || undefined });
  };

  const currentGroupBy = config?.groupBy
    ? `${config.groupBy}${config.groupByPeriod ? ':' + config.groupByPeriod : ''}`
    : '';

  return (
    <div className="cfg-section">
      <div className="cfg-label">מקור נתונים</div>
      <div className="cfg-source-grid">
        {SOURCES.map(s => (
          <button
            key={s.id}
            className={`cfg-source-btn${source?.id === s.id ? ' active' : ''}`}
            onClick={() => handleSource(s)}
            type="button"
          >
            <i className={`ti ${s.icon}`} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {source && (
        <>
          <div className="cfg-label" style={{ marginTop: 14 }}>מדד</div>
          <select
            className="cfg-select"
            value={config?.metric || ''}
            onChange={e => handleMetric(e.target.value)}
          >
            {source.metrics.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>

          <div className="cfg-label" style={{ marginTop: 14 }}>קיבוץ לפי</div>
          <select
            className="cfg-select"
            value={currentGroupBy}
            onChange={e => handleGroupBy(e.target.value)}
          >
            <option value="">ללא קיבוץ (ערך בודד)</option>
            {source.groupByOptions.map(g => {
              if (g.periods) {
                return g.periods.map(p => (
                  <option key={`${g.key}:${p}`} value={`${g.key}:${p}`}>
                    {g.label} — לפי {p === 'day' ? 'יום' : p === 'month' ? 'חודש' : 'שנה'}
                  </option>
                ));
              }
              return <option key={g.key} value={g.key}>{g.label}</option>;
            })}
          </select>

          <div className="cfg-label" style={{ marginTop: 14 }}>כותרת משנה (תצוגה)</div>
          <input
            className="cfg-input"
            value={config?.subtitle || ''}
            onChange={e => onChange({ ...config, subtitle: e.target.value })}
            placeholder="לדוגמה: כל הסוכנים, נכון להיום..."
          />
        </>
      )}
    </div>
  );
}
