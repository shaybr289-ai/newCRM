import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

// ── Client-side aggregation ───────────────────────────────────────────────────

function computeMetric(rows, metric, metricField) {
  if (!rows?.length) return 0;
  switch (metric) {
    case 'sum': return rows.reduce((acc, r) => acc + (parseFloat(r[metricField]) || 0), 0);
    case 'avg': return rows.reduce((acc, r) => acc + (parseFloat(r[metricField]) || 0), 0) / rows.length;
    default:    return rows.length; // 'count'
  }
}

function formatGroupKey(value, period) {
  if (!value) return 'ללא';
  if (!period) return String(value);
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  if (period === 'month') {
    return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'short' });
  }
  if (period === 'day') return d.toLocaleDateString('he-IL');
  if (period === 'year') return String(d.getFullYear());
  return String(value);
}

function aggregateRows(rows, config) {
  const { metric = 'count', metricField, groupBy, groupByPeriod } = config;

  if (!groupBy) {
    return [{ label: 'סה"כ', value: computeMetric(rows, metric, metricField) }];
  }

  const groups = {};
  for (const row of rows) {
    const key = formatGroupKey(row[groupBy], groupByPeriod);
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  const entries = Object.entries(groups).map(([label, g]) => ({
    label,
    value: computeMetric(g, metric, metricField),
  }));

  // Sort chronologically when grouping by time, otherwise by value desc
  if (groupByPeriod) {
    entries.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    entries.sort((a, b) => b.value - a.value);
  }

  return entries.slice(0, config.limit || 20);
}

// ── Variable resolution ───────────────────────────────────────────────────────

function resolveVariables(value, globalFilters = {}) {
  if (typeof value !== 'string') return value;
  const now = new Date();
  const map = {
    '{{global_date_from}}':     globalFilters.dateFrom || '',
    '{{global_date_to}}':       globalFilters.dateTo   || '',
    '{{current_user}}':         globalFilters.userId   || '',
    '{{selected_customer}}':    globalFilters.customerId || '',
    '{{last_7_days}}':          new Date(now - 7*86400000).toISOString().slice(0,10),
    '{{last_30_days}}':         new Date(now - 30*86400000).toISOString().slice(0,10),
    '{{current_month_start}}':  new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10),
    '{{current_year_start}}':   `${now.getFullYear()}-01-01`,
  };
  return map[value] ?? value;
}

function buildQueryString(config, globalFilters) {
  const params = new URLSearchParams();
  params.set('limit', config.fetchLimit || 5000);

  for (const f of (config.filters || [])) {
    const val = resolveVariables(f.value, globalFilters);
    if (!val && val !== 0) continue;
    // Encode as simple key=value for existing endpoints that support it
    if (f.op === 'eq' || f.op === 'in') params.set(f.field, val);
    if (f.op === 'gte') params.set(`${f.field}From`, val);
    if (f.op === 'lte') params.set(`${f.field}To`, val);
  }
  // Apply global filters directly to every widget request (in addition to per-widget {{variable}} filters)
  if (globalFilters.dateFrom) params.set('dateFrom', globalFilters.dateFrom);
  if (globalFilters.dateTo) params.set('dateTo', globalFilters.dateTo);
  if (globalFilters.userId) params.set('owner_id', globalFilters.userId);
  return params.toString();
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useWidgetData(config, globalFilters = {}) {
  const endpoint = config?.endpoint;
  const qs = endpoint ? buildQueryString(config, globalFilters) : '';

  const { data: raw, isLoading, error } = useQuery({
    queryKey: ['widget-data', endpoint, qs, config?.metric, config?.groupBy],
    queryFn: () => api.get(`${endpoint}?${qs}`),
    enabled: !!endpoint,
    staleTime: 60_000,
  });

  const rows = raw?.data || (Array.isArray(raw) ? raw : []);
  const chartData = rows.length ? aggregateRows(rows, config) : [];

  return { chartData, rows, isLoading, error };
}
