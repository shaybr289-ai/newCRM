import { getOperatorsForType, operatorIsDaysRelative } from './bulkUpdateConfig';
import FilterValueInput from './FilterValueInput';

const selectStyle = {
  border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px',
  fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-1)',
  cursor: 'pointer', minWidth: 140,
};

export default function FilterRow({ filter, fields, onChange, onRemove }) {
  const { field: fieldKey, operator, value, value2, subOperator } = filter;
  const fieldDef = fields.find(f => f.key === fieldKey) || null;
  const operators = fieldDef ? getOperatorsForType(fieldDef.type) : [];

  function handleFieldChange(e) {
    onChange({ ...filter, field: e.target.value, operator: 'none', value: '', value2: '', subOperator: 'equals' });
  }

  function handleOperatorChange(e) {
    const newOp = e.target.value;
    // Expand age_days/days_to to sub-operator form
    if (operatorIsDaysRelative(newOp)) {
      onChange({ ...filter, operator: newOp, subOperator: 'equals', value: '', value2: '' });
    } else {
      onChange({ ...filter, operator: newOp, value: '', value2: '' });
    }
  }

  function handleValueChange(patch) {
    onChange({ ...filter, ...patch });
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0' }}>
      {/* Field selector */}
      <select value={fieldKey || ''} onChange={handleFieldChange} style={{ ...selectStyle, minWidth: 160 }}>
        <option value="">-- בחר שדה --</option>
        {fields.map(f => (
          <option key={f.key} value={f.key}>{f.label}</option>
        ))}
      </select>

      {/* Operator selector */}
      {fieldDef && (
        <select value={operator || 'none'} onChange={handleOperatorChange} style={selectStyle}>
          {operators.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Value input(s) */}
      {fieldDef && operator && (
        <FilterValueInput
          field={fieldDef}
          operator={operator}
          value={value}
          value2={value2}
          subOperator={subOperator}
          onChange={handleValueChange}
        />
      )}

      {/* Remove row */}
      <button
        onClick={onRemove}
        title="הסר קריטריון"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-2)', fontSize: 16, padding: '4px 6px',
          borderRadius: 6, lineHeight: 1,
        }}
      >✕</button>
    </div>
  );
}
