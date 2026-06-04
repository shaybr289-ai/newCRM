import { useState, useEffect, useMemo } from 'react';
import { api } from '../../../api/client';
import { REPORT_MODULES, REPORT_JOINS } from '../../../utils/constants';

// ── helpers (mirror of ReportsPage.jsx) ──────────────────────────────────────

function applyFilter(val, op, filterVal) {
  const s = String(val ?? '').toLowerCase().trim();
  const f = String(filterVal ?? '').toLowerCase().trim();
  switch (op) {
    case 'contains': return s.includes(f);
    case 'not_contains': return !s.includes(f);
    case 'eq': return s === f;
    case 'neq': return s !== f;
    case 'starts': return s.startsWith(f);
    case 'gt': return parseFloat(val) > parseFloat(filterVal);
    case 'lt': return parseFloat(val) < parseFloat(filterVal);
    case 'empty': return !s;
    case 'not_empty': return !!s;
    default: return true;
  }
}

function parseColKey(key) {
  const i = key.indexOf(':');
  return i >= 0 ? { mod: key.slice(0, i), fieldId: key.slice(i + 1) } : { mod: null, fieldId: key };
}

function getDisplayValue(val, field) {
  if (val == null || val === '') return '—';
  if (field?.type === 'enum' && field.options) {
    const opt = field.options.find(([k]) => k === val); return opt ? opt[1] : val;
  }
  if (field?.type === 'boolean') return val ? 'כן' : 'לא';
  if (field?.type === 'date') { try { return new Date(val).toLocaleDateString('he-IL'); } catch { return val; } }
  if (field?.type === 'number') { const n = Number(val); return isNaN(n) ? val : n.toLocaleString('he-IL'); }
  return String(val ?? '');
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ReportWidget({ config }) {
  const report = config?.reportDef;
  const rowLimit = config?.limit ?? 50;

  const [rawData, setRawData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    if (!report?.module) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const result = {};
        for (const mod of [report.module, ...(report.joinModules || [])]) {
          const res = await api.get(`/api/${mod}?limit=5000`);
          result[mod] = res.data || (Array.isArray(res) ? res : []);
        }
        if (!cancelled) { setRawData(result); setLoading(false); }
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [report?.module, JSON.stringify(report?.joinModules)]);

  const selectedFields = useMemo(() => {
    if (!report?.columns) return [];
    return report.columns.map(key => {
      const { mod, fieldId } = parseColKey(key);
      const field = REPORT_MODULES[mod]?.fields.find(f => f.id === fieldId);
      return field ? { key, mod, fieldId, ...field } : { key, mod, fieldId, label: fieldId };
    });
  }, [report?.columns]);

  // Client-side join (same logic as ReportsPage ReportRunner)
  const joined = useMemo(() => {
    if (!report?.module || !rawData[report.module]?.length) return [];
    const primary = rawData[report.module];
    const joins = report.joinModules || [];
    let rows = primary.map(row => {
      const flat = {};
      for (const k of Object.keys(row)) flat[`${report.module}:${k}`] = row[k];
      return flat;
    });
    if (joins.length) {
      const joinDefs = (REPORT_JOINS[report.module] || []).filter(j => joins.includes(j.module));
      for (const jDef of joinDefs) {
        const secData = rawData[jDef.module] || [];
        const newRows = [];
        for (const row of rows) {
          const matches = secData.filter(s =>
            jDef.reverse
              ? s.id === row[`${report.module}:${jDef.fk}`]
              : jDef.siblingFk
                ? s[jDef.fk] === row[`${report.module}:${jDef.siblingFk}`]
                : s[jDef.fk] === row[`${report.module}:id`]
          );
          if (!matches.length) continue;
          for (const match of matches) {
            const newRow = { ...row };
            for (const k of Object.keys(match)) newRow[`${jDef.module}:${k}`] = match[k];
            newRows.push(newRow);
          }
        }
        rows = newRows;
      }
    }
    return rows;
  }, [rawData, report?.module, report?.joinModules]);

  // Filter + sort + limit
  const rows = useMemo(() => {
    let data = [...joined];
    for (const fl of (report?.filters || [])) {
      if (!fl.fieldKey) continue;
      data = data.filter(row => applyFilter(row[fl.fieldKey], fl.op, fl.value));
    }
    if (sortCol) {
      const field = selectedFields.find(f => f.key === sortCol);
      data.sort((a, b) => {
        let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
        if (field?.type === 'number') { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
        else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return data.slice(0, rowLimit);
  }, [joined, report?.filters, sortCol, sortDir, rowLimit, selectedFields]);

  const handleSort = (colKey) => {
    if (sortCol === colKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(colKey); setSortDir('asc'); }
  };

  if (!report) return <div className="widget-empty">הגדרת דוח חסרה</div>;
  if (loading) return <div className="widget-loading"><div className="widget-spinner" /></div>;
  if (error) return <div className="widget-error"><i className="ti ti-alert-circle" /> שגיאה בטעינה</div>;
  if (!rows.length) return <div className="widget-empty">אין נתונים להצגה</div>;

  return (
    <div className="table-widget-wrap">
      <table className="table-widget">
        <thead>
          <tr>
            {selectedFields.map(f => (
              <th key={f.key} onClick={() => handleSort(f.key)}>
                {f.label}
                {sortCol === f.key && (
                  <i className={`ti ti-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ marginRight: 4, fontSize: 10 }} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {selectedFields.map(f => <td key={f.key}>{getDisplayValue(row[f.key], f)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
