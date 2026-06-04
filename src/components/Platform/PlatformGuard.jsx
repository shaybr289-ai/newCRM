import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function PlatformGuard({ children }) {
  const isPlatformAdmin = useAuthStore(s => s.isPlatformAdmin);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) return null;
  if (!isPlatformAdmin) return <Navigate to="/platform/login" replace />;
  return children;
}
