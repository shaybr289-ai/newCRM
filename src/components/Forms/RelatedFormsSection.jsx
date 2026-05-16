/**
 * RelatedFormsSection — shows forms available + past submissions for any entity.
 * Drop this into CustomerDetailPage, ContactsPage, DealsPage, TasksPage, etc.
 *
 * Usage:
 *   <RelatedFormsSection entityType="customers" entityId={customer.id} />
 *
 * entityType must match a key in FORMS_LINKABLE_MODULES in server-v2.js:
 *   'customers' | 'contacts' | 'sites' | 'deals' | 'orders' | 'tasks'
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import FormRenderer from '@shared/renderer/FormRenderer';
import './RelatedFormsSection.css';

const STATUS_LABEL = {
  draft: 'טיוטה',
  submitted: 'הוגש',
  pending: 'ממתין',
  reviewed: 'נסקר',
  approved: 'אושר',
  rejected: 'נדחה',
};
const STATUS_COLOR = {
  submitted: 'var(--accent)',
  pending: 'var(--warning)',
  reviewed: 'var(--info, #0EA5E9)',
  approved: 'var(--success)',
  rejected: 'var(--danger)',
  draft: 'var(--text-3)',
};

export default function RelatedFormsSection({ entityType, entityId }) {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFormId, setActiveFormId] = useState(null);  // form being filled
  const [activeFormFull, setActiveFormFull] = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    try {
      const data = await api.get(`/api/entity-forms/${entityType}/${entityId}`);
      setForms(data.forms || []);
      setSubmissions(data.submissions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const openForm = async (formId) => {
    setLoadingForm(true);
    setSubmitted(false);
    try {
      const full = await api.get(`/api/forms/${formId}/full`);
      setActiveFormFull(full);
      setActiveFormId(formId);
    } catch (e) {
      alert('שגיאה בטעינת הטופס: ' + e.message);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleSubmit = async ({ values }) => {
    if (!activeFormFull || !activeFormId) return;
    const fieldMap = Object.fromEntries((activeFormFull.fields || []).map((f) => [f.field_key, f]));

    const valuesArr = Object.entries(values).map(([key, val]) => {
      const f = fieldMap[key] || {};
      const entry = { field_key: key, field_label: f.label || key, field_type: f.field_type || 'text' };
      if (typeof val === 'string' && val.startsWith('data:')) {
        entry.file_data = val;
      } else if (typeof val === 'number') {
        entry.value_number = val;
      } else if (Array.isArray(val) || (val && typeof val === 'object')) {
        entry.value_json = val;
      } else {
        entry.value_text = val != null ? String(val) : null;
      }
      return entry;
    });

    await api.post(`/api/forms/${activeFormId}/submit`, {
      values: valuesArr,
      linked_module: entityType,
      linked_record_id: entityId,
    });

    setSubmitted(true);
    setActiveFormId(null);
    setActiveFormFull(null);
    load(); // refresh submissions list
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <div className="related-forms-loading">טוען טפסים...</div>;
  if (error) return <div className="related-forms-error">שגיאה: {error}</div>;

  return (
    <div className="related-forms-section">
      {/* Active form fill modal */}
      {activeFormId && activeFormFull && (
        <div className="related-form-modal-overlay" onClick={() => { setActiveFormId(null); setActiveFormFull(null); }}>
          <div className="related-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="related-form-modal-header">
              <h3>{activeFormFull.name}</h3>
              <button className="btn-icon-sm" onClick={() => { setActiveFormId(null); setActiveFormFull(null); }} aria-label="סגור"><i className="ti ti-x" aria-hidden="true" /></button>
            </div>
            <div className="related-form-modal-body">
              <FormRenderer
                form={activeFormFull}
                sections={activeFormFull.sections || []}
                fields={activeFormFull.fields || []}
                rules={activeFormFull.rules || []}
                onSubmit={handleSubmit}
                onCancel={() => { setActiveFormId(null); setActiveFormFull(null); }}
                layoutMode="stack"
              />
            </div>
          </div>
        </div>
      )}

      {/* Success banner */}
      {submitted && (
        <div className="related-forms-success">
          <i className="ti ti-circle-check" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הטופס הוגש בהצלחה
        </div>
      )}

      {/* Available forms */}
      {forms.length > 0 && (
        <div className="related-forms-available">
          <h4 className="related-forms-subtitle"><i className="ti ti-forms" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> טפסים זמינים</h4>
          <div className="related-forms-grid">
            {forms.map((f) => (
              <button
                key={f.id}
                className="related-form-card"
                onClick={() => openForm(f.id)}
                disabled={loadingForm}
              >
                <span className="related-form-icon"><i className={`ti ${f.icon || 'ti-forms'}`} aria-hidden="true" /></span>
                <span className="related-form-name">{f.name}</span>
                <span className="related-form-arrow">←</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {forms.length === 0 && (
        <div className="related-forms-empty">
          <p>אין טפסים מקושרים לרכיב זה.</p>
          <button className="btn btn-ghost" onClick={() => navigate('/forms')}>
            נהל טפסים →
          </button>
        </div>
      )}

      {/* Past submissions */}
      {submissions.length > 0 && (
        <div className="related-forms-submissions">
          <h4 className="related-forms-subtitle"><i className="ti ti-send" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הגשות קודמות ({submissions.length})</h4>
          <div className="related-submissions-list">
            {submissions.map((s) => (
              <div key={s.id} className="related-submission-row">
                <span
                  className="sub-status-badge"
                  style={{ background: (STATUS_COLOR[s.status] || 'var(--text-3)') + '22', color: STATUS_COLOR[s.status] || 'var(--text-3)' }}
                >
                  {STATUS_LABEL[s.status] || s.status}
                </span>
                <span className="related-sub-name">{s.form_name}</span>
                <span className="related-sub-date">{formatDate(s.submitted_at || s.created_at)}</span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '3px 10px' }}
                  onClick={() => navigate(`/forms/${s.form_id}/submissions`)}
                >
                  פרטים
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
