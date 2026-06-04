import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Platform.css';

export default function PlatformLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const platformLogin = useAuthStore(s => s.platformLogin);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('יש להזין שם משתמש וסיסמא');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await platformLogin(username.trim(), password);
      navigate('/platform/tenants', { replace: true });
    } catch (err) {
      setError(err.message === 'Invalid credentials' ? 'שם משתמש או סיסמא שגויים' : err.message || 'שגיאת התחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="platform-login-page">
      <form className="platform-login-card" onSubmit={handleSubmit}>
        <div className="platform-login-logo">
          <div className="platform-login-logo-icon">B</div>
          <span className="platform-login-logo-text">BIZapp</span>
          <span className="platform-login-logo-badge">PLATFORM</span>
        </div>
        <h1 className="platform-login-title">כניסת מנהל פלטפורמה</h1>
        <p className="platform-login-subtitle">גישה מוגבלת למנהלי מערכת בלבד</p>
        {error && <div className="platform-login-error">{error}</div>}
        <div className="platform-login-field">
          <label>שם משתמש</label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="platform_admin"
            dir="ltr"
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="platform-login-field">
          <label>סיסמא</label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••"
            dir="ltr"
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="platform-login-submit" disabled={loading}>
          {loading ? 'מתחבר...' : 'כניסה לפלטפורמה'}
        </button>
      </form>
    </div>
  );
}
