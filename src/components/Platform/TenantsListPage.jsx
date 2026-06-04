import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { platformApi } from '../../api/client';
import TenantForm from './TenantForm';
import './Platform.css';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('he-IL');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Platform Login History Tab ────────────────────────────────────────────────
function PlatformLoginLogTab({ tenants }) {
  const [page, setPage] = useState(1);
  const [filterTenant, setFilterTenant] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState({ tenantId: '', userId: '', dateFrom: '', dateTo: '' });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['platform-login-history', applied, page],
    queryFn: () => platformApi.loginHistory({ page, limit: 50, ...applied }),
  });

  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const applyFilter = () => {
    setApplied({ tenantId: filterTenant, userId: filterUser, dateFrom, dateTo });
    setPage(1);
  };
  const clearFilter = () => {
    setFilterTenant(''); setFilterUser(''); setDateFrom(''); setDateTo('');
    setApplied({ tenantId: '', userId: '', dateFrom: '', dateTo: '' });
    setPage(1);
  };
  const hasFilter = applied.tenantId || applied.userId || applied.dateFrom || applied.dateTo;

  const T0 = '00000000-0000-0000-0000-000000000000';
  const realTenants = tenants.filter(t => t.id !== T0);

  return (
    <div>
      {/* Filters */}
      <div className="platform-card" style={{ marginBottom: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>טנאנט</label>
            <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #2D3748', borderRadius: 7, fontSize: 13, background: '#1E2A3A', color: '#E2E8F0' }}>
              <option value="">— כל הטנאנטים —</option>
              {realTenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>שם משתמש</label>
            <input value={filterUser} onChange={e => setFilterUser(e.target.value)}
              placeholder="חיפוש לפי מזהה משתמש"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #2D3748', borderRadius: 7, fontSize: 13, background: '#1E2A3A', color: '#E2E8F0' }} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>מתאריך</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #2D3748', borderRadius: 7, fontSize: 13, background: '#1E2A3A', color: '#E2E8F0' }} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>עד תאריך</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #2D3748', borderRadius: 7, fontSize: 13, background: '#1E2A3A', color: '#E2E8F0' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="platform-btn primary" onClick={applyFilter} style={{ padding: '7px 16px', fontSize: 13 }}>
              <i className="ti ti-filter" /> סנן
            </button>
            {hasFilter && (
              <button className="platform-btn" onClick={clearFilter} style={{ padding: '7px 12px', fontSize: 13 }}>נקה</button>
            )}
          </div>
        </div>
        {total > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#94A3B8' }}>
            {isFetching ? 'מרענן...' : `סה"כ ${total} כניסות`}
            {hasFilter && ' (מסונן)'}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="platform-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1E2A3A', borderBottom: '2px solid #2D3748' }}>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#94A3B8', fontSize: 11 }}>טנאנט</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#94A3B8', fontSize: 11 }}>משתמש</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#94A3B8', fontSize: 11 }}>שם מלא</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#94A3B8', fontSize: 11 }}>כניסה</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#94A3B8', fontSize: 11 }}>יציאה</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#94A3B8', fontSize: 11 }}>סיבת יציאה</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#94A3B8', fontSize: 11 }}>כתובת IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>טוען...</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                  <i className="ti ti-login" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: 0.4 }} />
                  {hasFilter ? 'לא נמצאו כניסות בפילטר הנוכחי' : 'אין היסטוריית כניסות עדיין'}
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #2D3748', background: i % 2 === 0 ? 'transparent' : '#1A2332' }}>
                <td style={{ padding: '9px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#E2E8F0' }}>{r.tenant_name || '—'}</div>
                  {r.tenant_slug && <div style={{ fontSize: 10, color: '#64748B' }}>{r.tenant_slug}</div>}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#1E2A3A', padding: '2px 7px', borderRadius: 5, color: '#818CF8', border: '1px solid #312E81' }}>
                    {r.username || '—'}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', color: '#E2E8F0' }}>
                  {`${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}
                </td>
                <td style={{ padding: '9px 14px', color: '#94A3B8', direction: 'ltr', textAlign: 'right', fontSize: 12 }}>
                  {formatDateTime(r.login_at)}
                </td>
                <td style={{ padding: '9px 14px', color: '#94A3B8', direction: 'ltr', textAlign: 'right', fontSize: 12 }}>
                  {r.logout_at ? formatDateTime(r.logout_at) : <span style={{ color: '#10B981', fontWeight: 600, fontSize: 11 }}>פעיל</span>}
                </td>
                <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                  {r.logout_type === 'manual'
                    ? <span style={{ background: '#064E3B', color: '#34D399', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>יזום</span>
                    : r.logout_type === 'session_expired'
                    ? <span style={{ background: '#78350F', color: '#FCD34D', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>פג תוקף</span>
                    : r.logout_at ? <span style={{ color: '#64748B', fontSize: 11 }}>—</span>
                    : null}
                </td>
                <td style={{ padding: '9px 14px', color: '#64748B', fontFamily: 'monospace', fontSize: 11, direction: 'ltr', textAlign: 'right' }}>
                  {r.ip_address || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          <button className="platform-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ fontSize: 12, padding: '5px 12px' }}>
            ← הקודם
          </button>
          <span style={{ fontSize: 13, color: '#94A3B8', alignSelf: 'center', padding: '0 8px' }}>
            עמוד {page} מתוך {totalPages}
          </span>
          <button className="platform-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ fontSize: 12, padding: '5px 12px' }}>
            הבא →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TenantsListPage() {
  const [tab, setTab] = useState('tenants');
  const [showForm, setShowForm] = useState(false);
  const enterTenant = useAuthStore(s => s.enterTenant);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: () => platformApi.tenants.list(),
  });

  const createMutation = useMutation({
    mutationFn: (formData) => platformApi.tenants.create(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-tenants'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => platformApi.tenants.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-tenants'] }),
  });

  const handleImpersonate = useCallback(async (tenant) => {
    await enterTenant(tenant.id, tenant.name);
    window.location.href = '/';
  }, [enterTenant]);

  const handleToggleStatus = useCallback((tenant) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    const label = newStatus === 'suspended' ? `להשעות את "${tenant.name}"?` : `להפעיל מחדש את "${tenant.name}"?`;
    if (!window.confirm(label)) return;
    statusMutation.mutate({ id: tenant.id, status: newStatus });
  }, [statusMutation]);

  const tenants = data?.data || [];
  const T0 = '00000000-0000-0000-0000-000000000000';

  return (
    <>
      <div className="platform-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>{tab === 'tenants' ? 'ניהול טנאנטים' : 'היסטוריית כניסות'}</h1>
            <p>{tab === 'tenants' ? `${tenants.length} טנאנטים במערכת` : 'כניסות ויציאות של כלל המשתמשים'}</p>
          </div>
          {tab === 'tenants' && (
            <button className="platform-btn primary" onClick={() => setShowForm(true)}>
              <i className="ti ti-plus" />
              טנאנט חדש
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 16, borderBottom: '1px solid #2D3748' }}>
          {[['tenants', 'ti-building', 'טנאנטים'], ['loginlog', 'ti-login', 'היסטוריית כניסות']].map(([k, icon, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === k ? '#818CF8' : 'transparent'}`,
                color: tab === k ? '#818CF8' : '#94A3B8',
                fontWeight: tab === k ? 700 : 400, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1,
                transition: 'all 0.15s',
              }}>
              <i className={`ti ${icon}`} style={{ fontSize: 15 }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'tenants' && (
        isLoading ? (
          <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>טוען...</div>
        ) : (
          <div className="platform-tenants-grid">
            {tenants.map(t => (
              <div key={t.id} className="platform-tenant-card">
                <div className="platform-tenant-card-header">
                  <div>
                    <p className="platform-tenant-name">{t.name}</p>
                    <p className="platform-tenant-slug">{t.slug}</p>
                  </div>
                  <span className={`platform-badge ${t.status}`}>
                    {t.status === 'active' ? 'פעיל' : 'מושעה'}
                  </span>
                </div>
                <div className="platform-tenant-meta">
                  <span><i className="ti ti-users" />{t.user_count || 0} משתמשים</span>
                  <span><i className="ti ti-calendar" />{formatDate(t.created_at)}</span>
                  <span><i className="ti ti-package" />{t.plan}</span>
                </div>
                <div className="platform-tenant-actions">
                  <button
                    className="platform-btn primary"
                    onClick={() => handleImpersonate(t)}
                    style={{ flex: 1 }}
                  >
                    <i className="ti ti-eye" />
                    כנס כטנאנט
                  </button>
                  <button
                    className="platform-btn"
                    onClick={() => navigate(`/platform/tenants/${t.id}/users`)}
                    title="משתמשים ואיפוס סיסמא"
                  >
                    <i className="ti ti-users" />
                  </button>
                  {t.id !== T0 && (
                    <button
                      className={`platform-btn ${t.status === 'active' ? 'danger' : 'success'}`}
                      onClick={() => handleToggleStatus(t)}
                    >
                      <i className={`ti ti-${t.status === 'active' ? 'ban' : 'check'}`} />
                      {t.status === 'active' ? 'השעה' : 'הפעל'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'loginlog' && (
        <PlatformLoginLogTab tenants={tenants} />
      )}

      {showForm && (
        <TenantForm
          onClose={() => setShowForm(false)}
          onSubmit={(data) => createMutation.mutateAsync(data)}
        />
      )}
    </>
  );
}
