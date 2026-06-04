import { useState } from 'react';
import { SOURCES } from './DataSourceSelector';

const OPERATORS = [
  { key: 'eq',       label: 'שווה ל' },
  { key: 'neq',      label: 'לא שווה' },
  { key: 'gt',       label: 'גדול מ' },
  { key: 'gte',      label: 'גדול/שווה' },
  { key: 'lt',       label: 'קטן מ' },
  { key: 'lte',      label: 'קטן/שווה' },
  { key: 'contains', label: 'מכיל' },
  { key: 'in',       label: 'אחד מ' },
];

const DYNAMIC_VARS = [
  { key: '{{last_7_days}}',          label: '7 ימים אחרונים' },
  { key: '{{last_30_days}}',         label: '30 ימים אחרונים' },
  { key: '{{current_month_start}}',  label: 'תחילת חודש נוכחי' },
  { key: '{{current_year_start}}',   label: 'תחילת שנה נוכחית' },
  { key: '{{current_user}}',         label: 'המשתמש המחובר' },
  { key: '{{global_date_from}}',     label: 'פילטר תאריך גלובלי — מ' },
  { key: '{{global_date_to}}',       label: 'פילטר תאריך גלובלי — עד' },
];

export default function FilterBuilder({ config, onChange }) {
  const [showVars, setShowVars] = useState(null); // index of filter showing var picker

  const source  = SOURCES.find(s => s.endpoint === config?.endpoint);
  const filters = config?.filters || [];

  const update = (newFilters) => onChange({ ...config, filters: newFilters });

  const addFilter = () => update([...filters, { field: source?.fields?.[0]?.key || '', op: 'eq', value: '' }]);

  const removeFilter = (i) => update(filters.filter((_, idx) => idx !== i));

  const setField = (i, val) => update(filters.map((f, idx) => idx === i ? { ...f, field: val } : f));
  const setOp    = (i, val) => update(filters.map((f, idx) => idx === i ? { ...f, op: val } : f));
  const setValue = (i, val) => update(filters.map((f, idx) => idx === i ? { ...f, value: val } : f));

  const applyVar = (i, varKey) => {
    setValue(i, varKey);
    setShowVars(null);
  };

  return (
    <div className="cfg-section">
      <div className="cfg-label">פילטרים</div>

      {filters.length === 0 && (
        <div className="cfg-empty-hint">אין פילטרים — כל הנתונים יוצגו</div>
      )}

      {filters.map((f, i) => (
        <div key={i} className="filter-row">
          {/* Field */}
          <select
            className="cfg-select cfg-select--sm"
            value={f.field}
            onChange={e => setField(i, e.target.value)}
          >
            {source?.fields?.map(field => (
              <option key={field.key} value={field.key}>{field.label}</option>
            ))}
          </select>

          {/* Operator */}
          <select
            className="cfg-select cfg-select--sm"
            value={f.op}
            onChange={e => setOp(i, e.target.value)}
          >
            {OPERATORS.map(op => (
              <option key={op.key} value={op.key}>{op.label}</option>
            ))}
          </select>

          {/* Value + dynamic var picker */}
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              className="cfg-input"
              value={f.value}
              onChange={e => setValue(i, e.target.value)}
              placeholder="ערך..."
            />
            <button
              type="button"
              className="filter-var-btn"
              title="הכנס משתנה דינמי"
              onClick={() => setShowVars(showVars === i ? null : i)}
            >
              <i className="ti ti-variable" />
            </button>
            {showVars === i && (
              <div className="filter-var-dropdown">
                {DYNAMIC_VARS.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    className="filter-var-option"
                    onClick={() => applyVar(i, v.key)}
                  >
                    <code>{v.key}</code>
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remove */}
          <button type="button" className="widget-btn danger" onClick={() => removeFilter(i)}>
            <i className="ti ti-trash" />
          </button>
        </div>
      ))}

      <button
        type="button"
        className="cfg-add-btn"
        onClick={addFilter}
        disabled={!source}
      >
        <i className="ti ti-plus" /> הוסף פילטר
      </button>
    </div>
  );
}
