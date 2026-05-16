import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const login = useAuthStore(s => s.login);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const navigate = useNavigate();

  // Already logged in — redirect to home
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
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.message;
      if (msg === 'Invalid credentials') setError('שם משתמש או סיסמא שגויים');
      else if (msg === 'Account is inactive') setError('משתמש זה אינו פעיל. פנה למנהל המערכת');
      else setError(msg || 'שגיאת התחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-header">
          <div className="login-icon">B</div>
          <h1 className="login-title">BIZ-APP</h1>
          <p className="login-subtitle">כניסה למערכת הניהול העסקי</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="login-field">
          <label>שם משתמש</label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="הזן שם משתמש"
            dir="ltr"
            autoFocus
          />
        </div>

        <div className="login-field">
          <label>סיסמא</label>
          <div className="login-password-wrap">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="הזן סיסמא"
              dir="ltr"
            />
            <button
              type="button"
              className="login-toggle-pass"
              onClick={() => setShowPass(p => !p)}
              aria-label={showPass ? 'הסתר סיסמא' : 'הצג סיסמא'}
            >
              {showPass
                ? <i className="ti ti-eye-off" aria-hidden="true" />
                : <i className="ti ti-eye" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={loading}
        >
          {loading ? 'מתחבר...' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}
