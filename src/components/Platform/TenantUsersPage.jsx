import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/client';
import './Platform.css';

function ResetPasswordModal({ user, tenantId, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('סיסמא חייבת להכיל לפחות 6 תווים'); return; }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return; }
    setLoading(true);
    setError('');
    try {
      await platformApi.tenants.users.resetPassword(tenantId, user.id, password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'שגיאה באיפוס הסיסמא');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="platform-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="platform-modal" style={{ width: 400 }}>
        <h2 className="platform-modal-title">
          איפוס סיסמא — {user.first_name} {user.last_name}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
          שם משתמש: <strong style={{ color: 'var(--text-1)', fontFamily: 'monospace' }}>{user.username}</strong>
        </p>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <i className="ti ti-circle-check" style={{ fontSize: 48, color: '#16a34a' }} />
            <p style={{ color: 'var(--text-1)', fontWeight: 600, marginTop: 12 }}>הסיסמא אופסה בהצלחה</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              שם משתמש: <strong>{user.username}</strong><br />
              סיסמא חדשה: <strong style={{ fontFamily: 'monospace' }}>{password}</strong>
            </p>
            <button className="platform-btn primary" style={{ marginTop: 16 }} onClick={onClose}>סגור</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="platform-login-error">{error}</div>}
            <div className="platform-form-field">
              <label>סיסמא חדשה</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="לפחות 6 תווים"
                dir="ltr"
                autoFocus
              />
            </div>
            <div className="platform-form-field">
              <label>אישור סיסמא</label>
              <input
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                placeholder="חזור על הסיסמא"
                dir="ltr"
              />
            </div>
            <div className="platform-modal-actions">
              <button type="button" className="platform-btn" onClick={onClose}>ביטול</button>
              <button type="submit" className="platform-btn primary" disabled={loading}>
                {loading ? 'מאפס...' : 'אפס סיסמא'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TenantUsersPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [resetUser, setResetUser] = useState(null);

  const { data: tenantData, isLoading: loadingTenant } = useQuery({
    queryKey: ['platform-tenant', tenantId],
    queryFn: () => platformApi.tenants.get(tenantId),
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['platform-tenant-users', tenantId],
    queryFn: () => platformApi.tenants.users.list(tenantId),
  });

  const users = usersData?.data || [];
  const tenant = tenantData;

  const userTypeLabel = (t) => {
    if (t === 'superAdmin') return 'סופר אדמין';
    if (t === 'admin') return 'מנהל';
    return 'משתמש';
  };

  return (
    <>
      <div className="platform-page-header">
        <button
          className="platform-btn"
          onClick={() => navigate('/platform/tenants')}
          style={{ marginBottom: 16 }}
        >
          <i className="ti ti-arrow-right" />
          חזרה לטנאנטים
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>{loadingTenant ? '...' : tenant?.name}</h1>
            <p>
              <span className={`platform-badge ${tenant?.status || 'active'}`} style={{ marginLeft: 8 }}>
                {tenant?.status === 'suspended' ? 'מושעה' : 'פעיל'}
              </span>
              {tenant?.slug} · {users.length} משתמשים
            </p>
          </div>
        </div>
      </div>

      <div className="platform-card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
          <i className="ti ti-users" style={{ marginLeft: 8 }} />
          משתמשי הטנאנט
        </h3>

        {loadingUsers ? (
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>טוען...</p>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>אין משתמשים בטנאנט זה</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12 }}>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>שם</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>שם משתמש</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>אימייל</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>סוג</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>סטטוס</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-1)', fontWeight: 500 }}>
                    {u.first_name} {u.last_name}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <code style={{
                      background: 'var(--bg-elevated)',
                      padding: '2px 8px',
                      borderRadius: 5,
                      fontSize: 13,
                      color: 'var(--accent)',
                    }}>
                      {u.username}
                    </code>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontSize: 13 }}>
                    {u.email || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontSize: 13 }}>
                    {userTypeLabel(u.user_type)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`platform-badge ${u.status === 'active' ? 'active' : 'suspended'}`}>
                      {u.status === 'active' ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      className="platform-btn danger"
                      style={{ fontSize: 12, padding: '5px 12px' }}
                      onClick={() => setResetUser(u)}
                    >
                      <i className="ti ti-key" />
                      איפוס סיסמא
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          tenantId={tenantId}
          onClose={() => setResetUser(null)}
        />
      )}
    </>
  );
}
