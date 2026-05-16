/**
 * RulesBuilder — visual UI for conditional logic rules.
 * Shown in the PropertiesPanel when a field is selected.
 *
 * Each rule: if [trigger_field] [operator] [value] → [action] [target_field]
 */
import { useState } from 'react';
import { useCreateRule, useUpdateRule, useDeleteRule } from '../../../hooks/useForms';

const OPERATORS = [
  { value: 'equals',           label: 'שווה ל' },
  { value: 'not_equals',       label: 'לא שווה ל' },
  { value: 'contains',         label: 'מכיל' },
  { value: 'not_contains',     label: 'לא מכיל' },
  { value: 'is_empty',         label: 'ריק' },
  { value: 'is_not_empty',     label: 'לא ריק' },
  { value: 'greater',          label: 'גדול מ' },
  { value: 'less',             label: 'קטן מ' },
  { value: 'greater_or_equal', label: 'גדול או שווה ל' },
  { value: 'less_or_equal',    label: 'קטן או שווה ל' },
  { value: 'in',               label: 'אחד מ (פסיק)' },
  { value: 'not_in',           label: 'לא אחד מ (פסיק)' },
];

const ACTIONS = [
  { value: 'show',         label: 'הצג שדה', needsTarget: true },
  { value: 'hide',         label: 'הסתר שדה', needsTarget: true },
  { value: 'require',      label: 'הפוך לחובה', needsTarget: true },
  { value: 'optional',     label: 'הפוך לרשות', needsTarget: true },
  { value: 'disable',      label: 'נטרל שדה', needsTarget: true },
  { value: 'enable',       label: 'הפעל שדה', needsTarget: true },
  { value: 'set_value',    label: 'הגדר ערך', needsTarget: true, needsValue: true },
  { value: 'clear',        label: 'נקה ערך', needsTarget: true },
  { value: 'show_section', label: 'הצג אזור', needsSection: true },
  { value: 'hide_section', label: 'הסתר אזור', needsSection: true },
];

const noValueOperators = new Set(['is_empty', 'is_not_empty']);

export default function RulesBuilder({ formId, fields, sections, rules, onRulesChange, highlightFieldKey }) {
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // When a field is highlighted, show only rules that involve it
  const relevantRules = highlightFieldKey && !showAll
    ? rules.filter(r => r.trigger_field_key === highlightFieldKey || r.target_field_key === highlightFieldKey)
    : rules;
  const hiddenCount = highlightFieldKey ? rules.length - relevantRules.length : 0;

  const handleAdd = async (draft) => {
    const created = await createRule.mutateAsync({ formId, ...draft });
    onRulesChange([...rules, created]);
    setAdding(false);
  };

  const handleDelete = async (ruleId) => {
    if (!confirm('למחוק חוק זה?')) return;
    await deleteRule.mutateAsync({ formId, id: ruleId });
    onRulesChange(rules.filter((r) => r.id !== ruleId));
  };

  const handleUpdate = async (ruleId, patch) => {
    await updateRule.mutateAsync({ formId, id: ruleId, ...patch });
    onRulesChange(rules.map((r) => r.id === ruleId ? { ...r, ...patch } : r));
  };

  return (
    <div className="rules-builder">
      <div className="rules-header">
        <span className="rules-title"><i className="ti ti-bolt" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> חוקים תנאיים ({rules.length})</span>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => setAdding(true)}
        >
          <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף חוק
        </button>
      </div>

      {rules.length === 0 && !adding && (
        <p className="rules-empty">אין חוקים. לחץ "הוסף חוק" כדי לקשר שדות זה לזה.</p>
      )}

      {relevantRules.map((rule) => (
        <RuleRow
          key={rule.id}
          rule={rule}
          fields={fields}
          sections={sections}
          onUpdate={(patch) => handleUpdate(rule.id, patch)}
          onDelete={() => handleDelete(rule.id)}
          highlight={highlightFieldKey}
        />
      ))}

      {hiddenCount > 0 && (
        <button
          type="button"
          className="btn btn-ghost rules-show-all"
          onClick={() => setShowAll(true)}
        >
          + עוד {hiddenCount} חוקים בטופס
        </button>
      )}

      {adding && (
        <RuleEditor
          fields={fields}
          sections={sections}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
          busy={createRule.isPending}
          defaultTriggerFieldKey={highlightFieldKey || ''}
        />
      )}
    </div>
  );
}

function RuleRow({ rule, fields, sections, onUpdate, onDelete, highlight }) {
  const [editing, setEditing] = useState(false);
  const isHighlighted = highlight && (rule.trigger_field_key === highlight || rule.target_field_key === highlight);
  const trigger = fields.find((f) => f.field_key === rule.trigger_field_key);
  const target = fields.find((f) => f.field_key === rule.target_field_key);
  const actionMeta = ACTIONS.find((a) => a.value === rule.action);
  const opMeta = OPERATORS.find((o) => o.value === rule.trigger_operator);

  if (editing) {
    return (
      <RuleEditor
        initial={rule}
        fields={fields}
        sections={sections}
        onSave={(patch) => { onUpdate(patch); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`rule-row ${isHighlighted ? 'is-active-rule' : ''}`}>
      <div className="rule-summary" dir="rtl">
        <span className="rule-chip trigger">
          {trigger?.label || rule.trigger_field_key}
        </span>
        <span className="rule-op">{opMeta?.label || rule.trigger_operator}</span>
        {!noValueOperators.has(rule.trigger_operator) && rule.trigger_value && (
          <span className="rule-chip val">"{rule.trigger_value}"</span>
        )}
        <span className="rule-arrow">→</span>
        <span className="rule-chip action">{actionMeta?.label || rule.action}</span>
        {target && <span className="rule-chip target">{target.label}</span>}
        {rule.action_value && <span className="rule-chip val">= "{rule.action_value}"</span>}
      </div>
      <div className="rule-actions">
        <button type="button" className="btn-icon-sm" onClick={() => setEditing(true)} title="ערוך"><i className="ti ti-edit" aria-hidden="true" /></button>
        <button type="button" className="btn-icon-sm danger" onClick={onDelete} title="מחק"><i className="ti ti-trash" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

function RuleEditor({ initial, fields, sections, onSave, onCancel, busy, defaultTriggerFieldKey }) {
  const [draft, setDraft] = useState({
    trigger_field_key: initial?.trigger_field_key || defaultTriggerFieldKey || (fields[0]?.field_key || ''),
    trigger_operator: initial?.trigger_operator || 'equals',
    trigger_value: initial?.trigger_value || '',
    action: initial?.action || 'show',
    target_field_key: initial?.target_field_key || '',
    target_section_id: initial?.target_section_id || '',
    action_value: initial?.action_value || '',
    sort_order: initial?.sort_order || 0,
  });

  const set = (key, val) => setDraft((d) => ({ ...d, [key]: val }));
  const actionMeta = ACTIONS.find((a) => a.value === draft.action) || ACTIONS[0];

  const handleSave = () => {
    if (!draft.trigger_field_key) { alert('בחר שדה מפעיל'); return; }
    if (actionMeta.needsTarget && !draft.target_field_key) { alert('בחר שדה יעד'); return; }
    if (actionMeta.needsSection && !draft.target_section_id) { alert('בחר אזור יעד'); return; }
    onSave(draft);
  };

  return (
    <div className="rule-editor">
      <div className="rule-editor-row">
        <label>אם השדה</label>
        <select value={draft.trigger_field_key} onChange={(e) => set('trigger_field_key', e.target.value)}>
          <option value="">— בחר שדה —</option>
          {fields.filter(f => !['heading','paragraph','divider','spacer'].includes(f.field_type)).map((f) => (
            <option key={f.field_key} value={f.field_key}>{f.label || f.field_key}</option>
          ))}
        </select>
      </div>
      <div className="rule-editor-row">
        <label>התנאי</label>
        <select value={draft.trigger_operator} onChange={(e) => set('trigger_operator', e.target.value)}>
          {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {!noValueOperators.has(draft.trigger_operator) && (
        <div className="rule-editor-row">
          <label>הערך</label>
          <input
            value={draft.trigger_value}
            onChange={(e) => set('trigger_value', e.target.value)}
            placeholder="ערך להשוואה..."
          />
        </div>
      )}
      <div className="rule-editor-row">
        <label>פעולה</label>
        <select value={draft.action} onChange={(e) => set('action', e.target.value)}>
          {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      {actionMeta.needsTarget && (
        <div className="rule-editor-row">
          <label>על השדה</label>
          <select value={draft.target_field_key} onChange={(e) => set('target_field_key', e.target.value)}>
            <option value="">— בחר שדה יעד —</option>
            {fields.filter(f => !['heading','paragraph','divider','spacer'].includes(f.field_type)).map((f) => (
              <option key={f.field_key} value={f.field_key}>{f.label || f.field_key}</option>
            ))}
          </select>
        </div>
      )}
      {actionMeta.needsSection && (
        <div className="rule-editor-row">
          <label>האזור</label>
          <select value={draft.target_section_id} onChange={(e) => set('target_section_id', e.target.value)}>
            <option value="">— בחר אזור —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.title || s.id.slice(0,8)}</option>
            ))}
          </select>
        </div>
      )}
      {actionMeta.needsValue && (
        <div className="rule-editor-row">
          <label>הערך לקביעה</label>
          <input
            value={draft.action_value}
            onChange={(e) => set('action_value', e.target.value)}
            placeholder="ערך חדש לשדה..."
          />
        </div>
      )}
      <div className="rule-editor-btns">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>ביטול</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy}>
          {initial ? 'עדכן' : 'הוסף חוק'}
        </button>
      </div>
    </div>
  );
}
