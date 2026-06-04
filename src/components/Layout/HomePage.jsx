import { Link } from 'react-router-dom';
import { Icon, ICONS } from '../../utils/icons';
import { MODULES } from '../../utils/modules';
import { useCompanyInfo } from '../../hooks/useDataManagement';
import useAuthStore from '../../store/authStore';
import { canViewModule } from '../../hooks/usePerms';

export default function HomePage() {
  const user = useAuthStore(s => s.user);
  const { data: company } = useCompanyInfo();

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {company?.logo && (
          <div style={{
            width: 120, height: 90,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0,
          }}>
            <img src={company.logo} alt={company.name || 'לוגו'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          {company?.name && (
            <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
              {company.name}
            </div>
          )}
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
            שלום, {user?.firstName || user?.username || 'משתמש'}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
            ברוכים הבאים למערכת הניהול העסקי
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 18,
      }}>
        {MODULES.filter(m => !m.adminOnly && canViewModule(user, m.id)).map(mod => (
          <ModuleTile key={mod.id} mod={mod} />
        ))}
      </div>
    </div>
  );
}

function ModuleTile({ mod }) {
  const color = mod.color || 'var(--accent)';
  return (
    <Link
      to={mod.path}
      className="module-tile"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '28px 18px 22px',
        textDecoration: 'none',
        color: 'var(--text-1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseOver={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 10px 24px -8px ${color}55`;
        e.currentTarget.style.borderColor = `${color}66`;
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Color accent stripe top */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 4,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
      }} />
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: `linear-gradient(135deg, ${color}22, ${color}11)`,
        border: `1.5px solid ${color}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        boxShadow: `inset 0 0 0 1px ${color}11`,
      }}>
        <Icon svg={ICONS[mod.icon] || ICONS.home} size={36} />
      </div>
      <span style={{
        fontWeight: 600,
        fontSize: 14,
        textAlign: 'center',
        color: 'var(--text-1)',
        lineHeight: 1.3,
      }}>{mod.label}</span>
    </Link>
  );
}
