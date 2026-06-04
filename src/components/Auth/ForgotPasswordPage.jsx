import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/client';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('יש להזין כתובת אימייל'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'שגיאה בשליחת הבקשה');
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
            <h2 className="login-panel-title">שכחת סיסמא?<br />אנחנו כאן לעזור</h2>
            <p className="login-panel-subtitle">נשלח לך קישור לאיפוס הסיסמא לתיבת האימייל שלך</p>
          </div>
        </div>
      </div>

      <div className="login-panel-right">
        <div className="login-card" dir="rtl">
          <div className="login-logo">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">BIZapp</span>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <i className="ti ti-mail-check" style={{ fontSize: 52, color: 'var(--accent)' }} />
              <h2 style={{ marginTop: 12, color: 'var(--text-1)' }}>הבקשה נשלחה</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
                אם הכתובת <strong>{email}</strong> קיימת במערכת,<br />
                יישלח אליה קישור לאיפוס הסיסמא בדקות הקרובות.
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>
                לא קיבלת? בדוק את תיקיית הספאם.
              </p>
              <Link to="/login" className="login-submit" style={{ display: 'block', marginTop: 20, textAlign: 'center', textDecoration: 'none' }}>
                חזרה להתחברות
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="login-heading">
                <h1 className="login-title">איפוס סיסמא</h1>
                <p className="login-subtitle">הזן את כתובת האימייל שלך ונשלח קישור לאיפוס</p>
              </div>
              {error && <div className="login-error" role="alert">{error}</div>}
              <div className="login-field">
                <label htmlFor="fp-email">כתובת אימייל</label>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="your@email.com"
                  dir="ltr"
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
                <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  חזרה להתחברות
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
