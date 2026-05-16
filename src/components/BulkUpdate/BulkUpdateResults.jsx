import { useState } from 'react';
import { SelectCheckbox } from '../DataManagement/BulkDeleteBar';

export default function BulkUpdateResults({ data, total, moduleDef, selectedIds, onSelectionChange }) {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const totalPages = Math.ceil(data.length / pageSize);
  const pageData = data.slice((page - 1) * pageSize, page * pageSize);

  const allSelected = data.length > 0 && data.every(r => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(r => r.id)));
    }
  }

  function toggleOne(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  const fields = moduleDef?.fields?.filter(f => !f.readOnly) || [];
  const visibleCols = fields.slice(0, 6); // show first 6 columns

  const thStyle = {
    padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600,
    color: 'var(--text-2)', background: 'var(--bg-page)',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '7px 10px', fontSize: 13, color: 'var(--text-1)',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', maxWidth: 200,
    overflow: 'hidden', textOverflow: 'ellipsis',
  };

  if (!data.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 20px',
        color: 'var(--text-2)', border: '1px dashed var(--border)', borderRadius: 10,
      }}>
        לא נמצאו רשומות התואמות את קריטריוני הסינון
      </div>
    );
  }

  return (
    <div>
      {/* Selection bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', marginBottom: 10,
        background: someSelected ? 'var(--accent-light)' : 'var(--bg-page)',
        borderRadius: 8, border: '1px solid var(--border)',
        transition: 'background 0.2s',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: someSelected ? 'var(--accent)' : 'var(--text-2)' }}>
          {someSelected
            ? `נבחרו ${selectedIds.size} מתוך ${total} רשומות`
            : `נמצאו ${total} רשומות — יש לסמן רשומות לעדכון`
          }
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {someSelected && selectedIds.size < data.length && (
            <button className="btn btn-ghost" onClick={toggleAll} style={{ fontSize: 12 }}>
              בחר הכל ({data.length})
            </button>
          )}
          {someSelected && (
            <button className="btn btn-ghost" onClick={() => onSelectionChange(new Set())} style={{ fontSize: 12 }}>
              ביטול בחירה
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
                <SelectCheckbox checked={allSelected} onChange={toggleAll} />
              </th>
              {visibleCols.map(col => (
                <th key={col.key} style={thStyle}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map(row => {
              const isSelected = selectedIds.has(row.id);
              return (
                <tr
                  key={row.id}
                  onClick={() => toggleOne(row.id)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-page)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--accent-light)' : 'var(--bg-card)'; }}
                >
                  <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <SelectCheckbox checked={isSelected} onChange={() => toggleOne(row.id)} />
                  </td>
                  {visibleCols.map(col => (
                    <td key={col.key} style={tdStyle} title={String(row[col.key] ?? '')}>
                      {formatCellValue(row[col.key], col.type)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ fontSize: 12 }}>הקודם</button>
          <span style={{ fontSize: 12, color: 'var(--text-2)', alignSelf: 'center' }}>
            עמוד {page} מתוך {totalPages}
          </span>
          <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            style={{ fontSize: 12 }}>הבא</button>
        </div>
      )}
    </div>
  );
}

function formatCellValue(val, type) {
  if (val === null || val === undefined) return '—';
  if (type === 'checkbox') return val ? 'כן' : 'לא';
  if (type === 'date') return val ? String(val).slice(0, 10) : '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
