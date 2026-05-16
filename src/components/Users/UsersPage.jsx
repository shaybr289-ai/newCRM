import { useState, useMemo } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks/useUsers';
import { useProfiles, useCreateProfile, useUpdateProfile, useDeleteProfile } from '../../hooks/useProfiles';
import { MODULES } from '../../utils/modules';
import { Icon, ICONS } from '../../utils/icons';
import ModuleTopbar from '../Layout/ModuleTopbar';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';
import './UsersPage.css';

// ── FieldOps Toggle Switch ─────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled = false, label = '', title = '' }) {
  return (
    <label className="fo-toggle-wrap" title={title}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="fo-toggle-pill" />
      {label && <span className="fo-toggle-label">{label}</span>}
    </label>
  );
}

const ROLES = [
  { id: 'superadmin', label: 'סופר אדמין', color: '#EF4444', icon: '👑' },
  { id: 'admin', label: 'אדמין', color: '#F59E0B', icon: '🛡️' },
  { id: 'user', label: 'משתמש', color: '#10B981', icon: '👤' },
];

const TOOL_PERMS = [
  { id: 'massUpdate', label: 'עדכון המוני' },
  { id: 'massDelete', label: 'מחיקה המונית' },
  { id: 'massTransfer', label: 'העברה המונית' },
  { id: 'changeOwner', label: 'שינוי בעלים' },
  { id: 'manageUsers', label: 'ניהול משתמשים' },
  { id: 'convert', label: 'המרה' },
  { id: 'massConvert', label: 'המרה המונית' },
  { id: 'importRecords', label: 'יבוא רשומות' },
  { id: 'exportRecords', label: 'יצוא רשומות' },
];

const ACTIONS = ['view', 'create', 'edit', 'delete'];
const ACTION_LABELS = { view: 'צפייה', create: 'יצירה', edit: 'עריכה', delete: 'מחיקה' };

// Modules visible in the mobile app. Add new entries here to expose them
// in the profile permissions editor. (DB Debug is intentionally NOT here —
// it's hard-gated to superAdmin only on the mobile side.)
const MOBILE_MODULES = [
  { id: 'tasks',      label: 'משימות',  icon: 'ti-checkbox' },
  { id: 'attendance', label: 'נוכחות',  icon: 'ti-clock'    },
  { id: 'forms',      label: 'טפסים',   icon: 'ti-forms'    },
  { id: 'customers',  label: 'לקוחות',  icon: 'ti-users'    },
];

const USER_TYPES = [['user', 'משתמש'], ['superAdmin', 'סופר אדמין']];
const LANGS = [['he', 'עברית'], ['en', 'English']];

const emptyUser = () => ({
  firstName: '', lastName: '', email: '', phone: '', mobile: '',
  roleTitle: '', department: '', managerId: '',
  username: '', password: '',
  userType: 'user', profileId: '', status: 'active',
  systemLanguage: 'he',
});

export default function UsersPage({ embedded = false }) {
  const [tab, setTab] = useState('users');

  return (
    <div className={embedded ? undefined : 'animate-in'}>
      {!embedded && (
        <ModuleTopbar icon="ti-users" title="משתמשים והרשאות" />
      )}

      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {[['users', 'הקמת משתמשים'], ['profiles', 'פרופיל משתמש'], ['profileperms', 'הרשאות לפרופיל']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`,
              color: tab === k ? 'var(--accent)' : 'var(--text-2)',
              fontWeight: tab === k ? 700 : 400, fontSize: 13,
            }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'profiles' && <ProfilesTab />}
      {tab === 'profileperms' && <ProfilePermsTab />}
    </div>
  );
}

// ── Users Tab ──
function UsersTab() {
  const { data: usersData, isLoading } = useUsers({ limit: 500 });
  const { data: profilesData } = useProfiles();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const [form, setForm] = useState(null);
  const [formTab, setFormTab] = useState('info');
  const [confirmDel, setConfirmDel] = useState(null);
  const [showPass, setShowPass] = useState(false);

  const users = usersData?.data || [];
  const profiles = profilesData?.data || [];
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleEdit = (user) => {
    setForm({
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      mobile: user.mobile || '',
      roleTitle: user.role_title || '',
      department: user.department || '',
      managerId: user.manager_id || '',
      username: user.username || '',
      password: '',
      userType: user.user_type || 'user',
      profileId: user.profile_id || '',
      status: user.status || 'active',
      systemLanguage: user.system_language || 'he',
    });
    setFormTab('info');
  };

  const handleSave = async () => {
    if (!form.firstName?.trim()) { alert('שם פרטי הוא שדה חובה'); return; }
    try {
      if (form.id) await updateMut.mutateAsync(form);
      else await createMut.mutateAsync(form);
      setForm(null);
    } catch (err) {
      alert(err.message || 'שגיאה בשמירה');
    }
  };

  const handleDelete = async () => {
    try { await deleteMut.mutateAsync(confirmDel.id); setConfirmDel(null); }
    catch (err) { alert(err.message || 'שגיאה במחיקה'); }
  };

  // Full-page editor
  if (form) {
    const selectedProfile = profiles.find(p => p.id === form.profileId);
    const modulePerms = selectedProfile?.module_perms || {};
    const toolPerms = selectedProfile?.tool_perms || {};

    return (
      <div className="animate-in">
        <div className="editor-topbar">
          <button className="btn btn-ghost" onClick={() => setForm(null)}>
            <Icon svg={ICONS.back} size={16} /> חזרה לרשימה
          </button>
          <div className="editor-topbar-title">
            <h1>{form.id ? `עריכת משתמש — ${form.firstName} ${form.lastName || ''}` : 'משתמש חדש'}</h1>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
          {[['info', 'פרטים'], ['system', 'הגדרות מערכת'], ['profile', 'פרופיל'], ['permissions', 'הרשאות']].map(([k, l]) => (
            <button key={k} onClick={() => setFormTab(k)}
              style={{
                padding: '7px 14px', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${formTab === k ? 'var(--accent)' : 'transparent'}`,
                color: formTab === k ? 'var(--accent)' : 'var(--text-2)',
                fontWeight: formTab === k ? 700 : 400, fontSize: 12,
              }}>
              {l}
            </button>
          ))}
        </div>

        <div className="card">
          {formTab === 'info' && (
            <div className="form-grid">
              <div className="form-field"><label>שם פרטי *</label><input value={form.firstName} onChange={e => upd('firstName', e.target.value)} autoFocus /></div>
              <div className="form-field"><label>שם משפחה</label><input value={form.lastName} onChange={e => upd('lastName', e.target.value)} /></div>
              <div className="form-field"><label>תפקיד</label><input value={form.roleTitle} onChange={e => upd('roleTitle', e.target.value)} placeholder="לדוגמה: מנהל מכירות" /></div>
              <div className="form-field"><label>מחלקה</label><input value={form.department} onChange={e => upd('department', e.target.value)} /></div>
              <div className="form-field"><label>כפוף למנהל</label>
                <select value={form.managerId || ''} onChange={e => upd('managerId', e.target.value)}>
                  <option value="">— ללא מנהל —</option>
                  {users.filter(u => u.id !== form.id).map(u => (
                    <option key={u.id} value={u.id}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.id}</option>
                  ))}
                </select>
              </div>
              <div className="form-field"><label>דוא"ל</label><input type="email" value={form.email} onChange={e => upd('email', e.target.value)} dir="ltr" /></div>
              <div className="form-field"><label>טלפון נייד</label><input type="tel" value={form.mobile} onChange={e => upd('mobile', e.target.value)} dir="ltr" /></div>
              <div className="form-field"><label>טלפון</label><input type="tel" value={form.phone} onChange={e => upd('phone', e.target.value)} dir="ltr" /></div>
              <div className="form-field"><label>סטטוס</label>
                <select value={form.status} onChange={e => upd('status', e.target.value)}>
                  <option value="active">פעיל</option>
                  <option value="inactive">לא פעיל</option>
                </select>
              </div>
            </div>
          )}

          {formTab === 'system' && (
            <div className="form-grid">
              <div className="form-field"><label>שם משתמש (Login)</label><input value={form.username} onChange={e => upd('username', e.target.value)} placeholder="john.doe" dir="ltr" /></div>
              <div className="form-field"><label>סיסמא {form.id && '(השאר ריק לשמירה)'}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => upd('password', e.target.value)}
                    placeholder={form.id ? 'הזן סיסמא חדשה' : 'הזן סיסמא'} dir="ltr" />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)' }}>
                    <i className={`ti ${showPass ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" style={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>
              <div className="form-field"><label>שפת מערכת</label>
                <select value={form.systemLanguage} onChange={e => upd('systemLanguage', e.target.value)}>
                  {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-field"><label>סוג משתמש</label>
                <select value={form.userType} onChange={e => upd('userType', e.target.value)}>
                  {USER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          {formTab === 'profile' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                בחר פרופיל עבור המשתמש. הפרופיל מגדיר את רמת ההרשאות במערכת.
              </p>
              {profiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  <p style={{ marginBottom: 12 }}>לא הוגדרו פרופילים עדיין</p>
                  <p style={{ fontSize: 12 }}>עבור לטאב "פרופיל משתמש" כדי ליצור פרופילים</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  <div onClick={() => upd('profileId', '')}
                    style={{
                      padding: 14, borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${!form.profileId ? 'var(--accent)' : 'var(--border)'}`,
                      background: !form.profileId ? 'var(--accent)11' : 'var(--bg-card)',
                    }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>— ללא פרופיל —</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>ללא הרשאות מוגדרות</div>
                  </div>
                  {profiles.map(p => {
                    const isSelected = form.profileId === p.id;
                    const permCount = Object.values(p.module_perms || {}).filter(mp => mp.view || mp.create || mp.edit || mp.delete).length;
                    return (
                      <div key={p.id} onClick={() => upd('profileId', p.id)}
                        style={{
                          padding: 14, borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          background: isSelected ? 'var(--accent)11' : 'var(--bg-card)',
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? 'var(--accent)' : 'var(--text-1)' }}>{p.name}</div>
                          {isSelected && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 600 }}>פעיל</span>}
                        </div>
                        {p.description && <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{p.description}</div>}
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {permCount > 0 ? `${permCount} מודולים עם הרשאות` : 'ללא הרשאות'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {formTab === 'permissions' && (
            <div>
              {!selectedProfile ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 12 }}>לא שויך פרופיל למשתמש זה</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>עבור לטאב "פרופיל" כדי לשייך פרופיל</p>
                  <button className="btn btn-secondary" onClick={() => setFormTab('profile')}>עבור לטאב פרופיל</button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 14, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>הרשאות לפי פרופיל: </span>
                    <strong style={{ color: 'var(--accent)' }}>{selectedProfile.name}</strong>
                  </div>
                  <h3 className="form-section-title">הרשאות מודולים</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
                    {MODULES.filter(m => m.id !== 'users').map(m => {
                      const perms = modulePerms[m.id] || {};
                      const actions = ACTIONS.filter(a => perms[a]).map(a => ACTION_LABELS[a]);
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12 }}>
                          <span>{m.label}</span>
                          <span style={{ color: actions.length > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontSize: 10 }}>
                            {actions.length > 0 ? actions.join(', ') : 'ללא גישה'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <h3 className="form-section-title" style={{ marginTop: 20 }}>הרשאות כלי</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {TOOL_PERMS.map(t => {
                      const has = !!(toolPerms[t.id]?.use);
                      return (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12 }}>
                          <span>{t.label}</span>
                          <span style={{ color: has ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{has ? '✓' : '✕'}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => { setForm(emptyUser()); setFormTab('info'); }}>
          <i className="ti ti-plus" aria-hidden="true" /> משתמש חדש
        </button>
      </div>

      {confirmDel && (
        <div style={{ background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#EF4444' }}>
            מחיקת "{confirmDel.first_name} {confirmDel.last_name}"? פעולה זו אינה הפיכה.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
            <button className="btn btn-danger" onClick={handleDelete}>מחק</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>שם</th>
              <th style={{ padding: 10, textAlign: 'right' }}>דוא"ל</th>
              <th style={{ padding: 10, textAlign: 'right' }}>תפקיד</th>
              <th style={{ padding: 10, textAlign: 'right' }}>מחלקה</th>
              <th style={{ padding: 10, textAlign: 'right' }}>פרופיל</th>
              <th style={{ padding: 10, textAlign: 'center' }}>סטטוס</th>
              <th style={{ padding: 10, textAlign: 'center', width: 100 }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center' }}>טוען...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>אין משתמשים במערכת</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || '(ללא שם)'}</div>
                  {u.username && <div style={{ fontSize: 11, color: 'var(--text-3)', direction: 'ltr' }}>{u.username}</div>}
                </td>
                <td style={{ padding: 10, direction: 'ltr', textAlign: 'right' }}>{u.email || '—'}</td>
                <td style={{ padding: 10 }}>{u.role_title || '—'}</td>
                <td style={{ padding: 10 }}>{u.department || '—'}</td>
                <td style={{ padding: 10 }}>
                  {u.profile_name ? <span style={{ padding: '2px 8px', borderRadius: 12, background: 'var(--accent)22', color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>{u.profile_name}</span> : '—'}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {u.status === 'active' ? 'פעיל' : 'לא פעיל'}
                  </span>
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button onClick={() => handleEdit(u)} title="עריכה" className="up-icon-btn up-icon-btn--edit" aria-label="עריכה">
                    <i className="ti ti-edit" aria-hidden="true" />
                  </button>
                  <button onClick={() => setConfirmDel(u)} title="מחיקה" className="up-icon-btn up-icon-btn--del" aria-label="מחיקה">
                    <i className="ti ti-trash" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Profiles Tab ──
function ProfilesTab() {
  const { data, isLoading } = useProfiles();
  const createMut = useCreateProfile();
  const updateMut = useUpdateProfile();
  const deleteMut = useDeleteProfile();

  const [form, setForm] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const profiles = data?.data || [];
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleEdit = (p) => setForm({ id: p.id, name: p.name, description: p.description || '', modulePerms: p.module_perms || {}, toolPerms: p.tool_perms || {} });

  const handleSave = async () => {
    if (!form.name?.trim()) { alert('שם פרופיל הוא שדה חובה'); return; }
    try {
      if (form.id) await updateMut.mutateAsync(form);
      else await createMut.mutateAsync(form);
      setForm(null);
    } catch (err) { alert(err.message || 'שגיאה בשמירה'); }
  };

  const handleDelete = async () => {
    try { await deleteMut.mutateAsync(confirmDel.id); setConfirmDel(null); }
    catch (err) { alert(err.message || 'שגיאה במחיקה'); }
  };

  if (form) {
    return (
      <div>
        <div className="editor-topbar">
          <button className="btn btn-ghost" onClick={() => setForm(null)}>
            <Icon svg={ICONS.back} size={16} /> חזרה לפרופילים
          </button>
          <div className="editor-topbar-title">
            <h1>{form.id ? `עריכת פרופיל — ${form.name}` : 'פרופיל חדש'}</h1>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור'}
          </button>
        </div>
        <div className="card">
          <div className="form-grid">
            <div className="form-field"><label>שם פרופיל *</label><input value={form.name} onChange={e => upd('name', e.target.value)} autoFocus /></div>
          </div>
          <div className="form-field" style={{ marginTop: 12 }}>
            <label>תיאור</label>
            <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={2} />
          </div>
          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)' }}>
            להגדרת ההרשאות של פרופיל זה, שמור תחילה ועבור לטאב "הרשאות לפרופיל".
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setForm({ name: '', description: '', modulePerms: {}, toolPerms: {} })}>
          <i className="ti ti-plus" aria-hidden="true" /> פרופיל חדש
        </button>
      </div>

      {confirmDel && (
        <div style={{ background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#EF4444' }}>מחיקת פרופיל "{confirmDel.name}"?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
            <button className="btn btn-danger" onClick={handleDelete}>מחק</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>שם פרופיל</th>
              <th style={{ padding: 10, textAlign: 'right' }}>תיאור</th>
              <th style={{ padding: 10, textAlign: 'center' }}>מודולים עם הרשאות</th>
              <th style={{ padding: 10, textAlign: 'center', width: 100 }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="4" style={{ padding: 20, textAlign: 'center' }}>טוען...</td></tr>
            ) : profiles.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>אין פרופילים במערכת</td></tr>
            ) : profiles.map(p => {
              const permCount = Object.values(p.module_perms || {}).filter(mp => mp.view || mp.create || mp.edit || mp.delete).length;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 10, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: 10, color: 'var(--text-2)' }}>{p.description || '—'}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 12, background: 'var(--accent)22', color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>
                      {permCount}
                    </span>
                  </td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    <button onClick={() => handleEdit(p)} title="עריכה" className="up-icon-btn up-icon-btn--edit" aria-label="עריכה">
                      <i className="ti ti-edit" aria-hidden="true" />
                    </button>
                    <button onClick={() => setConfirmDel(p)} title="מחיקה" className="up-icon-btn up-icon-btn--del" aria-label="מחיקה">
                      <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Profile Permissions Tab (matrix editor) ──
function ProfilePermsTab() {
  const { data } = useProfiles();
  const updateMut = useUpdateProfile();
  const profiles = data?.data || [];

  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);

  const selected = profiles.find(p => p.id === selectedId);

  const startEdit = (p) => {
    setSelectedId(p.id);
    setDraft({
      modulePerms: JSON.parse(JSON.stringify(p.module_perms || {})),
      toolPerms: JSON.parse(JSON.stringify(p.tool_perms || {})),
      mobileModules: Array.isArray(p.mobile_modules)
        ? [...p.mobile_modules]
        : ['tasks', 'attendance', 'forms', 'customers'], // sensible default for legacy profiles
    });
  };

  const toggleMobileModule = (modId, enabled) => setDraft(d => {
    const current = new Set(d.mobileModules || []);
    if (enabled) current.add(modId); else current.delete(modId);
    return { ...d, mobileModules: Array.from(current) };
  });

  const modulesForMatrix = MODULES.filter(m => m.id !== 'users');

  const setModPerm = (modId, action, val) => setDraft(d => ({
    ...d,
    modulePerms: { ...d.modulePerms, [modId]: { ...(d.modulePerms[modId] || {}), [action]: val } },
  }));

  const setToolPerm = (toolId, val) => setDraft(d => ({
    ...d,
    toolPerms: { ...d.toolPerms, [toolId]: { use: val } },
  }));

  // Column "check all" for module actions
  const toggleColumn = (action, val) => setDraft(d => {
    const next = { ...d.modulePerms };
    modulesForMatrix.forEach(m => {
      next[m.id] = { ...(next[m.id] || {}), [action]: val };
    });
    return { ...d, modulePerms: next };
  });
  const isColumnFullyChecked = (action) => draft && modulesForMatrix.every(m => !!draft.modulePerms[m.id]?.[action]);

  // "Check all" for tool perms
  const toggleAllTools = (val) => setDraft(d => {
    const next = {};
    TOOL_PERMS.forEach(t => { next[t.id] = { use: val }; });
    return { ...d, toolPerms: next };
  });
  const allToolsChecked = draft && TOOL_PERMS.every(t => !!draft.toolPerms[t.id]?.use);

  const handleSave = async () => {
    if (!selected || !draft) return;
    try {
      await updateMut.mutateAsync({
        id: selected.id,
        name: selected.name,
        description: selected.description,
        modulePerms: draft.modulePerms,
        toolPerms: draft.toolPerms,
        mobileModules: draft.mobileModules || [],
      });
      alert('הרשאות נשמרו');
    } catch (err) { alert(err.message || 'שגיאה בשמירה'); }
  };

  if (profiles.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
        <p style={{ fontSize: 14, marginBottom: 12 }}>אין פרופילים במערכת</p>
        <p style={{ fontSize: 12 }}>עבור לטאב "פרופיל משתמש" ליצור פרופילים</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: 1 }}>
          פרופילים ({profiles.length})
        </div>
        {profiles.map(p => (
          <div key={p.id} onClick={() => startEdit(p)}
            style={{
              padding: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)',
              background: selectedId === p.id ? 'var(--bg-elevated)' : 'transparent',
              borderRight: selectedId === p.id ? '3px solid var(--accent)' : '3px solid transparent',
            }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
            {p.description && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{p.description}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        {!selected ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>
            בחר פרופיל מהרשימה משמאל לעריכת הרשאות
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>הרשאות פרופיל: {selected.name}</h3>
              <button className="btn btn-primary" onClick={handleSave} disabled={updateMut.isPending}>
                {updateMut.isPending ? 'שומר...' : 'שמור שינויים'}
              </button>
            </div>

            <h4 className="form-section-title">הרשאות מודולים</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="up-perms-table">
                <thead>
                  <tr>
                    <th className="up-perms-th-module">מודול</th>
                    {ACTIONS.map(a => (
                      <th key={a} className="up-perms-th-action">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <span>{ACTION_LABELS[a]}</span>
                          <ToggleSwitch
                            checked={isColumnFullyChecked(a)}
                            onChange={e => toggleColumn(a, e.target.checked)}
                            title={`סמן/בטל הכל בעמודת ${ACTION_LABELS[a]}`}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modulesForMatrix.map(m => (
                    <tr key={m.id} className="up-perms-row">
                      <td className="up-perms-td-module">{m.label}</td>
                      {ACTIONS.map(a => (
                        <td key={a} className="up-perms-td-action">
                          <ToggleSwitch
                            checked={!!draft.modulePerms[m.id]?.[a]}
                            onChange={e => setModPerm(m.id, a, e.target.checked)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tasks-specific extra permission */}
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-checkbox" aria-hidden="true" style={{ fontSize: 16, color: '#0A5E9A', flexShrink: 0 }} />
              <ToggleSwitch
                checked={!!draft.modulePerms['tasks']?.reorder}
                onChange={e => setModPerm('tasks', 'reorder', e.target.checked)}
                label="משימות — סידור מחדש (גרירה באפליקציה)"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }}>
              <h4 className="form-section-title" style={{ margin: 0 }}>הרשאות כלי</h4>
              <ToggleSwitch
                checked={allToolsChecked}
                onChange={e => toggleAllTools(e.target.checked)}
                label="סמן הכל"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {TOOL_PERMS.map(t => (
                <div key={t.id} className="up-tool-card">
                  <ToggleSwitch
                    checked={!!draft.toolPerms[t.id]?.use}
                    onChange={e => setToolPerm(t.id, e.target.checked)}
                    label={t.label}
                  />
                </div>
              ))}
            </div>

            {/* Mobile app modules visibility ─────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }}>
              <h4 className="form-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-device-mobile" aria-hidden="true" style={{ fontSize: 16, color: '#0A5E9A' }} />
                אפליקציה ניידת — מודולים מוצגים
              </h4>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                כיבוי = לא יוצג כלל באפליקציית הטלפון
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {MOBILE_MODULES.map(m => {
                const enabled = (draft.mobileModules || []).includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`up-mobile-card${enabled ? ' up-mobile-card--on' : ''}`}
                  >
                    <i className={`ti ${m.icon}`} aria-hidden="true" style={{ fontSize: 20, color: '#0A5E9A' }} />
                    <span className="up-mobile-label">{m.label}</span>
                    <ToggleSwitch
                      checked={enabled}
                      onChange={e => toggleMobileModule(m.id, e.target.checked)}
                    />
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
              <i className="ti ti-info-circle" aria-hidden="true" style={{ fontSize: 13, verticalAlign: '-2px', marginLeft: 4 }} />
              "מצב DB" באפליקציה גלוי רק לסופר אדמין באופן קבוע — לא ניתן להגדיר אותו דרך הפרופיל.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
