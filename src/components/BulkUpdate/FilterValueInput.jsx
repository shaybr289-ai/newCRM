import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DAYS_SUB_OPERATORS, operatorIsDaysRelative, operatorNeedsTwoValues } from './bulkUpdateConfig';

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px',
  fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-1)',
  minWidth: 140,
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

export default function FilterValueInput({ field, operator, value, value2, subOperator, onChange }) {
  const [lookupOptions, setLookupOptions] = useState([]);

  useEffect(() => {
    if (field?.type === 'api_lookup' && field.endpoint && operator && operator !== 'none' &&
        operator !== 'is_empty' && operator !== 'is_not_empty') {
      api.get(`/api/${field.endpoint}?limit=300`)
        .then(res => setLookupOptions(Array.isArray(res?.data) ? res.data : (res || [])))
        .catch(() => setLookupOptions([]));
    } else {
      setLookupOptions([]);
    }
  }, [field?.type, field?.endpoint, operator]);

  if (!field || !operator || operator === 'none') return null;
  if (['is_empty', 'is_not_empty', 'is_true', 'is_false',
    'today', 'tomorrow', 'from_tomorrow', 'yesterday', 'until_yesterday',
    'this_month', 'last_month', 'next_month', 'this_week', 'last_week',
    'next_week', 'this_year', 'year_start', 'quarter_start'].includes(operator)) {
    return null;
  }

  // Days-relative (age_days / days_to) — sub-operator + number
  if (operatorIsDaysRelative(operator)) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          value={subOperator || 'equals'}
          onChange={e => onChange({ subOperator: e.target.value })}
          style={{ ...selectStyle, minWidth: 60 }}
        >
          {DAYS_SUB_OPERATORS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange({ value: e.target.value })}
          placeholder="ימים"
          style={{ ...inputStyle, width: 90 }}
        />
      </div>
    );
  }

  // Date BETWEEN — two date pickers
  if (field.type === 'date' && operatorNeedsTwoValues(operator)) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="date" value={value || ''} onChange={e => onChange({ value: e.target.value })} style={inputStyle} />
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>עד</span>
        <input type="date" value={value2 || ''} onChange={e => onChange({ value2: e.target.value })} style={inputStyle} />
      </div>
    );
  }

  // Number BETWEEN — two number inputs
  if (field.type === 'number' && operatorNeedsTwoValues(operator)) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="number" value={value || ''} onChange={e => onChange({ value: e.target.value })}
          placeholder="מ-" style={{ ...inputStyle, width: 90 }} />
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>עד</span>
        <input type="number" value={value2 || ''} onChange={e => onChange({ value2: e.target.value })}
          placeholder="עד-" style={{ ...inputStyle, width: 90 }} />
      </div>
    );
  }

  // Date — single date picker
  if (field.type === 'date') {
    return (
      <input type="date" value={value || ''} onChange={e => onChange({ value: e.target.value })} style={inputStyle} />
    );
  }

  // Number — single number input
  if (field.type === 'number') {
    return (
      <input type="number" value={value || ''} onChange={e => onChange({ value: e.target.value })}
        style={{ ...inputStyle, width: 120 }} />
    );
  }

  // Select — dropdown with predefined options
  if (field.type === 'select' && field.options) {
    return (
      <select value={value || ''} onChange={e => onChange({ value: e.target.value })} style={selectStyle}>
        <option value="">-- בחר --</option>
        {field.options.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    );
  }

  // API Lookup — dropdown fetched from server
  if (field.type === 'api_lookup') {
    return (
      <select value={value || ''} onChange={e => onChange({ value: e.target.value })} style={selectStyle}>
        <option value="">-- בחר --</option>
        {lookupOptions.map(item => {
          const label = field.labelField2
            ? `${item[field.labelField] || ''} ${item[field.labelField2] || ''}`.trim()
            : item[field.labelField] || item.id;
          return (
            <option key={item.id} value={item.id}>{label}</option>
          );
        })}
      </select>
    );
  }

  // Text — free-text input
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange({ value: e.target.value })}
      placeholder="הזן ערך..."
      style={inputStyle}
    />
  );
}
