import React, { useState, useEffect } from 'react';
import { useFamilies } from '../../hooks/useProducts';
import '../Customers/CustomerModal.css';

// ── All available dynamic fields organized by groups ──────────────────────────
const FIELD_GROUPS = [
  {
    id: 'internet',
    label: 'שירותי אינטרנט',
    fields: [
      { key: 'ff_data_line_num', label: 'מספר קו DATA', type: 'text' },
      { key: 'ff_data_line_type', label: 'סוג קו DATA', type: 'select', options: ['ADSL','VDSL','FTTH/Fiber','סלולרי','לווין','אחר'] },
      { key: 'ff_bandwidth', label: 'רוחב פס', type: 'select', options: ['10Mb','30Mb','50Mb','100Mb','200Mb','500Mb','1Gb','10Gb'] },
      { key: 'ff_infra_provider', label: 'ספק תשתית', type: 'select', options: ['בזק','HOT','סלקום','פרטנר','YES','אחר'] },
      { key: 'ff_line_ownership', label: 'בעלות קו', type: 'select', options: ['ספק','לקוח'] },
      { key: 'ff_isp_provider', label: 'ספק ISP', type: 'select', options: ['012','015','Hot Net','Internet Gold','Bezeq Intl','אחר'] },
      { key: 'ff_active_equip_owner', label: 'בעלות ציוד אקטיבי', type: 'select', options: ['ספק','לקוח'] },
      { key: 'ff_equip_type', label: 'סוג ציוד', type: 'select', options: ['Router','Switch','Firewall','Bridge','ONT','Access Point','אחר'] },
      { key: 'ff_serial_firewall', label: "מ'ס Firewall/Router", type: 'text' },
      { key: 'ff_serial_bridge', label: "מ'ס Bridge Xfiber", type: 'text' },
      { key: 'ff_serial_gpon', label: "מ'ס GPON Xfiber", type: 'text' },
      { key: 'ff_xfiber_conn_type', label: 'סוג חיבור XFIBER', type: 'select', options: ['GPON','Xfiber','P2P','אחר'] },
      { key: 'ff_static_ip', label: 'IP קבועה', type: 'text' },
      { key: 'ff_vlan', label: 'VLAN', type: 'number' },
    ],
  },
  {
    id: 'managed',
    label: 'שירותים מנוהלים',
    fields: [
      { key: 'ms_service_type', label: 'סוג שירות מנוהל', type: 'select', options: ['גיבוי בענן','הגנת סייבר','ניהול וניטור','דוא"ל','מרכזיה','אירוח','Microsoft 365','SMS','ייעוץ','אחר'] },
      { key: 'ms_license_model', label: 'מודל רישוי', type: 'select', options: ['חודשי','שנתי','רב-שנתי','לפי משתמש','לפי מכשיר','אחיד','אחר'] },
      { key: 'ms_setup_date', label: 'תאריך הקמת השירות', type: 'date' },
      { key: 'ms_start_date', label: 'תאריך התחלה', type: 'date' },
      { key: 'ms_period_months', label: 'תקופת שירות (חודשים)', type: 'number' },
      { key: 'ms_expiry_date', label: 'תאריך תפוגת השירות', type: 'computed' },
      { key: 'ms_cancel_date', label: 'תאריך ביטול השירות', type: 'date' },
      { key: 'ms_device_name', label: 'שם Device', type: 'text' },
      { key: 'ms_device_type', label: 'סוג Device', type: 'text' },
      { key: 'ms_backup_resource', label: 'משאב מגובה', type: 'select', options: ['שרת','תחנת עבודה','מחשב נייד','NAS','מכונה וירטואלית','ענן','דוא"ל','בסיס נתונים','אחר'] },
      { key: 'ms_external_services', label: 'שירותי לקוח חיצוניים', type: 'text' },
      { key: 'ms_admin_management', label: 'Admin Management', type: 'select', options: ['ניהול מלא','ניהול חלקי','ניטור בלבד','ניהול עצמי','ניהול משותף','ללא'] },
    ],
  },
];

const STORAGE_KEY = 'biz_dynamic_fields_config_v1';

export function loadDynFieldsConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

export function saveDynFieldsConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export { FIELD_GROUPS };

/**
 * Get active fields for a specific family number
 */
export function getFieldsForFamily(familyNum, config) {
  const famConfig = config[familyNum];
  if (!famConfig || !famConfig.groups) return [];

  const result = [];
  famConfig.groups.forEach(g => {
    const group = FIELD_GROUPS.find(fg => fg.id === g.groupId);
    if (!group) return;
    const fields = g.fieldKeys.map(key => group.fields.find(f => f.key === key)).filter(Boolean);
    if (fields.length > 0) {
      result.push({ groupLabel: group.label, fields });
    }
  });
  return result;
}

/**
 * Dynamic Fields Configuration Page
 */
export default function DynamicFieldsConfig({ onClose }) {
  const { data: famData } = useFamilies();
  const families = (famData?.data || []).sort((a, b) => {
    const na = parseFloat((a.num || '').replace(/[^0-9.]/g, '')) || 99999;
    const nb = parseFloat((b.num || '').replace(/[^0-9.]/g, '')) || 99999;
    return na - nb;
  });

  const [config, setConfig] = useState(loadDynFieldsConfig);
  const [selectedFam, setSelectedFam] = useState('');
  const [saved, setSaved] = useState(false);

  const famConfig = selectedFam ? (config[selectedFam] || { groups: [] }) : null;

  const updateFamConfig = (newConfig) => {
    setConfig(prev => ({ ...prev, [selectedFam]: newConfig }));
  };

  // Add a field group to this family
  const addGroup = (groupId) => {
    const group = FIELD_GROUPS.find(g => g.id === groupId);
    if (!group) return;
    const existing = famConfig.groups || [];
    if (existing.find(g => g.groupId === groupId)) return;
    updateFamConfig({
      ...famConfig,
      groups: [...existing, { groupId, fieldKeys: group.fields.map(f => f.key) }],
    });
  };

  // Remove a field group
  const removeGroup = (groupId) => {
    updateFamConfig({
      ...famConfig,
      groups: (famConfig.groups || []).filter(g => g.groupId !== groupId),
    });
  };

  // Toggle a field within a group
  const toggleField = (groupId, fieldKey) => {
    updateFamConfig({
      ...famConfig,
      groups: (famConfig.groups || []).map(g => {
        if (g.groupId !== groupId) return g;
        const has = g.fieldKeys.includes(fieldKey);
        return { ...g, fieldKeys: has ? g.fieldKeys.filter(k => k !== fieldKey) : [...g.fieldKeys, fieldKey] };
      }),
    });
  };

  // Move field within group
  const moveField = (groupId, idx, dir) => {
    updateFamConfig({
      ...famConfig,
      groups: (famConfig.groups || []).map(g => {
        if (g.groupId !== groupId) return g;
        const keys = [...g.fieldKeys];
        const target = idx + dir;
        if (target < 0 || target >= keys.length) return g;
        [keys[idx], keys[target]] = [keys[target], keys[idx]];
        return { ...g, fieldKeys: keys };
      }),
    });
  };

  // Copy config from one family to others
  const copyToFamilies = (targetNums) => {
    const newConfig = { ...config };
    targetNums.forEach(num => { newConfig[num] = JSON.parse(JSON.stringify(famConfig)); });
    setConfig(newConfig);
  };

  const handleSave = () => {
    saveDynFieldsConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Families that have config
  const configuredFams = Object.keys(config).filter(k => config[k]?.groups?.length > 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 850, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>הגדרת שדות דינמיים לפי משפחת מוצר</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16 }}>
            הגדר לכל משפחת מוצר אילו קבוצות שדות יוצגו בטופס עריכת פריט ללקוח, ובאיזה סדר.
          </p>

          {/* Configured families badges */}
          {configuredFams.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>משפחות עם הגדרות ({configuredFams.length})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {configuredFams.map(num => {
                  const fam = families.find(f => f.num === num);
                  return (
                    <button key={num} onClick={() => setSelectedFam(num)}
                      style={{ padding: '3px 10px', borderRadius: 20, border: selectedFam === num ? '2px solid var(--accent)' : '1px solid var(--border)', background: selectedFam === num ? 'var(--accent-light)' : 'var(--bg-card)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: selectedFam === num ? 'var(--accent)' : 'var(--text-2)' }}>
                      {num} {fam ? `— ${fam.name}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Family selector */}
          <div className="form-field" style={{ maxWidth: 400, marginBottom: 20 }}>
            <label style={{ fontWeight: 600 }}>בחר משפחת מוצר להגדרה</label>
            <select value={selectedFam} onChange={e => setSelectedFam(e.target.value)}>
              <option value="">-- בחר משפחה --</option>
              {families.map(f => (
                <option key={f.id} value={f.num || f.id}>
                  {f.num ? `${f.num} — ` : ''}{f.name}
                  {config[f.num]?.groups?.length ? ' (מוגדר)' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedFam && famConfig && (
            <>
              {/* Active groups */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 10 }}>
                  קבוצות שדות פעילות למשפחה {selectedFam}
                </label>

                {(famConfig.groups || []).length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
                    לא הוגדרו קבוצות שדות. בחר קבוצה מהרשימה למטה.
                  </div>
                )}

                {(famConfig.groups || []).map(g => {
                  const group = FIELD_GROUPS.find(fg => fg.id === g.groupId);
                  if (!group) return null;
                  return (
                    <div key={g.groupId} style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--accent-light)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{group.label}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)' }}
                            onClick={() => removeGroup(g.groupId)}>הסר קבוצה</button>
                        </div>
                      </div>
                      <div style={{ padding: '10px 16px' }}>
                        {g.fieldKeys.map((key, idx) => {
                          const field = group.fields.find(f => f.key === key);
                          if (!field) return null;
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: idx < g.fieldKeys.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                              <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{idx + 1}</span>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{field.label}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{field.type}</span>
                              <button type="button" onClick={() => moveField(g.groupId, idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 12 }}>▲</button>
                              <button type="button" onClick={() => moveField(g.groupId, idx, 1)} disabled={idx === g.fieldKeys.length - 1} style={{ background: 'none', border: 'none', cursor: idx === g.fieldKeys.length - 1 ? 'default' : 'pointer', opacity: idx === g.fieldKeys.length - 1 ? 0.3 : 1, fontSize: 12 }}>▼</button>
                              <button type="button" onClick={() => toggleField(g.groupId, key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14 }} aria-label="הסר שדה"><i className="ti ti-x" aria-hidden="true" /></button>
                            </div>
                          );
                        })}
                        {/* Add removed fields back */}
                        {group.fields.filter(f => !g.fieldKeys.includes(f.key)).length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {group.fields.filter(f => !g.fieldKeys.includes(f.key)).map(f => (
                              <button key={f.key} type="button" onClick={() => toggleField(g.groupId, f.key)}
                                style={{ padding: '3px 10px', borderRadius: 16, border: '1px dashed var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 11, color: 'var(--text-3)' }}>
                                + {f.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Available groups to add */}
              {FIELD_GROUPS.filter(g => !(famConfig.groups || []).find(fg => fg.groupId === g.id)).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>הוסף קבוצת שדות</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {FIELD_GROUPS.filter(g => !(famConfig.groups || []).find(fg => fg.groupId === g.id)).map(g => (
                      <button key={g.id} type="button" onClick={() => addGroup(g.id)}
                        className="btn btn-secondary" style={{ fontSize: 12 }}>
                        + {g.label} ({g.fields.length} שדות)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy to other families */}
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>העתק הגדרה למשפחות נוספות</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {families.filter(f => f.num && f.num !== selectedFam).slice(0, 20).map(f => (
                    <button key={f.id} type="button" onClick={() => copyToFamilies([f.num])}
                      style={{ padding: '3px 8px', borderRadius: 16, border: '1px solid var(--border)', background: config[f.num]?.groups?.length ? '#10B98122' : 'var(--bg-card)', cursor: 'pointer', fontSize: 10, color: 'var(--text-2)' }}>
                      {f.num}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="modal-footer" style={{ alignItems: 'center' }}>
            {saved && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981', flex: 1 }}>ההגדרות נשמרו בהצלחה <i className="ti ti-circle-check" aria-hidden="true" style={{ verticalAlign: '-2px' }} /></span>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>סגור</button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>שמור הגדרות</button>
          </div>
        </div>
      </div>
    </div>
  );
}
