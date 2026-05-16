import { getFieldTypeMeta } from './FIELD_TYPES';
import RulesBuilder from './RulesBuilder';

/**
 * Right panel — edits the currently selected field's properties.
 * Falls back to a placeholder when nothing is selected.
 */
export default function PropertiesPanel({
  field,
  section,
  onFieldChange,
  onSectionChange,
  formData,
  onFormChange,
  // Rules (passed when a field is selected)
  formId,
  allFields,
  sections,
  rules,
  onRulesChange,
}) {
  if (field) {
    return (
      <FieldProperties
        field={field}
        onChange={onFieldChange}
        formId={formId}
        allFields={allFields}
        sections={sections}
        rules={rules}
        onRulesChange={onRulesChange}
      />
    );
  }
  if (section) return <SectionProperties section={section} onChange={onSectionChange} />;
  return <FormProperties formData={formData} onChange={onFormChange} />;
}

// ─── Form Properties (when nothing else selected) ──────────────────────
function FormProperties({ formData, onChange }) {
  if (!formData) return null;
  return (
    <aside className="builder-props">
      <h3 className="props-title"><i className="ti ti-settings" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הגדרות טופס</h3>
      <Field label="שם הטופס">
        <input
          value={formData.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>
      <Field label="תיאור">
        <textarea
          rows={3}
          value={formData.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>
      <Field label="קטגוריה">
        <input
          value={formData.category || ''}
          onChange={(e) => onChange({ category: e.target.value })}
          placeholder='למשל: "שירות", "מכירות"'
        />
      </Field>
      <Field label="אייקון (emoji)">
        <input
          value={formData.icon || ''}
          onChange={(e) => onChange({ icon: e.target.value })}
          placeholder="ti-forms"
        />
      </Field>
      <Field label="מודול מקושר">
        <select
          value={formData.linked_module || ''}
          onChange={(e) => onChange({ linked_module: e.target.value || null })}
        >
          <option value="">— ללא —</option>
          <option value="customers">לקוחות</option>
          <option value="contacts">אנשי קשר</option>
          <option value="sites">אתרי לקוח</option>
          <option value="deals">עסקאות</option>
          <option value="orders">הזמנות</option>
          <option value="quotes">הצעות מחיר</option>
          <option value="tasks">משימות</option>
        </select>
        <div className="props-hint">הטופס יוצע למילוי בעמודי המודול הזה (טאב "טפסים").</div>
      </Field>

      <div className="props-divider" />
      <p className="props-hint">בחר אזור או שדה כדי לערוך אותו.</p>
    </aside>
  );
}

// ─── Section Properties ────────────────────────────────────────────────
function SectionProperties({ section, onChange }) {
  return (
    <aside className="builder-props">
      <h3 className="props-title"><i className="ti ti-package" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הגדרות אזור</h3>
      <Field label="כותרת">
        <input
          value={section.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>
      <Field label="תיאור">
        <textarea
          rows={2}
          value={section.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>
      <Field label="סדר">
        <input
          type="number"
          value={section.sort_order || 0}
          onChange={(e) => onChange({ sort_order: parseInt(e.target.value) || 0 })}
        />
      </Field>
      <Field label="אופציות">
        <Toggle
          checked={!!section.collapsible}
          onChange={(v) => onChange({ collapsible: v })}
          label="ניתן לקיפול"
        />
        <Toggle
          checked={!!section.default_collapsed}
          onChange={(v) => onChange({ default_collapsed: v })}
          label="מקופל כברירת מחדל"
        />
      </Field>
    </aside>
  );
}

// ─── Field Properties ──────────────────────────────────────────────────
function FieldProperties({ field, onChange, formId, allFields, sections, rules, onRulesChange }) {
  const meta = getFieldTypeMeta(field.field_type);
  const isLayout = ['heading', 'paragraph', 'divider', 'spacer'].includes(field.field_type);

  // Rules that are relevant to this field (as trigger or target)
  const fieldRules = (rules || []).filter(
    (r) => r.trigger_field_key === field.field_key || r.target_field_key === field.field_key
  );

  return (
    <aside className="builder-props">
      <h3 className="props-title">
        <span className="prop-type-icon">{meta?.icon || '?'}</span>
        {meta?.label || field.field_type}
      </h3>

      {!isLayout && (
        <Field label="תווית">
          <input
            value={field.label || ''}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </Field>
      )}

      {isLayout && (
        <Field label={field.field_type === 'heading' ? 'טקסט הכותרת' : 'תוכן'}>
          <textarea
            rows={field.field_type === 'paragraph' ? 4 : 2}
            value={field.label || ''}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </Field>
      )}

      {!isLayout && (
        <>
          <Field label="מפתח שדה (key)">
            <input
              value={field.field_key || ''}
              onChange={(e) => onChange({ field_key: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase() })}
              dir="ltr"
              style={{ fontFamily: 'monospace' }}
            />
            <div className="props-hint">משמש כמזהה השדה ב-DB / API.</div>
          </Field>

          <Field label="טקסט עזר">
            <input
              value={field.placeholder || ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
            />
          </Field>

          <Field label="אופציות">
            <Toggle checked={!!field.required} onChange={(v) => onChange({ required: v })} label="שדה חובה" />
            <Toggle checked={!!field.read_only} onChange={(v) => onChange({ read_only: v })} label="קריאה בלבד" />
            <Toggle checked={!!field.hidden} onChange={(v) => onChange({ hidden: v })} label="הסתר ביציאה" />
          </Field>
        </>
      )}

      {/* Options editor for select/radio/checkbox */}
      {['select', 'radio', 'checkbox', 'multi_select'].includes(field.field_type) && (
        <Field label="אפשרויות בחירה">
          <OptionsEditor
            options={field.options || []}
            onChange={(options) => onChange({ options })}
          />
        </Field>
      )}

      {/* Module link config for module_lookup */}
      {field.field_type === 'module_lookup' && (
        <ModuleLinkEditor
          moduleLink={field.module_link || {}}
          onChange={(ml) => onChange({ module_link: ml })}
        />
      )}

      {/* Slider/Rating: min/max */}
      {['slider', 'rating'].includes(field.field_type) && (
        <SliderEditor
          validation={field.validation || {}}
          onChange={(v) => onChange({ validation: v })}
          type={field.field_type}
        />
      )}

      {/* Validation for text/number */}
      {!isLayout && (
        <ValidationEditor field={field} onChange={onChange} />
      )}

      {/* Layout */}
      <div className="props-divider" />
      <h4 className="props-subtitle">פריסה בטופס</h4>
      <Field>
        <Toggle
          checked={!!(field.style_overrides && field.style_overrides.full_width)}
          onChange={(v) => onChange({
            style_overrides: { ...(field.style_overrides || {}), full_width: v }
          })}
          label="רוחב מלא (שתי עמודות)"
        />
        <div className="props-hint">
          ברירת מחדל: שדה תופס עמודה אחת מתוך שתיים.
          רוחב מלא נכון ל-textarea, חתימה, או כותרות.
        </div>
      </Field>

      {/* Rules Builder — shown only for interactive (non-layout) fields */}
      {!isLayout && formId && onRulesChange && (
        <>
          <div className="props-divider" />
          <RulesBuilder
            formId={formId}
            fields={allFields || []}
            sections={sections || []}
            rules={rules || []}
            onRulesChange={onRulesChange}
            highlightFieldKey={field.field_key}
          />
        </>
      )}
    </aside>
  );
}

// ─── Module Link Editor ────────────────────────────────────────────────
function ModuleLinkEditor({ moduleLink, onChange }) {
  const set = (key, val) => onChange({ ...moduleLink, [key]: val });
  return (
    <>
      <div className="props-divider" />
      <h4 className="props-subtitle">קישור למודול</h4>
      <Field label="מודול">
        <select value={moduleLink.module || ''} onChange={(e) => set('module', e.target.value)}>
          <option value="">— בחר מודול —</option>
          <option value="customers">לקוחות</option>
          <option value="contacts">אנשי קשר</option>
          <option value="sites">אתרי לקוח</option>
          <option value="deals">עסקאות</option>
          <option value="orders">הזמנות</option>
          <option value="products">מוצרים</option>
          <option value="tasks">משימות</option>
        </select>
      </Field>
      <Field label="שדה תצוגה">
        <input
          value={moduleLink.displayField || ''}
          onChange={(e) => set('displayField', e.target.value)}
          placeholder='למשל: "company_name"'
          dir="ltr"
        />
        <div className="props-hint">שם העמודה שתוצג בתוצאות החיפוש.</div>
      </Field>
      <Field label="שדה ערך">
        <input
          value={moduleLink.valueField || 'id'}
          onChange={(e) => set('valueField', e.target.value)}
          dir="ltr"
          placeholder="id"
        />
        <div className="props-hint">שם העמודה שתישמר כערך השדה (בד"כ id).</div>
      </Field>
    </>
  );
}

// ─── Slider / Rating Editor ────────────────────────────────────────────
function SliderEditor({ validation, onChange, type }) {
  const set = (key, val) => onChange({ ...validation, [key]: val });
  return (
    <>
      <div className="props-divider" />
      <h4 className="props-subtitle">{type === 'rating' ? 'דירוג' : 'מחוון'}</h4>
      <div className="props-grid-2">
        <Field label="מינ'">
          <input type="number" value={validation.min ?? (type === 'rating' ? 1 : 0)}
            onChange={(e) => set('min', Number(e.target.value))} />
        </Field>
        <Field label="מקס'">
          <input type="number" value={validation.max ?? (type === 'rating' ? 5 : 100)}
            onChange={(e) => set('max', Number(e.target.value))} />
        </Field>
        {type === 'slider' && (
          <Field label="צעד">
            <input type="number" value={validation.step ?? 1}
              onChange={(e) => set('step', Number(e.target.value))} />
          </Field>
        )}
      </div>
    </>
  );
}

// ─── Helper components ─────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="prop-field">
      {label && <label className="prop-label">{label}</label>}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="prop-toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function OptionsEditor({ options, onChange }) {
  const handleAdd = () => onChange([...options, { label: 'אפשרות חדשה', value: String(options.length + 1) }]);
  const handleEdit = (i, patch) => onChange(options.map((o, idx) => idx === i ? { ...o, ...patch } : o));
  const handleRemove = (i) => onChange(options.filter((_, idx) => idx !== i));

  return (
    <div className="opts-editor">
      {options.map((o, i) => (
        <div key={i} className="opt-row">
          <input
            placeholder="תווית"
            value={o.label || ''}
            onChange={(e) => handleEdit(i, { label: e.target.value })}
          />
          <input
            placeholder="ערך"
            value={o.value || ''}
            dir="ltr"
            onChange={(e) => handleEdit(i, { value: e.target.value })}
          />
          <button type="button" className="btn-icon-sm danger" onClick={() => handleRemove(i)} aria-label="הסר אפשרות"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" style={{ marginTop: 6, fontSize: 12 }} onClick={handleAdd}>
        <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף אפשרות
      </button>
    </div>
  );
}

function ValidationEditor({ field, onChange }) {
  const v = field.validation || {};
  const update = (patch) => onChange({ validation: { ...v, ...patch } });

  const isText = ['text', 'textarea', 'email', 'phone', 'url', 'password'].includes(field.field_type);
  const isNum = ['number', 'currency', 'percentage'].includes(field.field_type);

  if (!isText && !isNum) return null;

  return (
    <>
      <div className="props-divider" />
      <h4 className="props-subtitle">ולידציה</h4>
      {isText && (
        <div className="props-grid-2">
          <Field label="אורך מינ'">
            <input type="number" value={v.minLength ?? ''} onChange={(e) => update({ minLength: e.target.value ? parseInt(e.target.value) : null })} />
          </Field>
          <Field label="אורך מקס'">
            <input type="number" value={v.maxLength ?? ''} onChange={(e) => update({ maxLength: e.target.value ? parseInt(e.target.value) : null })} />
          </Field>
        </div>
      )}
      {isNum && (
        <div className="props-grid-2">
          <Field label="מינ'">
            <input type="number" value={v.min ?? ''} onChange={(e) => update({ min: e.target.value !== '' ? Number(e.target.value) : null })} />
          </Field>
          <Field label="מקס'">
            <input type="number" value={v.max ?? ''} onChange={(e) => update({ max: e.target.value !== '' ? Number(e.target.value) : null })} />
          </Field>
        </div>
      )}
    </>
  );
}
