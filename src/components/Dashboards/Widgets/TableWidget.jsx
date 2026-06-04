import { useState } from 'react';

const LABEL_MAP = {
  order_num: 'מס׳', order_name: 'שם הזמנה', status: 'סטטוס',
  created_at: 'תאריך', total_amount: 'סכום', customer_id: 'לקוח',
  task_num: 'מס׳', subject: 'נושא', due_date: 'תאריך יעד',
  company_name: 'שם חברה', contact_name: 'שם איש קשר',
  quote_num: 'מס׳ הצעה', name: 'שם',
  owner_id: 'בעלים', created_by: 'נציג', assigned_to: 'מוקצה ל',
};

const USER_COLS = new Set(['owner_id', 'created_by', 'assigned_to', 'manager_id', 'user_id', 'sales_rep_id']);

function formatCell(val, col, usersById) {
  if (val == null || val === '') return '—';
  if (USER_COLS.has(col) && usersById?.[String(val)]) return usersById[String(val)];
  if (col.includes('_at') || col.includes('_date') || col === 'due_date') {
    const d = new Date(val);
    return isNaN(d) ? val : d.toLocaleDateString('he-IL');
  }
  if (col.includes('amount') || col.includes('total') || col.includes('price')) {
    return `₪${Number(val).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
  }
  return String(val);
}

export default function TableWidget({ rows, config, usersById = {} }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const cols = config?.columns || (rows?.[0] ? Object.keys(rows[0]).slice(0, 5) : []);
  const limit = config?.limit || 10;

  const sorted = sortCol
    ? [...(rows || [])].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        const diff = av > bv ? 1 : av < bv ? -1 : 0;
        return sortDir === 'desc' ? -diff : diff;
      })
    : (rows || []);

  const visible = sorted.slice(0, limit);

  if (!visible.length) return <div className="widget-empty">אין נתונים להצגה</div>;

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  return (
    <div className="table-widget-wrap">
      <table className="table-widget">
        <thead>
          <tr>
            {cols.map(col => (
              <th key={col} onClick={() => handleSort(col)}>
                {LABEL_MAP[col] || col}
                {sortCol === col && (
                  <i className={`ti ti-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ marginRight: 4, fontSize: 10 }} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i}>
              {cols.map(col => (
                <td key={col}>{formatCell(row[col], col, usersById)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
