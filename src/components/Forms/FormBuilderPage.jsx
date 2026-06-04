import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useFormFull, useUpdateForm, usePublishForm, useArchiveForm,
  useCreateSection, useUpdateSection, useDeleteSection,
  useCreateField, useUpdateField, useDeleteField,
} from '../../hooks/useForms';
import { generateFieldKey, getFieldTypeMeta } from './Builder/FIELD_TYPES';
import FieldPalette from './Builder/FieldPalette';
import SectionBlock from './Builder/SectionBlock';
import PropertiesPanel from './Builder/PropertiesPanel';
import { subscribeLog, log, clearLog } from './Builder/dragState';
import './FormBuilder.css';

// Debounce helper
function useDebouncedCallback(fn, delay = 600) {
  const [timer, setTimer] = useState(null);
  return (...args) => {
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => fn(...args), delay));
  };
}

// In-UI event log panel
function DebugPanel({ open, onClose }) {
  const [events, setEvents] = useState([]);
  useEffect(() => subscribeLog(setEvents), []);
  if (!open) return null;
  return (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <strong><i className="ti ti-bug" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> Builder Events ({events.length})</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => clearLog()} className="btn-icon-sm" title="נקה" aria-label="נקה"><i className="ti ti-trash" aria-hidden="true" /></button>
          <button onClick={onClose} className="btn-icon-sm" title="סגור" aria-label="סגור"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      </div>
      <pre className="debug-panel-body">
        {events.length === 0 ? '(אין אירועים. גרור שדה לקאנבס...)' : events.join('\n')}
      </pre>
    </div>
  );
}

export default function FormBuilderPage() {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewOnly = searchParams.get('viewOnly') === '1';

  const { data: full, isLoading, error } = useFormFull(formId);
  const updateForm = useUpdateForm();
  const publishForm = usePublishForm();
  const archiveForm = useArchiveForm();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const createField = useCreateField();
  const updateField = useUpdateField();
  const deleteField = useDeleteField();

  const [formData, setFormData] = useState(null);
  const [sections, setSections] = useState([]);
  const [fields, setFields] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [savingNote, setSavingNote] = useState(null);
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    if (!full) return;
    const { sections: srvSections, fields: srvFields, rules: srvRules, ...meta } = full;
    setFormData(meta);
    setSections(srvSections || []);
    setRules(srvRules || []);
    // Sort fields by sort_order then created_at for deterministic flow
    const sorted = [...(srvFields || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setFields(sorted);
    if (!selectedSectionId && srvSections?.length) {
      setSelectedSectionId(srvSections[0].id);
    }
  }, [full]);  // eslint-disable-line

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );
  const selectedSection = useMemo(
    () => (!selectedFieldId && sections.find((s) => s.id === selectedSectionId)) || null,
    [sections, selectedSectionId, selectedFieldId]
  );

  // ── Form metadata ────────────────────────────────────────────────────
  const debouncedSaveForm = useDebouncedCallback(async (patch) => {
    setSavingNote('שומר…');
    try {
      await updateForm.mutateAsync({ id: formId, ...patch });
      setSavingNote('נשמר');
      setTimeout(() => setSavingNote(null), 1200);
    } catch (e) { setSavingNote(`שגיאה: ${e.message}`); }
  });

  const handleFormChange = (patch) => {
    setFormData((d) => ({ ...d, ...patch }));
    debouncedSaveForm(patch);
  };

  // ── Section ─────────────────────────────────────────────────────────
  const handleAddSection = async () => {
    const created = await createSection.mutateAsync({
      formId,
      title: `אזור ${sections.length + 1}`,
      sort_order: sections.length,
    });
    setSections((s) => [...s, created]);
    setSelectedSectionId(created.id);
    setSelectedFieldId(null);
  };

  const debouncedSaveSection = useDebouncedCallback(async (id, patch) => {
    try { await updateSection.mutateAsync({ formId, id, ...patch }); }
    catch (e) { console.error('save section', e); }
  });

  const handleSectionChange = (id, patch) => {
    setSections((arr) => arr.map((s) => s.id === id ? { ...s, ...patch } : s));
    debouncedSaveSection(id, patch);
  };

  const handleDeleteSection = async (id) => {
    if (!confirm('למחוק את האזור הזה? כל השדות בתוכו יימחקו גם.')) return;
    await deleteSection.mutateAsync({ formId, id });
    setSections((s) => s.filter((x) => x.id !== id));
    setFields((f) => f.filter((x) => x.section_id !== id));
    if (selectedSectionId === id) setSelectedSectionId(sections[0]?.id || null);
  };

  // ── Field add/delete ────────────────────────────────────────────────
  const handleAddField = async (fieldType, target = {}) => {
    log(`addField type=${fieldType}`);
    try {
      const meta = getFieldTypeMeta(fieldType);
      if (!meta) return;
      let sectionId = target.sectionId || selectedSectionId;

      if (!sectionId) {
        const created = await createSection.mutateAsync({ formId, title: 'אזור 1', sort_order: 0 });
        setSections((s) => [...s, created]);
        sectionId = created.id;
        setSelectedSectionId(created.id);
      }

      // Append at end of this section's flow
      const fieldsInSec = fields.filter((f) => f.section_id === sectionId);
      const nextOrder = fieldsInSec.length > 0
        ? Math.max(...fieldsInSec.map((f) => f.sort_order || 0)) + 1
        : 0;

      const fieldKey = generateFieldKey(fields.map((f) => f.field_key));
      // Layout fields default to full-width
      const isLayout = ['heading', 'paragraph', 'divider', 'spacer'].includes(fieldType);

      const payload = {
        formId,
        section_id: sectionId,
        field_key: fieldKey,
        label: meta.label,
        field_type: fieldType,
        sort_order: nextOrder,
        ...(isLayout ? { style_overrides: { full_width: true } } : {}),
        ...meta.defaults,
      };
      const created = await createField.mutateAsync(payload);
      setFields((arr) => [...arr, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setSelectedFieldId(created.id);
    } catch (err) {
      log(`addField error: ${err?.message || err}`);
    }
  };

  const debouncedSaveField = useDebouncedCallback(async (id, patch) => {
    try { await updateField.mutateAsync({ formId, id, ...patch }); }
    catch (e) { console.error('save field', e); }
  });

  const handleFieldChange = (id, patch) => {
    setFields((arr) => arr.map((f) => f.id === id ? { ...f, ...patch } : f));
    debouncedSaveField(id, patch);
  };

  const handleDeleteField = async (id) => {
    await deleteField.mutateAsync({ formId, id });
    setFields((arr) => arr.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  // ── Reorder (move up/down) ──────────────────────────────────────────
  const moveField = (id, direction) => {
    setFields((arr) => {
      const list = [...arr].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const target = list.find((f) => f.id === id);
      if (!target) return arr;
      const sectionList = list.filter((f) => f.section_id === target.section_id);
      const idx = sectionList.indexOf(target);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sectionList.length) return arr;
      const swap = sectionList[swapIdx];

      const swapOrder = swap.sort_order ?? 0;
      const targetOrder = target.sort_order ?? 0;

      // Persist both
      updateField.mutate({ formId, id: target.id, sort_order: swapOrder });
      updateField.mutate({ formId, id: swap.id, sort_order: targetOrder });

      return list.map((f) => {
        if (f.id === target.id) return { ...f, sort_order: swapOrder };
        if (f.id === swap.id)   return { ...f, sort_order: targetOrder };
        return f;
      });
    });
  };

  const handleToggleFullWidth = (id) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    const cur = !!(field.style_overrides && field.style_overrides.full_width);
    const next = { ...(field.style_overrides || {}), full_width: !cur };
    handleFieldChange(id, { style_overrides: next });
  };

  // ── Lifecycle ────────────────────────────────────────────────────────
  const handlePublishToggle = async () => {
    if (formData.status === 'active') {
      await archiveForm.mutateAsync(formId);
      setFormData((d) => ({ ...d, status: 'archived' }));
    } else {
      await publishForm.mutateAsync(formId);
      setFormData((d) => ({ ...d, status: 'active' }));
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  if (isLoading) return <div className="builder-loading">טוען טופס…</div>;
  if (error) return <div className="builder-loading error">שגיאה: {String(error.message)}</div>;
  if (!formData) return null;

  const fieldsBySection = sections.reduce((acc, s) => {
    acc[s.id] = fields
      .filter((f) => f.section_id === s.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return acc;
  }, {});

  const handleSelectForm = () => {
    setSelectedFieldId(null);
    setSelectedSectionId(null);
  };

  return (
    <div className="form-builder">
      <header className="builder-topbar">
        <button className="btn btn-ghost" onClick={() => navigate('/forms')}>
          ← רשימה
        </button>
        <div className="builder-title">
          <input
            value={formData.name || ''}
            placeholder="שם הטופס..."
            onChange={(e) => !viewOnly && handleFormChange({ name: e.target.value })}
            readOnly={viewOnly}
          />
          <span className={`status-pill status-${formData.status}`}>
            {formData.status === 'active' ? 'פעיל' : (formData.status === 'archived' ? 'לא פעיל' : 'טיוטה')}
          </span>
          {viewOnly && <span style={{ fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B66', borderRadius: 999, padding: '2px 10px', fontWeight: 600, marginRight: 8 }}>צפייה בלבד</span>}
          {!viewOnly && savingNote && <span className="saving-note">{savingNote}</span>}
        </div>
        {!viewOnly && (
          <div className="builder-topbar-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setDebugOpen((v) => !v)}
              title="פאנל אירועים"
            aria-label="פאנל אירועים"><i className="ti ti-bug" aria-hidden="true" /></button>
            <button
              className="btn btn-secondary"
              onClick={() => window.open(`/forms/${formId}/preview`, '_blank')}
              title="פתח תצוגה מקדימה בכרטיסייה חדשה"
            ><i className="ti ti-eye" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> תצוגה מקדימה</button>
            <button
              className={`btn ${formData.status === 'active' ? 'btn-warning-soft' : 'btn-primary'}`}
              onClick={handlePublishToggle}
              disabled={publishForm.isPending || archiveForm.isPending}
              title={formData.status === 'active'
                ? 'השבת — הטופס לא יוצג למשתמשי המובייל'
                : 'הפעל — הטופס יסונכרן למובייל'}
            >
              {formData.status === 'active' ? <><i className="ti ti-player-pause" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> השבת</> : <><i className="ti ti-upload" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הפעל</>}
            </button>
          </div>
        )}
      </header>

      <div className="builder-body">
        {!viewOnly && <FieldPalette onAddField={(type) => handleAddField(type)} />}

        <main className="builder-canvas-wrap" onClick={viewOnly ? undefined : handleSelectForm}>
          <div className="builder-canvas" style={viewOnly ? { pointerEvents: 'none' } : {}}>
            {sections.length === 0 && (
              <div className="canvas-empty">
                <h3>הטופס ריק</h3>
                <p>הוסף אזור ראשון כדי להתחיל לבנות.</p>
                <button className="btn btn-primary" onClick={handleAddSection}>
                  <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף אזור ראשון
                </button>
              </div>
            )}

            {sections.map((s) => (
              <SectionBlock
                key={s.id}
                section={s}
                fields={fieldsBySection[s.id] || []}
                selectedFieldId={selectedFieldId}
                selectedSectionId={selectedSectionId}
                onSelectSection={(id) => { setSelectedSectionId(id); setSelectedFieldId(null); }}
                onSelectField={(id) => setSelectedFieldId(id)}
                onFieldDelete={handleDeleteField}
                onFieldMoveUp={(id) => moveField(id, 'up')}
                onFieldMoveDown={(id) => moveField(id, 'down')}
                onFieldToggleFullWidth={handleToggleFullWidth}
                onSectionEdit={handleSectionChange}
                onSectionDelete={handleDeleteSection}
                onDropField={(sectionId, type) => handleAddField(type, { sectionId })}
              />
            ))}

            {!viewOnly && sections.length > 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <button className="btn btn-ghost" onClick={handleAddSection}>
                  <i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הוסף אזור חדש
                </button>
              </div>
            )}
          </div>
        </main>

        {!viewOnly && <PropertiesPanel
          field={selectedField}
          section={selectedSection}
          formData={selectedField || selectedSection ? null : formData}
          onFieldChange={(patch) => handleFieldChange(selectedFieldId, patch)}
          onSectionChange={(patch) => handleSectionChange(selectedSectionId, patch)}
          onFormChange={handleFormChange}
          formId={formId}
          allFields={fields}
          sections={sections}
          rules={rules}
          onRulesChange={setRules}
        />}
      </div>

      <DebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />
    </div>
  );
}
