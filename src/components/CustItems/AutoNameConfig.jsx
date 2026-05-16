import React, { useState, useEffect } from 'react';
import { useFamilies } from '../../hooks/useProducts';
import { Icon, ICONS } from '../../utils/icons';
import '../Customers/CustomerModal.css';

// All possible fields that can be used in auto-name
const ALL_FIELDS = [
  { key: 'sku', label: "מק'ט" },
  { key: 'item_name_raw', label: 'שם מוצר (מקטלוג)' },
  { key: 'site_name', label: 'שם אתר' },
  { key: 'customer_name', label: 'שם לקוח' },
  { key: 'family_name', label: 'שם משפחת מוצר' },
  { key: 'family_num', label: 'מספר משפחה' },
  { key: 'quantity', label: 'כמות' },
  { key: 'item_type', label: 'סוג פריט' },
  { key: 'ff_data_line_num', label: 'מספר קו DATA' },
  { key: 'ff_data_line_type', label: 'סוג קו DATA' },
  { key: 'ff_bandwidth', label: 'רוחב פס' },
  { key: 'ff_infra_provider', label: 'ספק תשתית' },
  { key: 'ff_isp_provider', label: 'ספק ISP' },
  { key: 'ff_equip_type', label: 'סוג ציוד' },
  { key: 'ff_serial_firewall', label: "מ'ס Firewall" },
  { key: 'ff_static_ip', label: 'IP קבועה' },
  { key: 'ff_vlan', label: 'VLAN' },
  // שירותים מנוהלים
  { key: 'ms_service_type', label: 'סוג שירות מנוהל' },
  { key: 'ms_license_model', label: 'מודל רישוי' },
  { key: 'ms_setup_date', label: 'תאריך הקמת השירות' },
  { key: 'ms_start_date', label: 'תאריך התחלה' },
  { key: 'ms_period_months', label: 'תקופת שירות (חודשים)' },
  { key: 'ms_expiry_date', label: 'תאריך תפוגה' },
  { key: 'ms_cancel_date', label: 'תאריך ביטול' },
  { key: 'ms_device_name', label: 'שם Device' },
  { key: 'ms_device_type', label: 'סוג Device' },
  { key: 'ms_backup_resource', label: 'משאב מגובה' },
  { key: 'ms_external_services', label: 'שירותי לקוח חיצוניים' },
  { key: 'ms_admin_management', label: 'Admin Management' },
];

const STORAGE_KEY = 'biz_autoname_config_v1';

export function loadAutoNameConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

export function saveAutoNameConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Build auto item name based on config for a specific family
 */
export function buildAutoItemName(item, familyNum, config, helpers = {}) {
  const famConfig = config[familyNum] || config['_default'];
  if (!famConfig || !famConfig.fields || famConfig.fields.length === 0) {
    // Default: SKU | site name
    const parts = [item.sku, helpers.siteName].filter(Boolean);
    return parts.join(' | ');
  }

  const separator = famConfig.separator || ' | ';
  const parts = famConfig.fields.map(fieldKey => {
    switch (fieldKey) {
      case 'sku': return item.sku || '';
      case 'item_name_raw': return helpers.productName || '';
      case 'site_name': return helpers.siteName || '';
      case 'customer_name': return helpers.customerName || '';
      case 'family_name': return helpers.familyName || '';
      case 'family_num': return helpers.familyNum || '';
      case 'quantity': return item.quantity ? String(item.quantity) : '';
      case 'item_type': return item.item_type || '';
      default: return item[fieldKey] || '';
    }
  }).filter(Boolean);

  return parts.join(separator);
}

/**
 * Auto Name Configuration Page
 */
export default function AutoNameConfig({ onClose }) {
  const { data: famData } = useFamilies();
  const families = (famData?.data || []).sort((a, b) => {
    const na = parseFloat((a.num || '').replace(/[^0-9.]/g, '')) || 99999;
    const nb = parseFloat((b.num || '').replace(/[^0-9.]/g, '')) || 99999;
    return na - nb;
  });

  const [config, setConfig] = useState(loadAutoNameConfig);
  const [selectedFam, setSelectedFam] = useState('_default');
  const [saved, setSaved] = useState(false);

  const currentConfig = config[selectedFam] || { fields: [], separator: ' | ' };

  const updateFamConfig = (newFamConfig) => {
    setConfig(prev => ({ ...prev, [selectedFam]: newFamConfig }));
  };

  const addField = (fieldKey) => {
    if (currentConfig.fields.includes(fieldKey)) return;
    updateFamConfig({ ...currentConfig, fields: [...currentConfig.fields, fieldKey] });
  };

  const removeField = (idx) => {
    const fields = [...currentConfig.fields];
    fields.splice(idx, 1);
    updateFamConfig({ ...currentConfig, fields });
  };

  const moveField = (idx, dir) => {
    const fields = [...currentConfig.fields];
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[idx], fields[target]] = [fields[target], fields[idx]];
    updateFamConfig({ ...currentConfig, fields });
  };

  const handleSave = () => {
    saveAutoNameConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>הגדרת שם פריט אוטומטי</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16 }}>
            הגדר לכל משפחת מוצר אילו שדות ירכיבו את שם הפריט ובאיזה סדר. הערכים יחוברו עם המפריד שנבחר.
          </p>

          {saved && (
            <div style={{ background: '#10B98122', border: '1px solid #10B98144', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#10B981', fontWeight: 600, textAlign: 'center' }}>
              ההגדרות נשמרו בהצלחה
            </div>
          )}

          {/* Family selector */}
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-field">
              <label style={{ fontWeight: 600 }}>בחר משפחת מוצר</label>
              <select value={selectedFam} onChange={e => setSelectedFam(e.target.value)}>
                <option value="_default">ברירת מחדל (כל המשפחות)</option>
                {families.map(f => (
                  <option key={f.id} value={f.num || f.id}>
                    {f.num ? `${f.num} — ` : ''}{f.name}
                    {config[f.num || f.id]?.fields?.length ? ` (${config[f.num || f.id].fields.length} שדות)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label style={{ fontWeight: 600 }}>מפריד בין שדות</label>
              <select value={currentConfig.separator || ' | '} onChange={e => updateFamConfig({ ...currentConfig, separator: e.target.value })}>
                <option value=" | "> | (קו אנכי)</option>
                <option value=" - "> - (מקף)</option>
                <option value=" / "> / (סלאש)</option>
                <option value=" "> (רווח)</option>
                <option value=", ">, (פסיק)</option>
              </select>
            </div>
          </div>

          {/* Selected fields - drag order */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
              שדות נבחרים ({currentConfig.fields.length}) — לפי סדר הופעה בשם הפריט
            </label>
            {currentConfig.fields.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 10, fontSize: 13 }}>
                לא נבחרו שדות. בחר שדות מהרשימה למטה.
                <br /><span style={{ fontSize: 11 }}>ברירת מחדל: מק"ט | שם אתר</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {currentConfig.fields.map((fieldKey, idx) => {
                  const field = ALL_FIELDS.find(f => f.key === fieldKey);
                  return (
                    <div key={fieldKey} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8,
                    }}>
                      <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                        {idx + 1}
                      </span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{field?.label || fieldKey}</span>
                      <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0}
                        style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 14 }}>▲</button>
                      <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === currentConfig.fields.length - 1}
                        style={{ background: 'none', border: 'none', cursor: idx === currentConfig.fields.length - 1 ? 'default' : 'pointer', opacity: idx === currentConfig.fields.length - 1 ? 0.3 : 1, fontSize: 14 }}>▼</button>
                      <button type="button" onClick={() => removeField(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16 }} aria-label="הסר שדה"><i className="ti ti-x" aria-hidden="true" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available fields */}
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>שדות זמינים — לחץ להוספה</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_FIELDS.filter(f => !currentConfig.fields.includes(f.key)).map(f => (
                <button key={f.key} type="button" onClick={() => addField(f.key)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)',
                    background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    color: 'var(--text-2)', transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                  + {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {currentConfig.fields.length > 0 && (
            <div style={{ marginTop: 20, padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10 }}>
              <label style={{ fontWeight: 600, fontSize: 12, color: '#166534', display: 'block', marginBottom: 4 }}>תצוגה מקדימה</label>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>
                {currentConfig.fields.map(fk => {
                  const f = ALL_FIELDS.find(x => x.key === fk);
                  return `[${f?.label || fk}]`;
                }).join(currentConfig.separator || ' | ')}
              </div>
            </div>
          )}

          {/* Summary of all configured families */}
          {(() => {
            const configuredKeys = Object.keys(config).filter(k => config[k]?.fields?.length > 0);
            if (configuredKeys.length === 0) return null;
            return (
              <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <label style={{ fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 10, color: 'var(--text-1)' }}>
                  סיכום הגדרות שם פריט ({configuredKeys.length} הגדרות)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {configuredKeys.map(key => {
                    const fc = config[key];
                    const isDefault = key === '_default';
                    const fam = !isDefault ? families.find(f => f.num === key || f.id === key) : null;
                    const famLabel = isDefault ? 'ברירת מחדל (כל המשפחות)' : (fam ? `${fam.num ? fam.num + ' — ' : ''}${fam.name}` : key);
                    const sep = fc.separator || ' | ';
                    const preview = fc.fields.map(fk => { const f = ALL_FIELDS.find(x => x.key === fk); return f?.label || fk; }).join(sep);
                    return (
                      <div key={key}
                        onClick={() => setSelectedFam(key)}
                        style={{
                          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                          border: selectedFam === key ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: selectedFam === key ? 'var(--accent-light)' : 'var(--bg-elevated)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{famLabel}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{fc.fields.length} שדות, מפריד: "{sep.trim()}"</span>
                            <button type="button" onClick={e => { e.stopPropagation(); setSelectedFam(key); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }} title="ערוך"><i className="ti ti-edit" aria-hidden="true" /></button>
                            <button type="button" onClick={e => { e.stopPropagation(); setConfig(prev => { const next = { ...prev }; delete next[key]; return next; }); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: 'var(--danger)' }} title="מחק הגדרה"><i className="ti ti-trash" aria-hidden="true" /></button>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#166534', fontWeight: 500, background: '#F0FDF4', padding: '4px 8px', borderRadius: 6, direction: 'ltr', textAlign: 'right' }}>
                          {preview}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>סגור</button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>שמור הגדרות</button>
          </div>
        </div>
      </div>
    </div>
  );
}
