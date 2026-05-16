import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ScrollButtons from './ScrollButtons';
import './MainLayout.css';

export default function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
      <ScrollButtons />
    </div>
  );
}
