import { useProfiles } from '../../hooks/useProfiles';

export function ReportPermissionsTab({ rpt, upd, users, permSearch, setPermSearch }) {
  const { data: profilesData } = useProfiles();
  const profiles = profilesData?.data || [];

  const hasRestriction = (rpt.viewerProfileIds?.length || 0) + (rpt.viewerUserIds?.length || 0) > 0;
  return (
    <div>
      <p className="rpt-hint">
        ברירת מחדל — כל משתמשי המערכת רשאים לצפות בדוח.<br />
        בחר פרופילים ו/או משתמשים ספציפיים כדי להגביל את הגישה. יוצר הדוח תמיד יוכל לראות אותו.
      </p>

      {hasRestriction && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FFB900', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#7A5700', marginBottom: 16 }}>
          <strong>הגבלת גישה פעילה</strong> — רק פרופילים / משתמשים שנבחרו יוכלו לצפות בדוח.
          <button onClick={() => { upd('viewerProfileIds', []); upd('viewerUserIds', []); }}
            style={{ marginRight: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#0A5E9A', fontSize: 12, textDecoration: 'underline' }}>
            בטל הגבלה
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Profiles */}
        <div style={{ minWidth: 200 }}>
          <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 10 }}>פרופילי משתמש</label>
          {profiles.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
              לא הוגדרו פרופילים במערכת
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profiles.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox"
                    checked={(rpt.viewerProfileIds || []).includes(p.id)}
                    onChange={e => {
                      const ids = rpt.viewerProfileIds || [];
                      upd('viewerProfileIds', e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id));
                    }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Specific users */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 10 }}>
            משתמשים ספציפיים
            {(rpt.viewerUserIds || []).length > 0 && (
              <span style={{ marginRight: 8, background: 'var(--accent)', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: 11 }}>
                {(rpt.viewerUserIds || []).length}
              </span>
            )}
          </label>
          <div style={{ border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxWidth: 360 }}>
            <input
              value={permSearch}
              onChange={e => setPermSearch(e.target.value)}
              placeholder="חיפוש משתמש..."
              style={{ width: '100%', padding: '7px 12px', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
            />
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {users
                .filter(u => u.status !== 'inactive')
                .filter(u => !permSearch || `${u.first_name || ''} ${u.last_name || ''} ${u.username || ''}`.toLowerCase().includes(permSearch.toLowerCase()))
                .map(u => {
                  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '—';
                  const checked = (rpt.viewerUserIds || []).includes(u.id);
                  const profileName = profiles.find(p => p.id === u.profile_id)?.name;
                  return (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', background: checked ? 'var(--accent-light)' : '' }}>
                      <input type="checkbox" checked={checked}
                        onChange={e => {
                          const ids = rpt.viewerUserIds || [];
                          upd('viewerUserIds', e.target.checked ? [...ids, u.id] : ids.filter(id => id !== u.id));
                        }}
                      />
                      <span style={{ flex: 1 }}>{name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{profileName || u.role_title || '—'}</span>
                    </label>
                  );
                })
              }
              {users.length === 0 && (
                <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>טוען משתמשים...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
