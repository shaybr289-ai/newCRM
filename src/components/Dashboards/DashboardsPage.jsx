import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboards, useCreateDashboard, useDeleteDashboard } from '../../hooks/useDashboards';
import './Dashboard.css';

export default function DashboardsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboards();
  const createDashboard = useCreateDashboard();
  const deleteDashboard = useDeleteDashboard();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [delConfirm, setDelConfirm] = useState(null);

  const dashboards = data?.data || [];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const db = await createDashboard.mutateAsync({ name: newName.trim(), description: newDesc.trim() || null });
    setShowNew(false);
    setNewName('');
    setNewDesc('');
    navigate(`/dashboards/${db.id}`);
  };

  const handleDelete = async (id) => {
    await deleteDashboard.mutateAsync(id);
    setDelConfirm(null);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="animate-in db-list-page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">דשבורדים</h1>
          <p className="page-subtitle">נהל וצור דשבורדים עם וידג׳יטים מקושרים לנתוני המערכת</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <i className="ti ti-plus" /> דשבורד חדש
        </button>
      </div>

      {/* New dashboard modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>דשבורד חדש</h3>
              <button className="widget-btn" onClick={() => setShowNew(false)}><i className="ti ti-x" /></button>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="field-label">שם הדשבורד *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="למשל: דשבורד מכירות"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <div>
                <label className="field-label">תיאור (אופציונלי)</label>
                <input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="תיאור קצר..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNew(false)}>ביטול</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!newName.trim() || createDashboard.isPending}
              >
                {createDashboard.isPending ? 'יוצר...' : 'צור דשבורד'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {delConfirm && (
        <div className="modal-overlay" onClick={() => setDelConfirm(null)}>
          <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>מחיקת דשבורד</h3>
              <button className="widget-btn" onClick={() => setDelConfirm(null)}><i className="ti ti-x" /></button>
            </div>
            <p style={{ padding: '16px 24px', color: 'var(--text-2)' }}>
              האם למחוק את <strong>{delConfirm.name}</strong>? פעולה זו אינה הפיכה.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelConfirm(null)}>ביטול</button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(delConfirm.id)}
                disabled={deleteDashboard.isPending}
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading && (
        <div className="db-loading">
          <div className="db-spinner" />
          <p>טוען...</p>
        </div>
      )}

      {!isLoading && dashboards.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
          <i className="ti ti-layout-dashboard" style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 16, marginBottom: 8 }}>אין דשבורדים עדיין</p>
          <p style={{ fontSize: 13 }}>לחץ על "דשבורד חדש" כדי להתחיל</p>
        </div>
      )}

      {!isLoading && dashboards.length > 0 && (
        <div className="db-cards-grid">
          {dashboards.map(db => (
            <div key={db.id} className="db-card card" onClick={() => navigate(`/dashboards/${db.id}`)}>
              <div className="db-card-icon">
                <i className="ti ti-layout-dashboard" />
              </div>
              <div className="db-card-body">
                <div className="db-card-name">{db.name}</div>
                {db.description && <div className="db-card-desc">{db.description}</div>}
                <div className="db-card-meta">
                  <span><i className="ti ti-layout-grid" /> {db.widget_count} וידג׳יטים</span>
                  <span><i className="ti ti-clock" /> {fmtDate(db.updated_at)}</span>
                  {db.is_public && <span className="db-card-public"><i className="ti ti-world" /> ציבורי</span>}
                </div>
              </div>
              <button
                className="db-card-delete"
                title="מחק"
                onClick={e => { e.stopPropagation(); setDelConfirm(db); }}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
