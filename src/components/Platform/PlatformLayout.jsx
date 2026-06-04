import { Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Platform.css';

export default function PlatformLayout() {
  const platformAdmin = useAuthStore(s => s.platformAdmin);
  const platformLogout = useAuthStore(s => s.platformLogout);
  const navigate = useNavigate();

  const handleLogout = () => {
    platformLogout();
    navigate('/platform/login', { replace: true });
  };

  return (
    <div className="platform-layout">
      <div className="platform-topbar">
        <div className="platform-topbar-logo">
          <span>B</span>
          BIZapp Platform
        </div>
        <div className="platform-topbar-spacer" />
        <span className="platform-topbar-user">
          <i className="ti ti-shield-lock" style={{ marginLeft: 4 }} />
          {platformAdmin?.username}
        </span>
        <button className="platform-topbar-btn" onClick={handleLogout}>
          <i className="ti ti-logout" />
          יציאה
        </button>
      </div>
      <div className="platform-content">
        <Outlet />
      </div>
    </div>
  );
}
