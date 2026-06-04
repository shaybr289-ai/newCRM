import { useState } from 'react';
import { Icon, ICONS } from '../../utils/icons';
import ModuleTopbar from '../Layout/ModuleTopbar';
import { usePerms } from '../../hooks/usePerms';
import CategoriesTab from './CategoriesTab';
import FamiliesTab from './FamiliesTab';
import HierarchyTab from './HierarchyTab';
import ManufacturersTab from './ManufacturersTab';
import ConditionsTab from './ConditionsTab';
import SettingsTab from './SettingsTab';
import LookupsTab from './LookupsTab';
import UsersPage from '../Users/UsersPage';
import './DataManagement.css';

const TABS = [
  { id: 'cats', label: 'קטגוריות אב', icon: 'datamanagement' },
  { id: 'families', label: 'משפחות מוצר', icon: 'products' },
  { id: 'manufacturers', label: 'יצרנים', icon: 'custitems' },
  { id: 'conditions', label: 'תנאים כלליים', icon: 'serviceagreements' },
  { id: 'lookups', label: 'רשימות Dropdown', icon: 'datamanagement' },
  { id: 'users', label: 'משתמשים והרשאות', icon: 'users' },
  { id: 'settings', label: 'הגדרות', icon: 'settings' },
];

export default function DataManagementPage() {
  const [activeTab, setActiveTab] = useState('cats');
  const { canEdit } = usePerms('datamanagement');
  const readOnly = !canEdit;

  return (
    <div className="animate-in">
      <ModuleTopbar icon="ti-settings" title="הגדרות" />

      {/* Tabs */}
      <div className="dm-tabs">
        {TABS.filter(tab => !readOnly || (tab.id !== 'conditions' && tab.id !== 'users')).map(tab => (
          <button
            key={tab.id}
            className={`dm-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon svg={ICONS[tab.icon] || ICONS.home} size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="dm-content card">
        {activeTab === 'cats' && <CategoriesTab readOnly={readOnly} />}
        {activeTab === 'families' && <FamiliesTab readOnly={readOnly} />}
        {activeTab === 'hierarchy' && <HierarchyTab />}
        {activeTab === 'manufacturers' && <ManufacturersTab readOnly={readOnly} />}
        {activeTab === 'conditions' && <ConditionsTab readOnly={readOnly} />}
        {activeTab === 'lookups' && <LookupsTab readOnly={readOnly} />}
        {activeTab === 'users' && <UsersPage embedded readOnly={readOnly} />}
        {activeTab === 'settings' && <SettingsTab readOnly={readOnly} />}
      </div>
    </div>
  );
}
