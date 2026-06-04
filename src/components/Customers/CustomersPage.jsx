import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../../hooks/useCustomers';
import { useUsers } from '../../hooks/useUsers';
import { CUSTOMERS_COLUMNS } from '../../utils/constants';
import { useLookups, lookupLabel } from '../../hooks/useLookups';
import { Icon, ICONS } from '../../utils/icons';
import CustomerModal from './CustomerModal';
import StatsBar from '../Layout/StatsBar';
import ModuleTopbar from '../Layout/ModuleTopbar';
import useAuthStore from '../../store/authStore';
import { usePerms } from '../../hooks/usePerms';
import DeleteConfirmModal from '../Layout/DeleteConfirmModal';
import './CustomersPage.css';

const DEFAULT_VISIBLE = CUSTOMERS_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);

// Group columns by section for the picker
const COL_SECTIONS = CUSTOMERS_COLUMNS.reduce((acc, col) => {
  const sec = col.section || 'כללי';
  if (!acc[sec]) acc[sec] = [];
  acc[sec].push(col);
  return acc;
}, {});

export default function CustomersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { canCreate, canEdit, canView, canDelete } = usePerms('customers');
  const { data: usersData } = useUsers({ limit: 500 });
  const users = usersData?.data || [];
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();
  const [editCust, setEditCust] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showColPicker, setShowColPicker] = useState(false);

  // Column visibility & order — persisted in localStorage
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem('biz_cust_cols_v3');
      return saved ? JSON.parse(saved) : [...DEFAULT_VISIBLE];
    } catch { return [...DEFAULT_VISIBLE]; }
  });

  const saveVisibleCols = (cols) => {
    setVisibleCols(cols);
    localStorage.setItem('biz_cust_cols_v3', JSON.stringify(cols));
  };

  const toggleCol = (key) => {
    const next = visibleCols.includes(key)
      ? visibleCols.filter(k => k !== key)
      : [...visibleCols, key];
    saveVisibleCols(next);
  };

  const resetCols = () => saveVisibleCols([...DEFAULT_VISIBLE]);

  // Drag & drop reorder
  const [dragIdx, setDragIdx] = useState(null);
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...visibleCols];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    saveVisibleCols(next);
    setDragIdx(null);
  };

  const { data, isLoading, error } = useCustomers({ page, limit: 50, search });
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();

  const customers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const { clientTypes, customerStatuses } = useLookups();

  const handleSearch = (e) => {
    e?.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSave = async (form) => {
    if (form.id) {
      await updateMut.mutateAsync({ id: form.id, ...form });
    } else {
      await createMut.mutateAsync(form);
    }
    setEditCust(null);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteMut.mutateAsync(confirmDel.id);
    if (editCust?.id === confirmDel.id) setEditCust(null);
    setConfirmDel(null);
  };

  const renderCellValue = (cust, key) => {
    switch (key) {
      case 'client_type': return lookupLabel(clientTypes, cust.client_type);
      case 'owner_id': {
        if (!cust.owner_id) return '—';
        const u = users.find(u => u.id === cust.owner_id);
        return u ? (`${u.first_name || ''} ${u.last_name || ''}`).trim() || u.username || '—' : '—';
      }
      case 'status': {
        const STATUS_BADGE = { active: 'badge-success', inactive: 'badge-danger', warning: 'badge-warning', limited: 'badge-danger', potential: 'badge-info' };
        const label = lookupLabel(customerStatuses, cust.status);
        return <span className={`badge ${STATUS_BADGE[cust.status] || 'badge-secondary'}`}>{label}</span>;
      }
      case 'created_at':
        return cust.created_at ? new Date(cust.created_at).toLocaleDateString('he-IL') : '—';
      default:
        return cust[key] || '—';
    }
  };

  // Active columns in user-defined order
  const activeCols = visibleCols.map(key => CUSTOMERS_COLUMNS.find(c => c.key === key)).filter(Boolean);

  const custStats = useMemo(() => {
    const active = customers.filter(c => c.status === 'active').length;
    return [
      { label: 'סה"כ לקוחות', value: total, color: 'var(--accent)' },
      { label: 'פעילים', value: active, color: 'var(--success)' },
      { label: 'לא פעילים', value: total - active, color: 'var(--danger)' },
    ];
  }, [customers, total]);

  // Full-page editor for create/edit (instead of modal overlay)
  if (editCust !== null) {
    return (
      <>
        <CustomerModal
          customer={editCust.id ? editCust : null}
          onSave={handleSave}
          onClose={() => setEditCust(null)}
          loading={createMut.isPending || updateMut.isPending}
          onDelete={editCust.id && canDelete ? () => setConfirmDel(editCust) : undefined}
        />
        {confirmDel && (
          <DeleteConfirmModal
            title="מחיקת לקוח"
            name={confirmDel.company_name}
            cascade="המחיקה תשפיע על כל הרשומות המשויכות ללקוח זה: אנשי קשר, אתרי לקוח, הסכמי שירות, פריטי לקוח, עסקאות, הצעות מחיר והזמנות."
            onConfirm={handleDelete}
            onCancel={() => setConfirmDel(null)}
            isPending={deleteMut.isPending}
          />
        )}
      </>
    );
  }

  return (
    <div className="animate-in">
      <ModuleTopbar icon="ti-users" title="לקוחות">
        {canCreate && (
          <button className="tdb-calendar-btn" onClick={() => setEditCust({ owner_id: currentUser?.id || '' })} style={{ background: 'rgba(255,255,255,.25)', borderColor: 'rgba(255,255,255,.5)', fontWeight: 700 }}>
            <i className="ti ti-plus" aria-hidden="true" /> לקוח חדש
          </button>
        )}
      </ModuleTopbar>
      <StatsBar stats={custStats} />

      {/* Column Picker */}
      {showColPicker && (
        <div className="col-picker card">
          <div className="col-picker-header">
            <h3>בחירת וסידור עמודות</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => saveVisibleCols(CUSTOMERS_COLUMNS.map(c => c.key))}>הכל</button>
              <button className="btn btn-ghost" onClick={resetCols}>ברירת מחדל</button>
            </div>
          </div>

          {/* Checkboxes by section */}
          <div className="col-picker-sections">
            {Object.entries(COL_SECTIONS).map(([section, cols]) => (
              <div key={section} className="col-section">
                <div className="col-section-title">{section}</div>
                {cols.map(col => (
                  <label key={col.key} className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={visibleCols.includes(col.key)}
                      onChange={() => toggleCol(col.key)}
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          {/* Drag reorder */}
          <div className="col-order-section">
            <div className="col-order-title">סדר העמודות — גרור לשינוי סדר</div>
            <div className="col-order-list">
              {visibleCols.map((key, idx) => {
                const col = CUSTOMERS_COLUMNS.find(c => c.key === key);
                if (!col) return null;
                return (
                  <div
                    key={key}
                    className={`col-order-item ${dragIdx === idx ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                  >
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
      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-input-wrap">
          <Icon svg={ICONS.search} size={16} className="search-icon" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="חיפוש לפי שם, עיר, טלפון, מייל..."
            className="search-input"
          />
          {searchInput && (
            <button type="button" className="search-clear" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
              &times;
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-secondary">חיפוש</button>
        <button type="button" className={`btn ${showColPicker ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowColPicker(p => !p)}>
          עמודות ▾
        </button>
      </form>

      {/* Table */}
      <div className="table-card">
        {isLoading ? (
          <div className="table-loading">טוען נתונים...</div>
        ) : error ? (
          <div className="table-error">שגיאה בטעינת נתונים: {error.message}</div>
        ) : customers.length === 0 ? (
          <div className="table-empty">
            <p>לא נמצאו לקוחות</p>
            {search && <button className="btn btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); }}>נקה חיפוש</button>}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {activeCols.map(col => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                    <th style={{ width: 100 }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(cust => (
                    <tr key={cust.id} className="clickable-row" onClick={() => navigate(`/customers/${cust.id}`)}>
                      {activeCols.map(col => (
                        <td key={col.key}>{renderCellValue(cust, col.key)}</td>
                      ))}
                      <td>
                        <div className="table-actions" onClick={e => e.stopPropagation()}>
                          {canEdit && (
                            <button className="tbl-action-btn tbl-action-edit" onClick={() => setEditCust(cust)} title="עריכה">
                              <i className="ti ti-edit" aria-hidden="true" />
                              עריכה
                            </button>
                          )}
                          {!canEdit && canView && (
                            <button className="tbl-action-btn tbl-action-edit" onClick={() => navigate(`/customers/${cust.id}`)} title="צפייה"
                              style={{ color: '#5B7FA6', borderColor: '#C5E3F7' }}>
                              <i className="ti ti-eye" aria-hidden="true" />
                              צפייה
                            </button>
                          )}
                          {canDelete && (
                            <button className="tbl-action-btn tbl-action-delete" onClick={() => setConfirmDel(cust)} title="מחיקה">
                              <i className="ti ti-trash" aria-hidden="true" />
                              מחק
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  → הקודם
                </button>
                <span className="pagination-info">
                  עמוד {page} מתוך {totalPages} ({total} תוצאות)
                </span>
                <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  הבא ←
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Editor handled via full-page early return above */}

      {/* Delete Confirmation */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקת לקוח</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>
              האם למחוק את <strong>{confirmDel.company_name}</strong>?
              <br />פעולה זו אינה ניתנת לביטול.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
