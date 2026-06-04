import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes, useDeleteQuote } from '../../hooks/useQuotes';
import { useCustomers } from '../../hooks/useCustomers';
import { QUOTES_COLUMNS, QUOTE_STAGES, QUOTE_TYPES, STAGE_COLORS } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import DataTable from '../Layout/DataTable';
import StatsBar from '../Layout/StatsBar';
import ModuleTopbar from '../Layout/ModuleTopbar';
import { usePerms } from '../../hooks/usePerms';
import DeleteConfirmModal from '../Layout/DeleteConfirmModal';
import '../Customers/CustomerModal.css';

export default function QuotesPage() {
  const { canView, canCreate, canEdit, canDelete, canUseButton } = usePerms('quotes');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuotes({ page, limit: 50, search, customerId: customerFilter });
  const { data: custData } = useCustomers({ limit: 500 });
  const deleteMut = useDeleteQuote();

  const quotes = data?.data || [];
  const customers = custData?.data || [];
  const getCustName = (id) => customers.find(c => c.id === id)?.company_name || '—';

  // Filter by stage client-side (since API uses status param)
  const filtered = stageFilter ? quotes.filter(q => q.stage === stageFilter) : quotes;

  const renderCell = (row, key) => {
    switch (key) {
      case 'customer_id': return getCustName(row.customer_id);
      case 'stage': {
        const color = STAGE_COLORS[row.stage] || '#94A3B8';
        const label = (QUOTE_STAGES.find(([k]) => k === row.stage) || ['', '—'])[1];
        return <span style={{ padding: '3px 10px', borderRadius: 20, background: color + '22', color, fontWeight: 600, fontSize: 12 }}>{label}</span>;
      }
      case 'status': {
        const statusMap = {
          active:    { cls: 'badge-success', label: 'פעיל' },
          cancelled: { cls: 'badge-danger',  label: 'מבוטל' },
          expired:   { cls: 'badge-warning', label: 'פג תוקף' },
          closed:    { cls: 'badge-info',    label: 'סגורה' },
        };
        const s = statusMap[row.status] || { cls: 'badge-warning', label: row.status };
        return <span className={`badge ${s.cls}`}>{s.label}</span>;
      }
      case 'quote_type': {
        const t = QUOTE_TYPES.find(([v]) => v === row.quote_type);
        return t ? t[1] : row.quote_type || '—';
      }
      case 'quote_date':
      case 'valid_until':
      case 'created_at':
        return row[key] ? new Date(row[key]).toLocaleDateString('he-IL') : '—';
      case 'overall_discount':
        return row.overall_discount ? `${row.overall_discount}%` : '—';
      default: return row[key] || '—';
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteMut.mutateAsync(confirmDel.id);
    setConfirmDel(null);
  };

  const quoteStats = useMemo(() => {
    return QUOTE_STAGES.map(([key, label]) => ({
      label,
      value: quotes.filter(q => q.stage === key).length,
      color: STAGE_COLORS[key] || 'var(--text-3)',
    }));
  }, [quotes]);

  return (
    <>
      <ModuleTopbar icon="ti-file-invoice" title="הצעות מחיר">
        {canUseButton('btn_templates') && (
          <button className="tdb-calendar-btn" onClick={() => navigate('/quotes/templates')}>
            <i className="ti ti-copy" aria-hidden="true" /> תבניות הצעות
          </button>
        )}
        {canCreate && canUseButton('btn_new') && (
          <button className="tdb-calendar-btn" onClick={() => navigate('/quotes/new')} style={{ background: 'rgba(255,255,255,.25)', borderColor: 'rgba(255,255,255,.5)', fontWeight: 700 }}>
            <i className="ti ti-plus" aria-hidden="true" /> הצעת מחיר חדשה
          </button>
        )}
      </ModuleTopbar>
      <StatsBar stats={quoteStats} />
      {/* Stage Filter Pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={`btn ${!stageFilter ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStageFilter('')}
          style={{ fontSize: 12, padding: '5px 12px' }}
        >הכל ({quotes.length})</button>
        {QUOTE_STAGES.map(([key, label]) => {
          const count = quotes.filter(q => q.stage === key).length;
          const color = STAGE_COLORS[key];
          return (
            <button
              key={key}
              className={`btn ${stageFilter === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStageFilter(stageFilter === key ? '' : key)}
              style={{
                fontSize: 12, padding: '5px 12px',
                ...(stageFilter !== key ? { color, borderColor: color + '44' } : {}),
              }}
            >{label} ({count})</button>
          );
        })}
      </div>

      <DataTable
        columns={QUOTES_COLUMNS}
        data={filtered}
        total={data?.total || 0}
        page={page}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        error={error}
        onSearchChange={s => { setSearch(s); setPage(1); }}
        onPageChange={setPage}
        onEdit={canEdit ? row => navigate(`/quotes/${row.id}/edit`) : undefined}
        onView={!canEdit && canView ? row => navigate(`/quotes/${row.id}/edit?viewOnly=1`) : undefined}
        onDelete={canDelete ? row => setConfirmDel(row) : undefined}
        renderCell={renderCell}
        storageKey="biz_quotes_cols_v3"
        hideHeader
        customers={customers}
        onCustomerFilterChange={id => { setCustomerFilter(id); setPage(1); }}
      />

      {/* Delete Confirm */}
      {confirmDel && (
        <DeleteConfirmModal
          title="מחיקת הצעת מחיר"
          name={confirmDel.quote_name}
          cascade="מחיקת הצעת המחיר תסיר אותה לצמיתות, כולל כל שורות הפריטים המשויכות אליה."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          isPending={deleteMut.isPending}
        />
      )}
    </>
  );
}
