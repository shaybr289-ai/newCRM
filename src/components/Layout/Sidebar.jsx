import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Icon, ICONS } from '../../utils/icons';
import { MODULES } from '../../utils/modules';
import useAuthStore from '../../store/authStore';
import { canViewModule } from '../../hooks/usePerms';
import { useT } from '../../hooks/useT';
import MfaSetupModal from '../Auth/MfaSetupModal';
import './Sidebar.css';

/* ── Module groups ─────────────────────────────────────────────────────────── */
const GROUPS = [
  {
    id: 'crm',
    label: 'ניהול לקוחות',
    icon: `<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg>`,
    ids: ['customers', 'contacts', 'sites', 'serviceagreements', 'custitems'],
  },
  {
    id: 'sales',
    label: 'מכירות ומסחר',
    icon: `<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><line x1='12' y1='1' x2='12' y2='23'/><path d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'/></svg>`,
    ids: ['products', 'quotes', 'orders', 'deliverynotes', 'deals', 'leads'],
  },
  {
    id: 'ops',
    label: 'תפעול',
    icon: `<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='5' y='4' width='14' height='18' rx='2'/><path d='M9 4h6v3H9z'/><path d='M8 12l2 2 4-4'/></svg>`,
    ids: ['tasks', 'customerservices', 'forms', 'attendance'],
  },
  {
    id: 'mgmt',
    label: 'ניהול מערכת',
    icon: `<svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='3'/><path d='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'/></svg>`,
    ids: ['datamanagement', 'ai', 'dashboards', 'reports', 'users', 'bulkupdate'],
  },
];

/* ── Helper ────────────────────────────────────────────────────────────────── */
function initials(firstName, lastName) {
  return ((firstName?.[0] || '') + (lastName?.[0] || '')) || '?';
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { t } = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [showMfa, setShowMfa] = useState(false);

  /* sync collapsed state → body attribute so MainLayout CSS can react */
  useEffect(() => {
    document.body.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');
    return () => document.body.removeAttribute('data-sidebar');
  }, [collapsed]);

  const visible = MODULES.filter(m => {
    if (m.adminOnly && user?.userType !== 'superAdmin' && user?.userType !== 'admin') return false;
    return canViewModule(user, m.id);
  });

  return (
    <aside className={`fo-sb ${collapsed ? 'fo-sb--collapsed' : ''}`}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="fo-sb__logo">
        <div className="fo-sb__logo-icon">B</div>
        {!collapsed && <span className="fo-sb__logo-text">BIZ-APP</span>}
        <button
          className="fo-sb__toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'הרחב תפריט' : 'צמצם תפריט'}
          aria-label={collapsed ? 'הרחב תפריט' : 'צמצם תפריט'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>
              : <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>
            }
          </svg>
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="fo-sb__nav">

        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) => `fo-sb__item${isActive ? ' fo-sb__item--active' : ''}`}
          title={collapsed ? t('ראשי') || 'Home' : undefined}
        >
          <span className="fo-sb__item-icon"><Icon svg={ICONS.home} size={17} /></span>
          {!collapsed && <span className="fo-sb__item-label">{t('ראשי') || 'Home'}</span>}
        </NavLink>

        {/* Groups */}
        {GROUPS.map(group => {
          const mods = group.ids
            .map(id => visible.find(m => m.id === id))
            .filter(Boolean);
          if (!mods.length) return null;

          return (
            <div key={group.id} className="fo-sb__group">
              {collapsed
                ? <div className="fo-sb__group-divider" />
                : (
                  <div className="fo-sb__group-label">
                    <span
                      className="fo-sb__group-icon"
                      dangerouslySetInnerHTML={{ __html: group.icon }}
                    />
                    {t(group.label)}
                  </div>
                )
              }

              {mods.map(mod => (
                <NavLink
                  key={mod.id}
                  to={mod.path}
                  className={({ isActive }) =>
                    `fo-sb__item${isActive ? ' fo-sb__item--active' : ''}`
                  }
                  title={collapsed ? t(mod.label) : undefined}
                >
                  <span className="fo-sb__item-icon">
                    <Icon svg={ICONS[mod.icon] || ICONS.home} size={17} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="fo-sb__item-label">{t(mod.label)}</span>
                      <span
                        className="fo-sb__item-dot"
                        style={{ background: mod.color }}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="fo-sb__footer">
        <div className={`fo-sb__user${collapsed ? ' fo-sb__user--collapsed' : ''}`}>
          <div className="fo-sb__user-avatar">
            {initials(user?.firstName, user?.lastName)}
          </div>
          {!collapsed && (
            <div className="fo-sb__user-info">
              <div className="fo-sb__user-name">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="fo-sb__user-role">{user?.userType || 'user'}</div>
            </div>
          )}
        </div>

        <button
          className="fo-sb__item"
          onClick={() => setShowMfa(true)}
          title="אימות דו-שלבי (MFA)"
          style={{ opacity: 0.75 }}
        >
          <span className="fo-sb__item-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>
          </span>
          {!collapsed && <span className="fo-sb__item-label">אימות דו-שלבי</span>}
        </button>
        <button
          className="fo-sb__item fo-sb__logout"
          onClick={logout}
          title="יציאה"
        >
          <span className="fo-sb__item-icon"><Icon svg={ICONS.logout} size={17} /></span>
          {!collapsed && <span className="fo-sb__item-label">יציאה</span>}
        </button>
      </div>

      {showMfa && <MfaSetupModal onClose={() => setShowMfa(false)} />}

    </aside>
  );
}
