import { useState, useEffect } from 'react';
import { api } from '../../api/client';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: 7, padding: '7px 12px',
  fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-1)', width: '100%',
};
const selectStyle = { ...inputStyle, cursor: 'pointer' };

export default function BulkUpdateFieldSelect({ moduleDef, selectedCount, onExecute, isUpdating }) {
  const [fieldKey, setFieldKey] = useState('');
  const [value, setValue] = useState('');
  const [lookupOptions, setLookupOptions] = useState([]);

  const updatableFields = (moduleDef?.fields || []).filter(f => !f.readOnly);
  const fieldDef = updatableFields.find(f => f.key === fieldKey);

  useEffect(() => {
    if (fieldDef?.type === 'api_lookup' && fieldDef.endpoint) {
      api.get(`/api/${fieldDef.endpoint}?limit=300`)
        .then(res => setLookupOptions(Array.isArray(res?.data) ? res.data : (res || [])))
        .catch(() => setLookupOptions([]));
    } else {
      setLookupOptions([]);
    }
  }, [fieldDef?.type, fieldDef?.endpoint]);

  function handleFieldChange(e) {
    setFieldKey(e.target.value);
    setValue('');
  }

  function handleSubmit() {
    if (!fieldKey) return;
    onExecute({ field: fieldKey, value });
  }

  function renderValueInput() {
    if (!fieldDef) return null;

    if (fieldDef.type === 'select' && fieldDef.options) {
      return (
        <select value={value} onChange={e => setValue(e.target.value)} style={selectStyle}>
          <option value="">-- ריק / נקה שדה --</option>
          {fieldDef.options.map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
      );
    }

    if (fieldDef.type === 'api_lookup') {
      return (
        <select value={value} onChange={e => setValue(e.target.value)} style={selectStyle}>
          <option value="">-- ריק / נקה שדה --</option>
          {lookupOptions.map(item => {
            const label = fieldDef.labelField2
              ? `${item[fieldDef.labelField] || ''} ${item[fieldDef.labelField2] || ''}`.trim()
              : item[fieldDef.labelField] || item.id;
            return (
              <option key={item.id} value={item.id}>{label}</option>
            );
          })}
        </select>
      );
    }

    if (fieldDef.type === 'checkbox') {
      return (
        <select value={value} onChange={e => setValue(e.target.value)} style={selectStyle}>
          <option value="">-- בחר --</option>
          <option value="true">נבחר</option>
          <option value="false">לא נבחר</option>
        </select>
      );
    }

    if (fieldDef.type === 'date') {
      return (
        <input type="date" value={value} onChange={e => setValue(e.target.value)} style={inputStyle} />
      );
    }

    if (fieldDef.type === 'number') {
      return (
        <input type="number" value={value} onChange={e => setValue(e.target.value)}
          placeholder="הזן מספר..." style={inputStyle} />
      );
    }

    return (
      <input type="text" value={value} onChange={e => setValue(e.target.value)}
        placeholder="הזן ערך (ריק = נקה שדה)..." style={inputStyle} />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
      <div style={{
        padding: '10px 14px', borderRadius: 8,
        background: 'var(--accent-light)', border: '1px solid var(--accent)',
        fontSize: 13, color: 'var(--accent)', fontWeight: 600,
      }}>
        {selectedCount} רשומות נבחרו לעדכון
      </div>

      {/* Field selector */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
          שדה לעדכון
        </label>
        <select value={fieldKey} onChange={handleFieldChange} style={selectStyle}>
          <option value="">-- בחר שדה --</option>
          {updatableFields.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Value input */}
      {fieldDef && (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
            ערך חדש עבור "{fieldDef.label}"
          </label>
          {renderValueInput()}
          <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
            ערך ריק יגרום לניקוי השדה בכל הרשומות שנבחרו
          </p>
        </div>
      )}

      {/* Execute button */}
      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={!fieldKey || isUpdating}
        style={{ alignSelf: 'flex-start', minWidth: 140 }}
      >
        {isUpdating ? 'מעדכן...' : `בצע עדכון (${selectedCount} רשומות)`}
      </button>
    </div>
  );
}
