import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ScrollButtons from './ScrollButtons';
import ImpersonationBanner from '../Platform/ImpersonationBanner';
import SessionWarningModal from './SessionWarningModal';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { useSettings } from '../../hooks/useDataManagement';
import './MainLayout.css';

export default function MainLayout() {
  const { data: settings } = useSettings();
  const timeoutMinutes = settings?.session_timeout_minutes
    ? parseInt(settings.session_timeout_minutes, 10) || 0
    : 0;

  const { showWarning, secondsLeft, stayActive } = useSessionTimeout(timeoutMinutes);

  return (
    <div className="app-layout" style={{ flexDirection: 'column' }}>
      <ImpersonationBanner />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <ScrollButtons />
      {showWarning && <SessionWarningModal secondsLeft={secondsLeft} onStayActive={stayActive} />}
    </div>
  );
}
