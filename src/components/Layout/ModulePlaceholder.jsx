import { useParams, Link } from 'react-router-dom';
import { Icon, ICONS } from '../../utils/icons';

export default function ModulePlaceholder({ title, icon }) {
  return (
    <div className="animate-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: 'var(--accent-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent)',
        margin: '0 auto 20px',
      }}>
        <Icon svg={ICONS[icon] || ICONS.home} size={36} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
        מודול זה בתהליך המרה לגרסה החדשה
      </p>
      <Link to="/" className="btn btn-secondary">
        חזרה לדף הראשי
      </Link>
    </div>
  );
}
