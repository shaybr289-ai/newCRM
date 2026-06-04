import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Platform.css';

export default function ImpersonationBanner() {
  const impersonating = useAuthStore(s => s.impersonating);
  const exitTenant = useAuthStore(s => s.exitTenant);
  const navigate = useNavigate();

  if (!impersonating) return null;

  const handleExit = async () => {
    await exitTenant();
    navigate('/platform/tenants', { replace: true });
  };

  return (
    <div className="impersonation-banner">
      <i className="ti ti-eye" />
      <span>צופה כ: <strong>{impersonating.tenantName}</strong></span>
      <div className="impersonation-banner-spacer" />
      <button className="impersonation-banner-exit" onClick={handleExit}>
        <i className="ti ti-x" />
        יצא מהדמות
      </button>
    </div>
  );
}
