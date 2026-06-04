import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/client';
import './LoginPage.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-panel-right" style={{ width: '100%' }}>
          <div className="login-card" dir="rtl" style={{ textAlign: 'center' }}>
            <i className="ti ti-link-off" style={{ fontSize: 48, color: '#dc2626' }} />
            <h2 style={{ color: 'var(--text-1)', marginTop: 12 }}>קישור לא תקין</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>הקישור שהשתמשת בו אינו תקין.</p>
            <Link to="/forgot-password" className="login-submit" style={{ display: 'block', marginTop: 16, textAlign: 'center', textDecoration: 'none' }}>
              בקש קישור חדש
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('סיסמא חייבת להכיל לפחות 6 תווים'); return; }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      if (err.message?.includes('לא תקין') || err.message?.includes('INVALID_TOKEN')) {
        setError('הקישור אינו בתוקף או שכבר נוצל. בקש קישור חדש.');
      } else {
        setError(err.message || 'שגיאה באיפוס הסיסמא');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel-left" aria-hidden="true">
        <div className="login-panel-left-inner">
          <img src="https://images.unsplash.com/photo-1758876202980-0a28b744fb24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="" className="login-panel-img" />
          <div className="login-panel-overlay">
            <div className="login-panel-badge"><span style={{ width:7,height:7,borderRadius:'50%',background:'#7DD3FC',display:'inline-block' }} />מערכת ניהול עסקי</div>
            <h2 className="login-panel-title">הגדרת<br />סיסמא חדשה</h2>
          </div>
        </div>
      </div>

      <div className="login-panel-right">
        <div className="login-card" dir="rtl">
          <div className="login-logo">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">BIZapp</span>
          </div>

          {done ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <i className="ti ti-circle-check" style={{ fontSize: 52, color: '#16a34a' }} />
              <h2 style={{ marginTop: 12, color: 'var(--text-1)' }}>הסיסמא עודכנה!</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14 }}>מועבר לדף ההתחברות...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="login-heading">
                <h1 className="login-title">סיסמא חדשה</h1>
                <p className="login-subtitle">הזן סיסמא חדשה לחשבונך</p>
              </div>
              {error && <div className="login-error" role="alert">{error}</div>}
              <div className="login-field">
                <label htmlFor="rp-password">סיסמא חדשה</label>
                <div className="login-password-wrap">
                  <input
                    id="rp-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="לפחות 6 תווים"
                    dir="ltr"
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button type="button" className="login-toggle-pass" onClick={() => setShowPass(p => !p)}>
                    <i className={`ti ti-eye${showPass ? '-off' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="login-field">
                <label htmlFor="rp-confirm">אישור סיסמא</label>
                <input
                  id="rp-confirm"
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="חזור על הסיסמא"
                  dir="ltr"
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'מעדכן...' : 'עדכן סיסמא'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
