import { useState, useMemo, useCallback } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useMfaRequireAll, useLoginHistory } from '../../hooks/useUsers';
import { useProfiles, useCreateProfile, useUpdateProfile, useDeleteProfile } from '../../hooks/useProfiles';
import { useSettings, useSaveSetting } from '../../hooks/useDataManagement';
import useAuthStore from '../../store/authStore';
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

const ACTIONS = ['view', 'create', 'edit', 'editFields', 'delete'];
const ACTION_LABELS = { view: 'צפייה', create: 'יצירה', edit: 'עריכה', editFields: 'ערוך שדות', delete: 'מחיקה' };

// Module-specific feature permissions
const MODULE_FEATURES = [
  { module: 'custitems',  id: 'feat_dynamicFields',     label: 'פריטי לקוח',  feature: 'שדות דינמיים' },
  { module: 'custitems',  id: 'feat_autoItemName',       label: 'פריטי לקוח',  feature: 'שם פריט אוטומטי' },
  { module: 'products',   id: 'feat_exportExcel',        label: 'מק"טים',       feature: 'יצוא Excel' },
  { module: 'products',   id: 'feat_importProducts',     label: 'מק"טים',       feature: 'יבוא מוצרים' },
  { module: 'quotes',     id: 'feat_templates',          label: 'הצעות מחיר',  feature: 'תבניות הצעות' },
  { module: 'quotes',     id: 'feat_editFields',         label: 'הצעות מחיר',  feature: 'ערוך שדות (עורך הצעה)' },
  { module: 'quotes',     id: 'feat_editCost',           label: 'הצעות מחיר',  feature: 'עריכת עלות פנימית' },
  { module: 'orders',     id: 'feat_newDeliveryNote',    label: 'הזמנות',       feature: 'תעודת משלוח חדשה' },
  { module: 'orders',     id: 'feat_deliveryNotes',      label: 'הזמנות',       feature: 'תעודות משלוח/החזרה' },
  { module: 'tasks',      id: 'feat_activityTemplates',  label: 'משימות',       feature: 'תבניות פעילויות' },
  { module: 'attendance', id: 'feat_settingsTab',        label: 'נוכחות',       feature: 'טאב הגדרות' },
];

// Button-level permissions per module (sections → buttons)
// true = allowed (default), false = denied
const MODULE_BUTTON_PERMS = {
  customers: {
    label: 'לקוחות',
    sections: [
      { id: 'main', label: 'מסך ראשי', buttons: [
        { id: 'btn_new_customer',      label: 'לקוח חדש' },
        { id: 'btn_edit_customer',     label: 'עריכת לקוח' },
        { id: 'btn_delete_customer',   label: 'מחק לקוח' },
      ]},
      { id: 'tab_contacts', label: 'טאב אנשי קשר', buttons: [
        { id: 'btn_new_contact',       label: 'איש קשר חדש' },
        { id: 'btn_save_contact',      label: 'שמור (עריכת איש קשר)' },
      ]},
      { id: 'tab_sites', label: 'טאב אתרי לקוח', buttons: [
        { id: 'btn_new_site',          label: 'אתר חדש' },
        { id: 'btn_save_site',         label: 'שמור (עריכת אתר)' },
      ]},
      { id: 'tab_agreements', label: 'טאב הסכמי שירות', buttons: [
        { id: 'btn_new_agreement',     label: 'הסכם חדש' },
        { id: 'btn_save_agreement',    label: 'שמור (עריכת הסכם)' },
      ]},
      { id: 'tab_items', label: 'טאב פריטים ושירותים', buttons: [
        { id: 'btn_new_item',          label: 'פריט חדש' },
      ]},
      { id: 'tab_quotes', label: 'טאב הצעות מחיר', buttons: [
        { id: 'btn_new_quote',         label: 'הצעת מחיר חדשה' },
      ]},
      { id: 'tab_deals', label: 'טאב עסקאות', buttons: [
        { id: 'btn_new_deal',          label: 'עסקה חדשה' },
      ]},
      { id: 'tab_orders', label: 'טאב הזמנות', buttons: [
        { id: 'btn_new_order',         label: 'הזמנה חדשה' },
      ]},
      { id: 'tab_delivery_notes', label: 'טאב תעודות משלוח', buttons: [
        { id: 'btn_new_delivery_note', label: 'תעודת משלוח חדשה' },
      ]},
    ],
  },
  contacts: {
    label: 'אנשי קשר',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new',    label: 'איש קשר חדש' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',   label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_delete', label: 'מחק' },
        { id: 'btn_save',   label: 'שמור' },
      ]},
    ],
  },
  sites: {
    label: 'אתרי לקוח',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new',    label: 'אתר חדש' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',   label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_delete', label: 'מחק' },
        { id: 'btn_save',   label: 'שמור' },
      ]},
    ],
  },
  serviceagreements: {
    label: 'הסכמי שירות',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new',    label: 'הסכם חדש' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',   label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_delete', label: 'מחק' },
        { id: 'btn_save',   label: 'שמור' },
      ]},
    ],
  },
  custitems: {
    label: 'פריטי לקוח',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new',           label: 'פריט חדש' },
        { id: 'btn_dynamic_fields',label: 'שדות דינמיים' },
        { id: 'btn_auto_name',     label: 'שם פריט אוטומטי' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',   label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_delete', label: 'מחק' },
        { id: 'btn_save',   label: 'שמור' },
      ]},
    ],
  },
  products: {
    label: 'מק"טים',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new',    label: 'מק"ט חדש' },
        { id: 'btn_import', label: 'ייבוא מוצרים' },
        { id: 'btn_export', label: 'יצוא Excel' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',      label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_movements', label: 'תנועות מלאי לפריט' },
        { id: 'btn_delete',    label: 'מחק' },
        { id: 'btn_save',      label: 'שמור' },
      ]},
    ],
  },
  quotes: {
    label: 'הצעות מחיר',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new',       label: 'הצעת מחיר חדשה' },
        { id: 'btn_templates', label: 'תבניות הצעות' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',         label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_delete',       label: 'מחק' },
        { id: 'btn_save',         label: 'שמור' },
        { id: 'btn_convert',      label: 'המר הצעה להזמנה' },
        { id: 'btn_send',         label: 'שלח הצעת מחיר' },
        { id: 'btn_preview',      label: 'תצוגה מקדימה' },
        { id: 'btn_edit_fields',  label: 'ערוך שדות' },
        { id: 'btn_relation_map', label: 'מפת קשרים' },
      ]},
    ],
  },
  orders: {
    label: 'הזמנות',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new', label: 'הזמנה חדשה' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',           label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_delete',         label: 'מחק' },
        { id: 'btn_save',           label: 'שמור' },
        { id: 'btn_delivery_new',   label: 'תעודת משלוח חדשה' },
        { id: 'btn_send',           label: 'שלח במייל' },
        { id: 'btn_delivery_notes', label: 'תעודות משלוח/החזרה' },
        { id: 'btn_relation_map',   label: 'מפת קשרים' },
      ]},
    ],
  },
  deliverynotes: {
    label: 'תעודות משלוח',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new', label: 'תעודה חדשה' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',         label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_save',         label: 'שמור' },
        { id: 'btn_send',         label: 'שלח במייל' },
        { id: 'btn_preview',      label: 'תצוגה מקדימה' },
        { id: 'btn_relation_map', label: 'מפת קשרים' },
      ]},
    ],
  },
  deals: {
    label: 'עסקאות',
    sections: [
      { id: 'list', label: 'מסך רשימה', buttons: [
        { id: 'btn_new', label: 'עסקה חדשה' },
      ]},
      { id: 'edit', label: 'מסך עריכה / צפייה', buttons: [
        { id: 'btn_view',         label: 'כניסה לצפייה ברשומה' },
        { id: 'btn_delete',       label: 'מחק' },
        { id: 'btn_save',         label: 'שמור' },
        { id: 'btn_relation_map', label: 'מפת קשרים' },
      ]},
    ],
  },
};

// ── Modal: configure button-level permissions for a specific module ────────
function ModuleButtonPermsModal({ moduleId, buttonPerms, onSave, onClose, readOnly }) {
  const moduleDef = MODULE_BUTTON_PERMS[moduleId];
  if (!moduleDef) return null;
  const [local, setLocal] = useState(() => ({ ...(buttonPerms[moduleId] || {}) }));
  const isAllowed = (btnId) => local[btnId] === true;
  const toggle = (btnId, val) => setLocal(p => ({ ...p, [btnId]: val }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 15 }}>הגדרת הרשאות כפתורים: {moduleDef.label}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ maxHeight: 480, overflowY: 'auto' }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
            הפעל כפתור כדי להציג אותו למשתמשי פרופיל זה. ברירת מחדל: כל הכפתורים מוסתרים.
          </p>
          {moduleDef.sections.map(section => (
            <div key={section.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                {section.label}
              </div>
              {section.buttons.map(btn => (
                <div key={btn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, background: isAllowed(btn.id) ? '#F0FDF4' : 'var(--bg-elevated)', marginBottom: 5, transition: 'background 0.15s' }}>
                  <span style={{ fontSize: 13, color: isAllowed(btn.id) ? '#166534' : 'var(--text-2)' }}>{btn.label}</span>
                  <ToggleSwitch checked={isAllowed(btn.id)} onChange={e => toggle(btn.id, e.target.checked)} disabled={readOnly} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{readOnly ? 'סגור' : 'ביטול'}</button>
          {!readOnly && (
            <button className="btn btn-primary" onClick={() => {
              // Build explicit map: every button gets true or false (no undefined)
              const explicit = {};
              moduleDef.sections.forEach(s => s.buttons.forEach(b => { explicit[b.id] = local[b.id] === true; }));
              onSave(moduleId, explicit);
              onClose();
            }}>שמור</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Modules visible in the mobile app. Add new entries here to expose them
// in the profile permissions editor. (DB Debug is intentionally NOT here —
// it's hard-gated to superAdmin only on the mobile side.)
const MOBILE_MODULES = [
  { id: 'tasks',      label: 'משימות',        icon: 'ti-checkbox',        canEdit: true },
  { id: 'attendance', label: 'נוכחות',        icon: 'ti-clock',           canEdit: true },
  { id: 'forms',      label: 'טפסים',         icon: 'ti-forms',           canEdit: true },
  { id: 'customers',  label: 'לקוחות',        icon: 'ti-users',           canEdit: true },
  { id: 'quotes',     label: 'הצעות מחיר',    icon: 'ti-file-invoice',    canEdit: true },
  { id: 'deals',      label: 'עסקאות',        icon: 'ti-briefcase',       canEdit: true },
];

const USER_TYPES = [['user', 'משתמש'], ['superAdmin', 'סופר אדמין']];
const LANGS = [['he', 'עברית'], ['en', 'English']];

const emptyUser = () => ({
  firstName: '', lastName: '', email: '', phone: '', mobile: '',
  roleTitle: '', department: '', managerId: '',
  username: '', password: '',
  userType: 'user', profileId: '', status: 'active',
  systemLanguage: 'he',
  mfaRequired: false,
});

export default function UsersPage({ embedded = false, readOnly = false }) {
  const [tab, setTab] = useState('users');

  return (
    <div className={embedded ? undefined : 'animate-in'}>
      {!embedded && (
        <ModuleTopbar icon="ti-users" title="משתמשים והרשאות" />
      )}

      {readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#F59E0B22', border: '1px solid #F59E0B44', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#92400E' }}>
          <i className="ti ti-eye" aria-hidden="true" style={{ fontSize: 15 }} />
          מצב צפייה בלבד — אין הרשאת עריכה בהגדרות
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {[['users', 'הקמת משתמשים'], ['profiles', 'פרופיל משתמש'], ['profileperms', 'הרשאות לפרופיל'], ['orgchart', 'היררכיית תפקידים'], ['security', 'אבטחה'], ['loginlog', 'היסטוריית כניסות']].map(([k, l]) => (
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

      {tab === 'users' && <UsersTab readOnly={readOnly} />}
      {tab === 'profiles' && <ProfilesTab readOnly={readOnly} />}
      {tab === 'profileperms' && <ProfilePermsTab readOnly={readOnly} />}
      {tab === 'orgchart' && <OrgChartTab readOnly={readOnly} />}
      {tab === 'security' && <SecurityTab readOnly={readOnly} />}
      {tab === 'loginlog' && <LoginLogTab />}
    </div>
  );
}

// ── Users Tab ──
function UsersTab({ readOnly = false }) {
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
      mfaRequired: user.mfa_required || false,
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
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: form.mfaRequired ? '#F0FDF4' : 'var(--bg-elevated)', borderRadius: 10, border: `1px solid ${form.mfaRequired ? '#86EFAC' : 'var(--border)'}`, transition: 'all 0.2s' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={form.mfaRequired ? '#16a34a' : 'var(--text-3)'} strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.mfaRequired ? '#15803d' : 'var(--text-1)' }}>דרוש אימות דו-שלבי (MFA)</div>
                    <div style={{ fontSize: 11, color: form.mfaRequired ? '#16a34a' : 'var(--text-3)', marginTop: 2 }}>
                      {form.mfaRequired ? 'המשתמש יחויב להגדיר MFA בכניסה הבאה' : 'המשתמש יכול לבחור אם להפעיל MFA'}
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={form.mfaRequired}
                    onChange={e => upd('mfaRequired', e.target.checked)}
                    disabled={readOnly}
                  />
                </div>
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
                    {MODULES.filter(m => m.id !== 'users' && m.id !== 'taskreport').map(m => {
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
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={() => { setForm(emptyUser()); setFormTab('info'); }}>
            <i className="ti ti-plus" aria-hidden="true" /> משתמש חדש
          </button>
        </div>
      )}

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
              <th style={{ padding: 10, textAlign: 'center' }}>MFA</th>
              <th style={{ padding: 10, textAlign: 'center' }}>סטטוס</th>
              <th style={{ padding: 10, textAlign: 'center', width: 100 }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8" style={{ padding: 20, textAlign: 'center' }}>טוען...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>אין משתמשים במערכת</td></tr>
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
                  {u.mfa_required ? (
                    <span title={u.mfa_enabled ? 'MFA פעיל' : 'MFA נדרש — לא הוגדר עדיין'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: u.mfa_enabled ? '#DCFCE7' : '#FEF3C7', color: u.mfa_enabled ? '#15803D' : '#92400E' }}>
                      {u.mfa_enabled ? '✓ פעיל' : '⚠ נדרש'}
                    </span>
                  ) : u.mfa_enabled ? (
                    <span style={{ fontSize: 11, color: '#15803D' }}>✓</span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>
                  )}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {u.status === 'active' ? 'פעיל' : 'לא פעיל'}
                  </span>
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  {!readOnly && (
                    <>
                      <button onClick={() => handleEdit(u)} title="עריכה" className="up-icon-btn up-icon-btn--edit" aria-label="עריכה">
                        <i className="ti ti-edit" aria-hidden="true" />
                      </button>
                      <button onClick={() => setConfirmDel(u)} title="מחיקה" className="up-icon-btn up-icon-btn--del" aria-label="מחיקה">
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </>
                  )}
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
function ProfilesTab({ readOnly = false }) {
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
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={() => setForm({ name: '', description: '', modulePerms: {}, toolPerms: {} })}>
            <i className="ti ti-plus" aria-hidden="true" /> פרופיל חדש
          </button>
        </div>
      )}

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
                    {!readOnly && (
                      <>
                        <button onClick={() => handleEdit(p)} title="עריכה" className="up-icon-btn up-icon-btn--edit" aria-label="עריכה">
                          <i className="ti ti-edit" aria-hidden="true" />
                        </button>
                        <button onClick={() => setConfirmDel(p)} title="מחיקה" className="up-icon-btn up-icon-btn--del" aria-label="מחיקה">
                          <i className="ti ti-trash" aria-hidden="true" />
                        </button>
                      </>
                    )}
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
function ProfilePermsTab({ readOnly = false }) {
  const { data } = useProfiles();
  const updateMut = useUpdateProfile();
  const profiles = data?.data || [];

  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);

  const selected = profiles.find(p => p.id === selectedId);

  const startEdit = (p) => {
    setSelectedId(p.id);
    // Build mobilePerms: prefer explicit mobile_perms from DB,
    // fall back to deriving view=true for each module in mobile_modules array.
    let mobilePerms = {};
    if (p.mobile_perms && typeof p.mobile_perms === 'object' && Object.keys(p.mobile_perms).length > 0) {
      mobilePerms = JSON.parse(JSON.stringify(p.mobile_perms));
    } else {
      const legacyVisible = new Set(
        Array.isArray(p.mobile_modules) ? p.mobile_modules : ['tasks', 'attendance', 'forms', 'customers']
      );
      MOBILE_MODULES.forEach(m => {
        mobilePerms[m.id] = { view: legacyVisible.has(m.id), edit: false };
      });
    }
    setDraft({
      modulePerms: JSON.parse(JSON.stringify(p.module_perms || {})),
      toolPerms: JSON.parse(JSON.stringify(p.tool_perms || {})),
      mobilePerms,
      buttonPerms: JSON.parse(JSON.stringify(p.button_perms || {})),
    });
  };

  const setMobilePerm = (modId, action, val) => setDraft(d => ({
    ...d,
    mobilePerms: {
      ...d.mobilePerms,
      [modId]: { ...(d.mobilePerms[modId] || {}), [action]: val },
    },
  }));

  // "View all / Edit all" header toggles
  const isMobileColChecked = (action) =>
    draft && MOBILE_MODULES.every(m => !!(draft.mobilePerms?.[m.id]?.[action]));
  const toggleMobileCol = (action, val) => setDraft(d => {
    const next = { ...d.mobilePerms };
    MOBILE_MODULES.forEach(m => {
      if (action === 'edit' && !m.canEdit) return; // skip non-editable modules for edit column
      next[m.id] = { ...(next[m.id] || {}), [action]: val };
    });
    return { ...d, mobilePerms: next };
  });

  const modulesForMatrix = MODULES.filter(m => m.id !== 'users' && m.id !== 'taskreport');

  const setModPerm = (modId, action, val) => setDraft(d => {
    const current = d.modulePerms[modId] || {};
    let next;
    if (action === 'view' && !val) {
      // Removing view clears all other permissions for this module
      next = { view: false };
    } else {
      next = { ...current, [action]: val };
    }
    return { ...d, modulePerms: { ...d.modulePerms, [modId]: next } };
  });

  const setToolPerm = (toolId, val) => setDraft(d => ({
    ...d,
    toolPerms: { ...d.toolPerms, [toolId]: { use: val } },
  }));

  const saveButtonPerms = (moduleId, perms) => setDraft(d => ({
    ...d,
    buttonPerms: { ...d.buttonPerms, [moduleId]: perms },
  }));

  const [buttonPermsModal, setButtonPermsModal] = useState(null); // moduleId or null

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
        mobilePerms: draft.mobilePerms || {},
        buttonPerms: draft.buttonPerms || {},
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
              {!readOnly && (
                <button className="btn btn-primary" onClick={handleSave} disabled={updateMut.isPending}>
                  {updateMut.isPending ? 'שומר...' : 'שמור שינויים'}
                </button>
              )}
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
                            disabled={readOnly}
                            title={`סמן/בטל הכל בעמודת ${ACTION_LABELS[a]}`}
                          />
                        </div>
                      </th>
                    ))}
                    <th className="up-perms-th-action" style={{ minWidth: 120, fontSize: 11, color: 'var(--text-3)' }}>ערכית הרשאות למודול</th>
                  </tr>
                </thead>
                <tbody>
                  {modulesForMatrix.map(m => {
                    const hasView = !!draft.modulePerms[m.id]?.view;
                    const hasButtonPerms = !!MODULE_BUTTON_PERMS[m.id];
                    const hasCustomButtonPerms = hasButtonPerms && Object.values(draft.buttonPerms[m.id] || {}).some(v => v === true);
                    return (
                      <tr key={m.id} className="up-perms-row" style={!hasView ? { opacity: 0.55 } : undefined}>
                        <td className="up-perms-td-module">{m.label}</td>
                        {ACTIONS.map(a => (
                          <td key={a} className="up-perms-td-action">
                            <ToggleSwitch
                              checked={!!draft.modulePerms[m.id]?.[a]}
                              onChange={e => setModPerm(m.id, a, e.target.checked)}
                              disabled={readOnly || (a !== 'view' && !hasView)}
                            />
                          </td>
                        ))}
                        <td className="up-perms-td-action">
                          {hasButtonPerms && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => setButtonPermsModal(m.id)}
                              disabled={!hasView}
                              title="עריכת הרשאות למודול"
                              style={{
                                fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                                ...(hasCustomButtonPerms ? { borderColor: '#F59E0B', color: '#92400E', background: '#FEF3C7' } : {}),
                              }}
                            >
                              <i className={`ti ${hasCustomButtonPerms ? 'ti-edit' : 'ti-lock-cog'}`} aria-hidden="true" style={{ fontSize: 13 }} />
                              הגדרות
                              {hasCustomButtonPerms && (
                                <i className="ti ti-check" aria-hidden="true" style={{ fontSize: 11, color: '#10B981' }} />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tasks-specific extra permission */}
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-checkbox" aria-hidden="true" style={{ fontSize: 16, color: '#0A5E9A', flexShrink: 0 }} />
              <ToggleSwitch
                checked={!!draft.modulePerms['tasks']?.reorder}
                onChange={e => setModPerm('tasks', 'reorder', e.target.checked)}
                disabled={readOnly}
                label="משימות — סידור מחדש (גרירה באפליקציה)"
              />
            </div>

            {/* Module feature permissions */}
            <h4 className="form-section-title" style={{ marginTop: 24 }}>הרשאות תכונות</h4>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>
              הגדר אילו כפתורים ותכונות יוצגו למשתמש בכל מודול
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {MODULE_FEATURES.map(f => {
                const hasView = !!draft.modulePerms[f.module]?.view;
                return (
                  <div key={f.id} className="up-tool-card" style={!hasView ? { opacity: 0.55 } : undefined}>
                    <ToggleSwitch
                      checked={!!draft.modulePerms[f.module]?.[f.id]}
                      onChange={e => setModPerm(f.module, f.id, e.target.checked)}
                      disabled={readOnly || !hasView}
                      label={`${f.label} — ${f.feature}`}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }}>
              <h4 className="form-section-title" style={{ margin: 0 }}>הרשאות כלי</h4>
              <ToggleSwitch
                checked={allToolsChecked}
                onChange={e => toggleAllTools(e.target.checked)}
                disabled={readOnly}
                label="סמן הכל"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {TOOL_PERMS.map(t => (
                <div key={t.id} className="up-tool-card">
                  <ToggleSwitch
                    checked={!!draft.toolPerms[t.id]?.use}
                    onChange={e => setToolPerm(t.id, e.target.checked)}
                    disabled={readOnly}
                    label={t.label}
                  />
                </div>
              ))}
            </div>

            {/* Mobile app permissions matrix ───────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }}>
              <h4 className="form-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-device-mobile" aria-hidden="true" style={{ fontSize: 16, color: '#0A5E9A' }} />
                אפליקציה ניידת — הרשאות מודולים
              </h4>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="up-perms-table">
                <thead>
                  <tr>
                    <th className="up-perms-th-module">מודול</th>
                    <th className="up-perms-th-action">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span>צפייה</span>
                        <ToggleSwitch
                          checked={isMobileColChecked('view')}
                          onChange={e => toggleMobileCol('view', e.target.checked)}
                          disabled={readOnly}
                          title="סמן/בטל הכל בעמודת צפייה"
                        />
                      </div>
                    </th>
                    <th className="up-perms-th-action">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span>עריכה</span>
                        <ToggleSwitch
                          checked={isMobileColChecked('edit')}
                          onChange={e => toggleMobileCol('edit', e.target.checked)}
                          disabled={readOnly}
                          title="סמן/בטל הכל בעמודת עריכה"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MOBILE_MODULES.map(m => {
                    const perms = draft.mobilePerms?.[m.id] || {};
                    return (
                      <tr key={m.id} className="up-perms-row">
                        <td className="up-perms-td-module">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className={`ti ${m.icon}`} aria-hidden="true" style={{ fontSize: 15, color: '#0A5E9A', flexShrink: 0 }} />
                            {m.label}
                          </div>
                        </td>
                        <td className="up-perms-td-action">
                          <ToggleSwitch
                            checked={!!perms.view}
                            onChange={e => setMobilePerm(m.id, 'view', e.target.checked)}
                            disabled={readOnly}
                          />
                        </td>
                        <td className="up-perms-td-action">
                          {m.canEdit ? (
                            <ToggleSwitch
                              checked={!!perms.edit}
                              onChange={e => setMobilePerm(m.id, 'edit', e.target.checked)}
                              disabled={readOnly || !perms.view}
                              title={!perms.view ? 'יש להפעיל צפייה תחילה' : ''}
                            />
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
              <i className="ti ti-info-circle" aria-hidden="true" style={{ fontSize: 13, verticalAlign: '-2px', marginLeft: 4 }} />
              כיבוי "צפייה" = המודול לא יוצג כלל באפליקציה. "עריכה" — רלוונטי למשימות וטפסים בלבד. "מצב DB" גלוי רק לסופר אדמין באופן קבוע.
            </p>
          </>
        )}
      </div>

      {buttonPermsModal && draft && (
        <ModuleButtonPermsModal
          moduleId={buttonPermsModal}
          buttonPerms={draft.buttonPerms}
          onSave={saveButtonPerms}
          onClose={() => setButtonPermsModal(null)}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

// ── Org Chart Tab ─────────────────────────────────────────────────────────
function OrgChartTab({ readOnly = false }) {
  const [subTab, setSubTab] = useState('tree');
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {[['tree', 'עץ תפקידים'], ['depts', 'מחלקות']].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            style={{ padding: '7px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: subTab === id ? 700 : 400,
              color: subTab === id ? 'var(--accent)' : 'var(--text-2)',
              borderBottom: subTab === id ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -2, fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>
      {subTab === 'tree' && <OrgTreeView readOnly={readOnly} />}
      {subTab === 'depts' && <DepartmentsView readOnly={readOnly} />}
    </div>
  );
}

function OrgTreeView({ readOnly = false }) {
  const { data, isLoading } = useUsers({ limit: 500 });
  const updateMut = useUpdateUser();
  const users = data?.data || [];
  const [editingId, setEditingId] = useState(null);
  const [newManagerId, setNewManagerId] = useState('');

  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);
  const { children, roots } = useMemo(() => {
    const ch = {};
    const r = [];
    users.forEach(u => {
      const mid = u.manager_id;
      if (mid && userMap[mid]) {
        if (!ch[mid]) ch[mid] = [];
        ch[mid].push(u);
      } else r.push(u);
    });
    return { children: ch, roots: r };
  }, [users, userMap]);

  const getUserName = (u) => (`${u.first_name || ''} ${u.last_name || ''}`).trim() || u.username || '—';

  const startEdit = (u) => { setEditingId(u.id); setNewManagerId(u.manager_id || ''); };
  const cancelEdit = () => { setEditingId(null); setNewManagerId(''); };
  const saveManager = async (u) => {
    await updateMut.mutateAsync({ id: u.id, managerId: newManagerId || null, firstName: u.first_name, lastName: u.last_name, username: u.username, userType: u.user_type, profileId: u.profile_id, status: u.status, email: u.email || '', roleTitle: u.role_title || '', department: u.department || '' });
    cancelEdit();
  };

  const renderNode = (u, depth = 0) => {
    const kids = children[u.id] || [];
    const isEditing = editingId === u.id;
    const managerName = u.manager_id && userMap[u.manager_id] ? getUserName(userMap[u.manager_id]) : null;
    return (
      <div key={u.id} style={{ marginRight: depth > 0 ? 28 : 0, borderRight: depth > 0 ? '2px solid var(--border)' : 'none', paddingRight: depth > 0 ? 14 : 0, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isEditing ? 'var(--accent)11' : 'var(--bg-elevated)', borderRadius: 8, marginBottom: 4, border: `1px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}` }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {(getUserName(u)[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{getUserName(u)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {u.role_title || ''}{u.department ? ` · ${u.department}` : ''}
              {managerName && !isEditing && <span style={{ color: 'var(--text-3)', marginRight: 4 }}>· כפוף ל: {managerName}</span>}
            </div>
            {isEditing && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <select value={newManagerId} onChange={e => setNewManagerId(e.target.value)}
                  style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}>
                  <option value="">-- ללא מנהל --</option>
                  {users.filter(x => x.id !== u.id).map(x => (
                    <option key={x.id} value={x.id}>{getUserName(x)}</option>
                  ))}
                </select>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => saveManager(u)} disabled={updateMut.isPending}>שמור</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={cancelEdit}>ביטול</button>
              </div>
            )}
          </div>
          {kids.length > 0 && !isEditing && <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>{kids.length} כפיפים</span>}
          {!isEditing && !readOnly && (
            <button onClick={() => startEdit(u)} title="ערוך מנהל ישיר"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--text-2)', flexShrink: 0 }}>
              <i className="ti ti-user-edit" aria-hidden="true" /> ערוך כפיפות
            </button>
          )}
        </div>
        {!isEditing && kids.length > 0 && (
          <div style={{ marginRight: 16 }}>
            {kids.map(k => renderNode(k, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>טוען...</div>;
  if (roots.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>לא הוגדרו קשרי כפיפות. לחץ "ערוך כפיפות" ליד כל משתמש.</div>;
  return <div>{roots.map(u => renderNode(u, 0))}</div>;
}

function DepartmentsView({ readOnly = false }) {
  const { data: settingsData } = useSettings();
  const updateSetting = useSaveSetting();
  const { data: usersData } = useUsers({ limit: 500 });
  const updateUser = useUpdateUser();
  const users = usersData?.data || [];

  const depts = useMemo(() => {
    try { return JSON.parse(settingsData?.company_departments || '[]'); } catch { return []; }
  }, [settingsData]);

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptParent, setNewDeptParent] = useState('');
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [assignDept, setAssignDept] = useState('');

  const saveDepts = useCallback((next) => {
    updateSetting.mutate({ key: 'company_departments', value: JSON.stringify(next) });
  }, [updateSetting]);

  const addDept = () => {
    if (!newDeptName.trim()) return;
    const next = [...depts, { id: crypto.randomUUID(), name: newDeptName.trim(), parentId: newDeptParent || null }];
    saveDepts(next);
    setNewDeptName(''); setNewDeptParent('');
  };

  const deleteDept = (id) => saveDepts(depts.filter(d => d.id !== id));

  const startAssign = (u) => { setAssigningUserId(u.id); setAssignDept(u.department || ''); };
  const saveAssign = async (u) => {
    await updateUser.mutateAsync({ id: u.id, department: assignDept, firstName: u.first_name, lastName: u.last_name, username: u.username, userType: u.user_type, profileId: u.profile_id, status: u.status, email: u.email || '', roleTitle: u.role_title || '', managerId: u.manager_id || null });
    setAssigningUserId(null);
  };

  const rootDepts = depts.filter(d => !d.parentId);
  const subDepts = (parentId) => depts.filter(d => d.parentId === parentId);
  const getUserName = (u) => (`${u.first_name || ''} ${u.last_name || ''}`).trim() || u.username || '—';
  const deptUsers = (name) => users.filter(u => u.department === name);

  const renderDept = (d) => {
    const subs = subDepts(d.id);
    const members = deptUsers(d.name);
    return (
      <div key={d.id} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
          <i className="ti ti-building" aria-hidden="true" style={{ color: 'var(--accent)', fontSize: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{d.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{members.length} עובדים</span>
          {!readOnly && (
            <button onClick={() => deleteDept(d.id)} title="מחק מחלקה"
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13 }}>
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          )}
        </div>
        <div style={{ padding: '10px 14px' }}>
          {members.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: subs.length > 0 ? 10 : 0 }}>
              {members.map(u => (
                <span key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-card)', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)' }}>
                  {getUserName(u)}
                  <button onClick={() => { setAssigningUserId(u.id); setAssignDept(''); updateUser.mutateAsync({ id: u.id, department: '', firstName: u.first_name, lastName: u.last_name, username: u.username, userType: u.user_type, profileId: u.profile_id, status: u.status, email: u.email || '', roleTitle: u.role_title || '', managerId: u.manager_id || null }); }}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
          {subs.map(renderDept)}
        </div>
      </div>
    );
  };

  const unassigned = users.filter(u => !u.department || !depts.some(d => d.name === u.department));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
      <div>
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>שם מחלקה חדשה</label>
            <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDept()}
              placeholder="לדוגמה: מכירות" style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>מחלקת אב (לתת-מחלקה)</label>
            <select value={newDeptParent} onChange={e => setNewDeptParent(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}>
              <option value="">-- מחלקה ראשית --</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {!readOnly && <button className="btn btn-primary" onClick={addDept} style={{ padding: '7px 16px', fontSize: 13 }}>+ הוסף מחלקה</button>}
        </div>
        {rootDepts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>אין מחלקות. הוסף מחלקה ראשונה למעלה.</div>
        ) : rootDepts.map(renderDept)}
      </div>

      <div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
            שיוך עובדים למחלקות
          </div>
          <div style={{ padding: 10, maxHeight: 500, overflowY: 'auto' }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{getUserName(u)}</div>
                {assigningUserId === u.id ? (
                  <>
                    <select value={assignDept} onChange={e => setAssignDept(e.target.value)}
                      style={{ flex: 1, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11 }}>
                      <option value="">-- ללא --</option>
                      {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                    <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => saveAssign(u)}>✓</button>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setAssigningUserId(null)}>✗</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 11, color: u.department ? 'var(--accent)' : 'var(--text-3)' }}>{u.department || '—'}</span>
                    <button onClick={() => startAssign(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }} title="שייך מחלקה">
                      <i className="ti ti-edit" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────
const SESSION_OPTIONS = [
  { value: 0,    label: 'ללא ניתוק אוטומטי' },
  { value: 15,   label: '15 דקות' },
  { value: 30,   label: '30 דקות' },
  { value: 60,   label: 'שעה אחת' },
  { value: 120,  label: 'שעתיים' },
  { value: 240,  label: '4 שעות' },
  { value: 480,  label: '8 שעות' },
  { value: 1440, label: '24 שעות' },
];

function SecurityTab({ readOnly = false }) {
  const { data: settings, isLoading } = useSettings();
  const saveSetting = useSaveSetting();
  const { data: usersData } = useUsers({ limit: 500 });
  const mfaRequireAll = useMfaRequireAll();
  const user = useAuthStore(s => s.user);
  const isSuperAdmin = user?.userType === 'superAdmin';

  const currentTimeout = settings?.session_timeout_minutes
    ? parseInt(settings.session_timeout_minutes, 10)
    : 0;

  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(false);
  const [mfaSaved, setMfaSaved] = useState(false);
  const [confirmMfa, setConfirmMfa] = useState(null); // 'enable' | 'disable' | null

  const displayValue = selected !== null ? selected : currentTimeout;

  // MFA global setting
  const mfaRequiredAll = settings?.mfa_required_all === 'true';
  const users = usersData?.data || [];
  const totalUsers = users.length;
  const mfaEnabledCount = users.filter(u => u.mfa_enabled).length;
  const mfaRequiredCount = users.filter(u => u.mfa_required || mfaRequiredAll).length;

  const handleSave = async () => {
    await saveSetting.mutateAsync({ key: 'session_timeout_minutes', value: String(displayValue) });
    setSaved(true);
    setSelected(null);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleMfaToggle = async (enable) => {
    // Save global setting
    await saveSetting.mutateAsync({ key: 'mfa_required_all', value: enable ? 'true' : 'false' });
    // Bulk-update individual mfa_required flags
    await mfaRequireAll.mutateAsync(enable);
    setConfirmMfa(null);
    setMfaSaved(true);
    setTimeout(() => setMfaSaved(false), 3000);
  };

  const canEdit = !readOnly && isSuperAdmin;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent)15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>ניתוק אוטומטי (Session Expiration)</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>ניתוק משתמשים לאחר חוסר פעילות בזמן שהוגדר</div>
          </div>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>טוען...</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                ניתוק אוטומטי לאחר חוסר פעילות של:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {SESSION_OPTIONS.map(opt => {
                  const isActive = displayValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => canEdit && setSelected(opt.value)}
                      disabled={!canEdit}
                      style={{
                        padding: '10px 14px', borderRadius: 10, cursor: canEdit ? 'pointer' : 'default',
                        border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                        background: isActive ? 'var(--accent)12' : 'var(--bg-elevated)',
                        color: isActive ? 'var(--accent)' : 'var(--text-2)',
                        fontWeight: isActive ? 700 : 400, fontSize: 13, textAlign: 'right',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.value === 0 && (
                        <span style={{ fontSize: 11, color: isActive ? 'var(--accent)' : 'var(--text-3)', display: 'block', marginBottom: 2 }}>ברירת מחדל</span>
                      )}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
              <i className="ti ti-info-circle" style={{ marginLeft: 6, fontSize: 13 }} />
              {displayValue === 0
                ? 'משתמשים יישארו מחוברים עד שיתנתקו ידנית או עד פקיעת ה-Token.'
                : `לאחר ${SESSION_OPTIONS.find(o => o.value === displayValue)?.label} של חוסר פעילות, המשתמש יקבל אזהרה ולאחר 2 דקות ינותק אוטומטית.`
              }
            </div>

            {canEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
                {saved && (
                  <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                    <i className="ti ti-check" /> נשמר בהצלחה
                  </span>
                )}
                {selected !== null && (
                  <button className="btn btn-ghost" onClick={() => setSelected(null)}>ביטול</button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={selected === null || saveSetting.isPending}
                >
                  {saveSetting.isPending ? 'שומר...' : 'שמור הגדרות'}
                </button>
              </div>
            )}

            {!isSuperAdmin && (
              <div style={{ padding: '10px 14px', background: '#FEF3C722', border: '1px solid #F59E0B44', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
                <i className="ti ti-lock" style={{ marginLeft: 6 }} />
                רק סופר אדמין יכול לשנות הגדרות אבטחה.
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: mfaRequiredAll ? '#F0FDF4' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={mfaRequiredAll ? '#16a34a' : 'var(--text-3)'} strokeWidth="2">
              <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>אימות דו-שלבי גורף (MFA)</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>חיוב כלל המשתמשים בארגון להשתמש ב-MFA</div>
          </div>
          {mfaSaved && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              <i className="ti ti-check" /> נשמר
            </span>
          )}
        </div>

        {/* Stats row */}
        {totalUsers > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            {[
              { label: 'סה"כ משתמשים', value: totalUsers, color: 'var(--text-2)', bg: 'var(--bg-elevated)' },
              { label: 'MFA פעיל', value: mfaEnabledCount, color: '#15803d', bg: '#DCFCE7' },
              { label: 'MFA נדרש', value: mfaRequiredCount, color: '#92400E', bg: '#FEF3C7' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '10px 14px', background: s.bg, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.color, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Global toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderRadius: 12,
          border: `2px solid ${mfaRequiredAll ? '#86EFAC' : 'var(--border)'}`,
          background: mfaRequiredAll ? '#F0FDF4' : 'var(--bg-elevated)',
          transition: 'all 0.2s', marginBottom: 14,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: mfaRequiredAll ? '#15803d' : 'var(--text-1)' }}>
              {mfaRequiredAll ? '✓ MFA נדרש לכלל המשתמשים' : 'דרוש MFA לכלל המשתמשים'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
              {mfaRequiredAll
                ? 'כל משתמש שטרם הגדיר MFA יחויב בהגדרה בכניסה הבאה'
                : 'כיבוי — כל משתמש יחליט בעצמו אם להפעיל MFA'}
            </div>
          </div>
          {canEdit && (
            <ToggleSwitch
              checked={mfaRequiredAll}
              onChange={e => setConfirmMfa(e.target.checked ? 'enable' : 'disable')}
              disabled={mfaRequireAll.isPending || saveSetting.isPending}
            />
          )}
          {!canEdit && (
            <span style={{ fontSize: 12, color: mfaRequiredAll ? '#15803d' : 'var(--text-3)', fontWeight: 600 }}>
              {mfaRequiredAll ? 'פעיל' : 'כבוי'}
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
          להגדרת MFA למשתמש בודד בלבד, עבור לטאב <strong>הקמת משתמשים</strong> ← בחר משתמש ← <strong>הגדרות מערכת</strong>.
        </p>
      </div>

      {/* Confirm modal */}
      {confirmMfa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, direction: 'rtl' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: confirmMfa === 'enable' ? '#DCFCE7' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={confirmMfa === 'enable' ? '#16a34a' : '#D97706'} strokeWidth="2">
                  <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>
                  {confirmMfa === 'enable' ? 'הפעלת MFA לכלל המשתמשים' : 'ביטול MFA לכלל המשתמשים'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                  {totalUsers} משתמשים יושפעו מהשינוי
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: confirmMfa === 'enable' ? '#F0FDF4' : '#FEF3C7', borderRadius: 10, fontSize: 13, color: confirmMfa === 'enable' ? '#15803d' : '#92400E', marginBottom: 20, lineHeight: 1.6 }}>
              {confirmMfa === 'enable'
                ? `כל ${totalUsers} המשתמשים יחויבו ב-MFA. ${totalUsers - mfaEnabledCount > 0 ? `${totalUsers - mfaEnabledCount} משתמשים שטרם הגדירו MFA יחויבו לעשות זאת בכניסה הבאה.` : 'כל המשתמשים כבר הגדירו MFA.'}`
                : 'דרישת MFA תבוטל לכלל המשתמשים. הם עדיין יוכלו להפעיל MFA ידנית.'
              }
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmMfa(null)}>ביטול</button>
              <button
                className="btn btn-primary"
                style={confirmMfa === 'disable' ? { background: '#D97706', borderColor: '#D97706' } : {}}
                onClick={() => handleMfaToggle(confirmMfa === 'enable')}
                disabled={mfaRequireAll.isPending || saveSetting.isPending}
              >
                {(mfaRequireAll.isPending || saveSetting.isPending) ? 'מעדכן...' : confirmMfa === 'enable' ? 'הפעל MFA לכולם' : 'בטל דרישת MFA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Login Log Tab ─────────────────────────────────────────────────────────────
function LoginLogTab() {
  const [page, setPage] = useState(1);
  const [filterUser, setFilterUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState({ userId: '', dateFrom: '', dateTo: '' });

  const { data: usersData } = useUsers({ limit: 500 });
  const { data, isLoading, isFetching } = useLoginHistory({
    page, limit: 50,
    userId: applied.userId,
    dateFrom: applied.dateFrom,
    dateTo: applied.dateTo,
  });

  const users = usersData?.data || [];
  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const applyFilter = () => { setApplied({ userId: filterUser, dateFrom, dateTo }); setPage(1); };
  const clearFilter = () => { setFilterUser(''); setDateFrom(''); setDateTo(''); setApplied({ userId: '', dateFrom: '', dateTo: '' }); setPage(1); };
  const hasFilter = applied.userId || applied.dateFrom || applied.dateTo;

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>משתמש</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-elevated)', color: 'var(--text-1)' }}>
              <option value="">— כל המשתמשים —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>מתאריך</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-elevated)', color: 'var(--text-1)' }} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>עד תאריך</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-elevated)', color: 'var(--text-1)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={applyFilter} style={{ padding: '7px 16px', fontSize: 13 }}>
              <i className="ti ti-filter" /> סנן
            </button>
            {hasFilter && (
              <button className="btn btn-ghost" onClick={clearFilter} style={{ padding: '7px 12px', fontSize: 13 }}>נקה</button>
            )}
          </div>
        </div>
        {total > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
            {isFetching ? 'מרענן...' : `סה"כ ${total} כניסות`}
            {hasFilter && ' (מסונן)'}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>משתמש</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>שם מלא</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>כניסה</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>יציאה</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>סיבת יציאה</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>כתובת IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>טוען...</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
                  <i className="ti ti-login" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: 0.4 }} />
                  {hasFilter ? 'לא נמצאו כניסות בפילטר הנוכחי' : 'אין היסטוריית כניסות עדיין'}
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)44' }}>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: 5, color: 'var(--accent)' }}>
                    {r.username || '—'}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', color: 'var(--text-1)' }}>
                  {`${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}
                </td>
                <td style={{ padding: '9px 14px', color: 'var(--text-2)', direction: 'ltr', textAlign: 'right' }}>
                  {formatDate(r.login_at)}
                </td>
                <td style={{ padding: '9px 14px', color: 'var(--text-2)', direction: 'ltr', textAlign: 'right' }}>
                  {r.logout_at ? formatDate(r.logout_at) : <span style={{ color: 'var(--text-3)' }}>פעיל</span>}
                </td>
                <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                  {r.logout_type === 'manual'
                    ? <span style={{ background: '#DCFCE7', color: '#15803d', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>יזום</span>
                    : r.logout_type === 'session_expired'
                    ? <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>פג תוקף</span>
                    : r.logout_at ? <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
                    : null}
                </td>
                <td style={{ padding: '9px 14px', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: 12, direction: 'ltr', textAlign: 'right' }}>
                  {r.ip_address || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ fontSize: 12, padding: '5px 12px' }}>
            ← הקודם
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-2)', alignSelf: 'center', padding: '0 8px' }}>
            עמוד {page} מתוך {totalPages}
          </span>
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ fontSize: 12, padding: '5px 12px' }}>
            הבא →
          </button>
        </div>
      )}
    </div>
  );
}
