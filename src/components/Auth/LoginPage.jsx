import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { authApi, setTokens } from '../../api/client';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  // MFA step (existing MFA verify)
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  // Forced MFA setup step (admin required MFA, user hasn't set it up)
  const [mfaSetupStep, setMfaSetupStep] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [setupQr, setSetupQr] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupCode, setSetupCode] = useState('');

  const login = useAuthStore(s => s.login);
  const mfaComplete = useAuthStore(s => s.mfaComplete);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('יש להזין שם משתמש וסיסמא');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(username.trim(), password);
      if (result?.mfaSetupRequired) {
        setSetupToken(result.setupToken);
        setMfaSetupStep(true);
        setLoading(true);
        try {
          const { qrDataUrl, secret } = await authApi.mfa.forcedSetup(result.setupToken);
          setSetupQr(qrDataUrl);
          setSetupSecret(secret);
        } catch {}
        setLoading(false);
        return;
      }
      if (result?.mfaRequired) {
        setMfaToken(result.mfaToken);
        setMfaStep(true);
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.message;
      if (msg === 'Invalid credentials') setError('שם משתמש או סיסמא שגויים');
      else if (msg === 'Account is inactive') setError('משתמש זה אינו פעיל. פנה למנהל המערכת');
      else if (msg === 'Tenant suspended' || err.code === 'TENANT_SUSPENDED') setError('החשבון מושעה. לפרטים פנה למנהל המערכת');
      else setError(msg || 'שגיאת התחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSetup = async (e) => {
    e?.preventDefault();
    if (setupCode.replace(/\s/g, '').length < 6) { setError('יש להזין קוד 6 ספרות'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await authApi.mfa.forcedVerify(setupToken, setupCode.replace(/\s/g, ''));
      setTokens(data.accessToken, data.refreshToken);
      useAuthStore.setState({ user: data.user, isAuthenticated: true });
      navigate('/', { replace: true });
    } catch (err) {
      if (err.code === 'INVALID_MFA_CODE') setError('קוד שגוי — נסה שוב');
      else setError(err.message || 'שגיאת אימות');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e) => {
    e?.preventDefault();
    if (mfaCode.replace(/\s/g, '').length < 6) { setError('יש להזין קוד 6 ספרות'); return; }
    setLoading(true);
    setError('');
    try {
      await mfaComplete(mfaToken, mfaCode.replace(/\s/g, ''));
      navigate('/', { replace: true });
    } catch (err) {
      if (err.code === 'INVALID_MFA_CODE') setError('קוד MFA שגוי — נסה שוב');
      else setError(err.message || 'שגיאת אימות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Left panel — decorative, hidden on small screens */}
      <div className="login-panel-left" aria-hidden="true">
        <div className="login-panel-left-inner">
          <img
            src="https://images.unsplash.com/photo-1758876202980-0a28b744fb24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
            alt=""
            className="login-panel-img"
          />
          <div className="login-panel-overlay">
            <div className="login-panel-badge">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7DD3FC', display: 'inline-block' }} />
              מערכת ניהול עסקי
            </div>
            <h2 className="login-panel-title">נהל את העסק שלך<br />בצורה חכמה יותר</h2>
            <p className="login-panel-subtitle">
              כל הכלים לניהול לקוחות, הזמנות, הצעות מחיר ומשימות — במקום אחד
            </p>
            <div className="login-panel-features">
              <div className="login-panel-feature">
                <span className="login-panel-feature-dot" />
                ניהול לקוחות ואנשי קשר
              </div>
              <div className="login-panel-feature">
                <span className="login-panel-feature-dot" />
                הצעות מחיר והזמנות דיגיטליות
              </div>
              <div className="login-panel-feature">
                <span className="login-panel-feature-dot" />
                דוחות וניתוח נתונים בזמן אמת
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-panel-right">
        {mfaSetupStep ? (
          <form className="login-card" onSubmit={handleMfaSetup} dir="rtl">
            <div className="login-logo">
              <div className="login-logo-icon">B</div>
              <span className="login-logo-text">BIZapp</span>
            </div>
            <div className="login-heading">
              <h1 className="login-title">הגדרת אימות דו-שלבי</h1>
              <p className="login-subtitle">המנהל מחייב שימוש ב-MFA. הגדר אותו עכשיו כדי להמשיך.</p>
            </div>
            {error && <div className="login-error" role="alert">{error}</div>}
            {setupQr ? (
              <>
                <div style={{ textAlign: 'center', margin: '12px 0' }}>
                  <img src={setupQr} alt="QR Code" style={{ width: 160, height: 160, border: '4px solid #fff', borderRadius: 8 }} />
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                    סרוק עם <strong>Google Authenticator</strong> / <strong>Authy</strong>
                  </p>
                  {setupSecret && (
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                      או הזן ידנית: <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, letterSpacing: 2 }}>{setupSecret}</code>
                    </p>
                  )}
                </div>
                <div className="login-field">
                  <label htmlFor="lp-setup-code">קוד אימות (6 ספרות)</label>
                  <input
                    id="lp-setup-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={setupCode}
                    onChange={e => { setSetupCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                    placeholder="000000"
                    dir="ltr"
                    autoFocus
                    style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8 }}
                  />
                </div>
                <button type="submit" className="login-submit" disabled={loading || setupCode.length < 6}>
                  {loading ? 'מאמת...' : 'אפשר MFA וכנס'}
                </button>
              </>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px 0' }}>טוען קוד QR...</p>
            )}
          </form>
        ) : mfaStep ? (
          <form className="login-card" onSubmit={handleMfa} dir="rtl">
            <div className="login-logo">
              <div className="login-logo-icon">B</div>
              <span className="login-logo-text">BIZapp</span>
            </div>
            <div className="login-heading">
              <h1 className="login-title">אימות דו-שלבי</h1>
              <p className="login-subtitle">פתח את אפליקציית האימות והזן את הקוד</p>
            </div>
            {error && <div className="login-error" role="alert">{error}</div>}
            <div className="login-field">
              <label htmlFor="lp-mfa">קוד אימות (6 ספרות)</label>
              <input
                id="lp-mfa"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={mfaCode}
                onChange={e => { setMfaCode(e.target.value.replace(/\D/g,'')); setError(''); }}
                placeholder="000000"
                dir="ltr"
                autoFocus
                style={{ textAlign:'center', fontSize:22, letterSpacing:8 }}
              />
            </div>
            <button type="submit" className="login-submit" disabled={loading || mfaCode.length < 6}>
              {loading ? 'מאמת...' : 'כניסה'}
            </button>
            <p style={{ textAlign:'center', marginTop:12, fontSize:13 }}>
              <button type="button" onClick={() => { setMfaStep(false); setMfaCode(''); setError(''); }} style={{ background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:13 }}>
                חזרה
              </button>
            </p>
          </form>
        ) : (
          <form className="login-card" onSubmit={handleLogin} dir="rtl">
            <div className="login-logo">
              <div className="login-logo-icon">B</div>
              <span className="login-logo-text">BIZapp</span>
            </div>
            <div className="login-heading">
              <h1 className="login-title">ברוכים הבאים</h1>
              <p className="login-subtitle">כניסה למערכת הניהול העסקי</p>
            </div>
            {error && <div className="login-error" role="alert">{error}</div>}
            <div className="login-field">
              <label htmlFor="lp-username">שם משתמש</label>
              <input
                id="lp-username"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="הזן שם משתמש"
                dir="ltr"
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="login-field">
              <label htmlFor="lp-password">סיסמא</label>
              <div className="login-password-wrap">
                <input
                  id="lp-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="הזן סיסמא"
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button type="button" className="login-toggle-pass" onClick={() => setShowPass(p => !p)} aria-label={showPass ? 'הסתר סיסמא' : 'הצג סיסמא'}>
                  {showPass ? <i className="ti ti-eye-off" /> : <i className="ti ti-eye" />}
                </button>
              </div>
              <div style={{ textAlign: 'left', marginTop: 5 }}>
                <Link to="/forgot-password" style={{ fontSize:12, color:'var(--accent)', textDecoration:'none' }}>
                  שכחתי סיסמא
                </Link>
              </div>
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'מתחבר...' : 'כניסה למערכת'}
            </button>
            <p className="login-footer">מערכת BIZapp — ניהול עסקי מתקדם</p>
          </form>
        )}
      </div>
    </div>
  );
}
