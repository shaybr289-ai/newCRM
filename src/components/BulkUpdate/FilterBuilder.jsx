import { useState } from 'react';
import { BULK_UPDATE_MODULES } from './bulkUpdateConfig';
import FilterRow from './FilterRow';
import { useBulkFilter } from '../../hooks/useBulkUpdate';

const newFilter = () => ({ id: Date.now() + Math.random(), field: '', operator: 'none', value: '', value2: '', subOperator: 'equals' });

export default function FilterBuilder({ onResults, onModuleChange }) {
  const [moduleId, setModuleId] = useState('');
  const [filters, setFilters] = useState([newFilter()]);
  const [limit, setLimit] = useState(100);

  const moduleDef = BULK_UPDATE_MODULES.find(m => m.id === moduleId);
  const filterMut = useBulkFilter(moduleDef?.endpoint || '');

  function handleModuleChange(e) {
    const id = e.target.value;
    setModuleId(id);
    setFilters([newFilter()]);
    const def = BULK_UPDATE_MODULES.find(m => m.id === id);
    onModuleChange(def || null);
  }

  function addFilter() {
    setFilters(prev => [...prev, newFilter()]);
  }

  function updateFilter(id, updated) {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f));
  }

  function removeFilter(id) {
    setFilters(prev => prev.length === 1 ? [newFilter()] : prev.filter(f => f.id !== id));
  }

  async function handleSearch() {
    if (!moduleDef) return;

    // Build filter payload — resolve days-relative operators to actual backend operators
    const activeFilters = filters
      .filter(f => f.field && f.operator && f.operator !== 'none')
      .map(f => {
        let operator = f.operator;
        if (operator === 'age_days' && f.subOperator) operator = `age_days_${f.subOperator}`;
        if (operator === 'days_to' && f.subOperator) operator = `days_to_${f.subOperator}`;
        return { field: f.field, fieldType: getFieldType(f.field), operator, value: f.value, value2: f.value2 };
      });

    try {
      const result = await filterMut.mutateAsync({ filters: activeFilters, page: 1, limit });
      onResults(result, moduleDef, activeFilters);
    } catch (err) {
      alert('שגיאה בחיפוש: ' + err.message);
    }
  }

  function getFieldType(fieldKey) {
    return moduleDef?.fields.find(f => f.key === fieldKey)?.type || 'text';
  }

  const selectStyle = {
    border: '1px solid var(--border)', borderRadius: 7, padding: '7px 12px',
    fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-1)', cursor: 'pointer',
  };

  return (
    <div>
      {/* Module selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
          מודול
        </label>
        <select value={moduleId} onChange={handleModuleChange} style={{ ...selectStyle, minWidth: 200 }}>
          <option value="">-- בחר מודול --</option>
          {BULK_UPDATE_MODULES.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Filter rows */}
      {moduleDef && (
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              קריטריוני סינון
            </label>
            <div style={{
              border: '1px solid var(--border)', borderRadius: 10,
              padding: '12px 14px', background: 'var(--bg-page)',
            }}>
              {filters.map(f => (
                <FilterRow
                  key={f.id}
                  filter={f}
                  fields={moduleDef.fields}
                  onChange={updated => updateFilter(f.id, updated)}
                  onRemove={() => removeFilter(f.id)}
                />
              ))}
              <button
                className="btn btn-ghost"
                onClick={addFilter}
                style={{ fontSize: 12, marginTop: 6 }}
              >
                + הוסף קריטריון
              </button>
            </div>
          </div>

          {/* Limit + Search */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-2)' }}>הצג עד</label>
              <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={selectStyle}>
                <option value={100}>100 רשומות</option>
                <option value={500}>500 רשומות</option>
                <option value={1000}>1000 רשומות</option>
              </select>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={!moduleDef || filterMut.isPending}
              style={{ minWidth: 100 }}
            >
              {filterMut.isPending ? 'מחפש...' : 'חיפוש'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
