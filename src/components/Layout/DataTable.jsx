import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon, ICONS } from '../../utils/icons';

/**
 * Reusable DataTable with column picker, search, pagination, and column sorting.
 *
 * Column definition shape:
 *   { key, label, section, defaultVisible, sortable?, sortField? }
 *
 * sortField defaults to key when not specified.
 * defaultSort: { key: 'task_num', dir: 'desc' }
 */
export default function DataTable({
  title,
  subtitle,
  columns,           // full column definitions array
  data,              // array of rows
  total = 0,
  page = 1,
  totalPages = 1,
  isLoading = false,
  error = null,
  search,
  onSearchChange,
  onPageChange,
  onAdd,
  onEdit,
  onDelete,
  renderCell,        // (row, colKey) => ReactNode
  storageKey,        // localStorage key for column prefs
  addLabel = 'חדש',
  extraPills,        // optional ReactNode rendered next to the "הכל (N)" pill
  customers,         // optional array of {id, company_name} for customer filter
  onCustomerFilterChange, // called with customer_id (string) or ''
  defaultSort = null, // { key: 'field_name', dir: 'asc' | 'desc' }
  displayLimit = null, // if set, show only first N rows (after sorting)
  hideHeader = false,  // when true, skip page-header (use with ModuleTopbar)
  extraSearchContent = null,
}) {
  const [showColPicker, setShowColPicker] = useState(false);

  // ── Sort state ─────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState(defaultSort?.key || null);
  const [sortDir, setSortDir] = useState(defaultSort?.dir || 'asc');

  const handleSort = (col) => {
    if (!col.sortable) return;
    const field = col.sortField || col.key;
    if (sortKey === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(field);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      let av = a[sortKey] ?? '';
      let bv = b[sortKey] ?? '';
      // Natural / numeric locale compare handles "1","2","10" and "T-001","T-010"
      const cmp = String(av).localeCompare(String(bv), 'he', { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // Apply display limit after sorting
  const displayedData = useMemo(
    () => (displayLimit && displayLimit > 0 && displayLimit < sortedData.length)
      ? sortedData.slice(0, displayLimit)
      : sortedData,
    [sortedData, displayLimit]
  );
  const isLimited = displayLimit && displayLimit > 0 && displayLimit < sortedData.length;
  const defaultVisible = columns.filter(c => c.defaultVisible).map(c => c.key);

  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge: append any newly-added defaultVisible columns that aren't in saved prefs
        const merged = [...parsed];
        defaultVisible.forEach(key => { if (!merged.includes(key)) merged.push(key); });
        return merged;
      }
      return [...defaultVisible];
    } catch { return [...defaultVisible]; }
  });

  const saveVisibleCols = (cols) => {
    setVisibleCols(cols);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(cols));
  };

  const toggleCol = (key) => {
    const next = visibleCols.includes(key) ? visibleCols.filter(k => k !== key) : [...visibleCols, key];
    saveVisibleCols(next);
  };

  // Drag reorder
  const [dragIdx, setDragIdx] = useState(null);

  const colSections = columns.reduce((acc, col) => {
    const sec = col.section || 'כללי';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(col);
    return acc;
  }, {});

  const activeCols = visibleCols.map(key => columns.find(c => c.key === key)).filter(Boolean);

  const [searchInput, setSearchInput] = useState('');
  const handleSearch = (e) => {
    e?.preventDefault();
    onSearchChange?.(searchInput);
    if (custInput.trim() === '') onCustomerFilterChange?.('');
    else {
      const match = (customers || []).find(c => c.company_name?.toLowerCase().includes(custInput.trim().toLowerCase()));
      onCustomerFilterChange?.(match?.id || '');
    }
  };

  const [custInput, setCustInput] = useState('');
  const [custDropdown, setCustDropdown] = useState([]);
  const [showCustDrop, setShowCustDrop] = useState(false);
  const custRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (custRef.current && !custRef.current.contains(e.target)) setShowCustDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCustInput = (val) => {
    setCustInput(val);
    if (!val.trim()) { setCustDropdown([]); setShowCustDrop(false); onCustomerFilterChange?.(''); return; }
    const matches = (customers || []).filter(c => c.company_name?.toLowerCase().includes(val.toLowerCase())).slice(0, 8);
    setCustDropdown(matches);
    setShowCustDrop(matches.length > 0);
  };

  const selectCustomer = (c) => {
    setCustInput(c.company_name);
    setShowCustDrop(false);
    onCustomerFilterChange?.(c.id);
  };

  const clearCustomer = () => {
    setCustInput('');
    setCustDropdown([]);
    setShowCustDrop(false);
    onCustomerFilterChange?.('');
  };

  return (
    <div className="animate-in">
      {/* Header */}
      {!hideHeader && <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{title}</h1>
            <span style={{
              background: 'var(--accent)', color: 'white',
              padding: '4px 12px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, lineHeight: 1.4,
              whiteSpace: 'nowrap',
            }}>הכל ({total})</span>
            {isLimited && (
              <span style={{
                background: '#FFF3CD', color: '#856404',
                border: '1px solid #FFEAA7',
                padding: '4px 12px', borderRadius: 999,
                fontSize: 12, fontWeight: 600, lineHeight: 1.4,
                whiteSpace: 'nowrap',
              }}>
                מוצגות {displayLimit} מתוך {sortedData.length}
              </span>
            )}
            {extraPills}
          </div>
          {subtitle && <p className="page-subtitle" style={{ marginTop: 4 }}>{subtitle}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${showColPicker ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowColPicker(p => !p)}>
            עמודות ▾
          </button>
          {onAdd && (
            <button className="btn btn-primary" onClick={onAdd}>
              <Icon svg={ICONS.plus} size={16} />
              {addLabel}
            </button>
          )}
        </div>
      </div>}

      {/* Column Picker */}
      {showColPicker && (
        <div className="col-picker card">
          <div className="col-picker-header">
            <h3>בחירת וסידור עמודות</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => saveVisibleCols(columns.map(c => c.key))}>הכל</button>
              <button className="btn btn-ghost" onClick={() => saveVisibleCols([...defaultVisible])}>ברירת מחדל</button>
            </div>
          </div>
          <div className="col-picker-sections">
            {Object.entries(colSections).map(([section, cols]) => (
              <div key={section} className="col-section">
                <div className="col-section-title">{section}</div>
                {cols.map(col => (
                  <label key={col.key} className="col-checkbox">
                    <input type="checkbox" checked={visibleCols.includes(col.key)} onChange={() => toggleCol(col.key)} />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="col-order-section">
            <div className="col-order-title">סדר העמודות — גרור לשינוי סדר</div>
            <div className="col-order-list">
              {visibleCols.map((key, idx) => {
                const col = columns.find(c => c.key === key);
                if (!col) return null;
                return (
                  <div key={key} className={`col-order-item ${dragIdx === idx ? 'dragging' : ''}`}
                    draggable onDragStart={() => setDragIdx(idx)} onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (dragIdx === null || dragIdx === idx) return;
                      const next = [...visibleCols]; const [m] = next.splice(dragIdx, 1); next.splice(idx, 0, m);
                      saveVisibleCols(next); setDragIdx(null);
                    }}>
                    <span className="col-order-grip">⠿</span>
                    <span>{col.label}</span>
                    <span className="col-order-num">{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {onSearchChange && (
        <form className="search-bar" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <Icon svg={ICONS.search} size={16} className="search-icon" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="חיפוש..." className="search-input" />
            {searchInput && (
              <button type="button" className="search-clear"
                onClick={() => { setSearchInput(''); onSearchChange(''); }}>&times;</button>
            )}
          </div>
          {onCustomerFilterChange && (
            <div ref={custRef} style={{ position: 'relative' }}>
              <div className="search-input-wrap">
                <Icon svg={ICONS.search} size={16} className="search-icon" />
                <input value={custInput} onChange={e => handleCustInput(e.target.value)}
                  placeholder="חיפוש לפי לקוח..." className="search-input" style={{ minWidth: 180 }} />
                {custInput && (
                  <button type="button" className="search-clear" onClick={clearCustomer}>&times;</button>
                )}
              </div>
              {showCustDrop && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, zIndex: 200, minWidth: 220,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)', marginTop: 4,
                }}>
                  {custDropdown.map(c => (
                    <div key={c.id} onMouseDown={() => selectCustomer(c)}
                      style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--accent-light)'}
                      onMouseOut={e => e.currentTarget.style.background = ''}>
                      {c.company_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {extraSearchContent}
          <button type="submit" className="btn btn-secondary">חיפוש</button>
          {hideHeader && (
            <button type="button" className={`btn ${showColPicker ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowColPicker(p => !p)}>
              עמודות ▾
            </button>
          )}
        </form>
      )}

      {/* Table */}
      <div className="table-card">
        {isLoading ? (
          <div className="table-loading">טוען נתונים...</div>
        ) : error ? (
          <div className="table-error">שגיאה: {error.message}</div>
        ) : data.length === 0 ? (
          <div className="table-empty"><p>לא נמצאו רשומות</p></div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {activeCols.map(col => {
                      const field = col.sortField || col.key;
                      const isActive = sortKey === field;
                      return (
                        <th
                          key={col.key}
                          onClick={() => col.sortable && handleSort(col)}
                          style={{
                            cursor: col.sortable ? 'pointer' : 'default',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                          }}
                          title={col.sortable ? (isActive ? (sortDir === 'asc' ? 'מיון עולה — לחץ לירידה' : 'מיון יורד — לחץ לעלייה') : 'לחץ למיון') : ''}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {col.label}
                            {col.sortable && (
                              <span style={{
                                fontSize: 11, opacity: isActive ? 1 : 0.3,
                                color: isActive ? 'var(--accent, #1A91D9)' : 'inherit',
                                transition: 'opacity 0.15s',
                              }}>
                                {isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                              </span>
                            )}
                          </span>
                        </th>
                      );
                    })}
                    {(onEdit || onDelete) && <th style={{ width: 120 }}>פעולות</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayedData.map(row => (
                    <tr key={row.id} style={{ cursor: onEdit ? 'pointer' : 'default' }}
                      onClick={() => onEdit?.(row)}
                      onMouseOver={e => { if (onEdit) e.currentTarget.style.background = 'var(--accent-light)'; }}
                      onMouseOut={e => e.currentTarget.style.background = ''}>
                      {activeCols.map(col => (
                        <td key={col.key}>{renderCell ? renderCell(row, col.key) : (row[col.key] || '—')}</td>
                      ))}
                      {(onEdit || onDelete) && (
                        <td onClick={e => e.stopPropagation()}>
                          <div className="table-actions">
                            {onEdit && (
                              <button className="action-btn edit" onClick={() => onEdit(row)} title="עריכה">
                                <i className="ti ti-edit" aria-hidden="true" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                className="action-btn delete"
                                onClick={() => onDelete(row)}
                                title="מחיקה"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}
                              >
                                <i className="ti ti-trash" aria-hidden="true" style={{ fontSize: 13 }} />
                                מחק
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>→ הקודם</button>
                <span className="pagination-info">עמוד {page} מתוך {totalPages} ({total} תוצאות)</span>
                <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>הבא ←</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
