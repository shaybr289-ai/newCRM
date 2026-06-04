import { useState } from 'react';
import { usePerms } from '../../hooks/usePerms';
import ModuleTopbar from '../Layout/ModuleTopbar';
import AttendanceDashboard from './AttendanceDashboard';
import AttendanceList from './AttendanceList';
import MyAttendancePage from './MyAttendancePage';
import OvertimePanel from './OvertimePanel';
import ShiftTemplatesAdmin from './ShiftTemplatesAdmin';
import GeofenceAdmin from './GeofenceAdmin';
import MyClockWidget from './MyClockWidget';
import './Attendance.css';

const MANAGER_TABS = [
  { id: 'dashboard', label: 'דשבורד' },
  { id: 'list',      label: 'רשומות' },
  { id: 'my',        label: 'הנוכחות שלי' },
  { id: 'overtime',  label: 'שעות נוספות' },
  { id: 'settings',  label: 'הגדרות' },
];

const EMPLOYEE_TABS = [
  { id: 'my', label: 'הנוכחות שלי' },
];

export default function AttendancePage() {
  const { canEdit: isManager } = usePerms('attendance');
  const tabs = isManager ? MANAGER_TABS : EMPLOYEE_TABS;
  const [activeTab, setActiveTab] = useState(isManager ? 'dashboard' : 'my');
  const [settingsTab, setSettingsTab] = useState('shifts');

  return (
    <div className="attendance-page">
      <ModuleTopbar icon="ti-clock" title="נוכחות" />

      <MyClockWidget />

      <div className="attendance-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`att-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <AttendanceDashboard />}
      {activeTab === 'list' && <AttendanceList />}
      {activeTab === 'my' && <MyAttendancePage />}
      {activeTab === 'overtime' && <OvertimePanel />}

      {/* ── Settings tab ─────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button
              className={`att-tab ${settingsTab === 'shifts' ? 'active' : ''}`}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: settingsTab === 'shifts' ? 600 : 400, color: settingsTab === 'shifts' ? 'var(--accent)' : 'var(--text-2)' }}
              onClick={() => setSettingsTab('shifts')}
            >
              תבניות משמרת
            </button>
            <button
              className={`att-tab ${settingsTab === 'geofence' ? 'active' : ''}`}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: settingsTab === 'geofence' ? 600 : 400, color: settingsTab === 'geofence' ? 'var(--accent)' : 'var(--text-2)' }}
              onClick={() => setSettingsTab('geofence')}
            >
              אזורי גיאו-גידור
            </button>
          </div>
          {settingsTab === 'shifts'   && <ShiftTemplatesAdmin />}
          {settingsTab === 'geofence' && <GeofenceAdmin />}
        </div>
      )}
    </div>
  );
}
