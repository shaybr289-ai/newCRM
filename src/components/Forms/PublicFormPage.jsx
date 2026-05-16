/**
 * PublicFormPage — no login required.
 * Route: /public/forms/:id
 *
 * Loads form from the public API (/api/public/forms/:id)
 * and submits to /api/public/forms/:id/submit.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import FormRenderer from '@shared/renderer/FormRenderer';
import './PublicFormPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export default function PublicFormPage() {
  const { id: formId } = useParams();
  const [formData, setFormData] = useState(null);
  const [sections, setSections] = useState([]);
  const [fields, setFields] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/public/forms/${formId}`)
      .then((data) => {
        setFormData(data.form || data);
        setSections(data.sections || []);
        setFields(data.fields || []);
        setRules(data.rules || []);
        setSuccessMsg(data.form?.settings?.successMsg || data.settings?.successMsg || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [formId]);

  const handleSubmit = async ({ values }) => {
    const fieldMap = Object.fromEntries(fields.map((f) => [f.field_key, f]));

    const valuesArr = Object.entries(values).map(([key, val]) => {
      const f = fieldMap[key] || {};
      const entry = {
        field_key: key,
        field_label: f.label || key,
        field_type: f.field_type || 'text',
      };

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

    await apiFetch(`/api/public/forms/${formId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ values: valuesArr }),
    });

    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="public-form-page">
        <div className="public-form-loading">
          <div className="public-spinner" />
          <p>טוען טופס...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-form-page">
        <div className="public-form-error">
          <div className="error-icon"><i className="ti ti-alert-triangle" aria-hidden="true" /></div>
          <h2>לא ניתן לטעון את הטופס</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-form-page">
        <div className="public-form-success">
          <div className="success-icon"><i className="ti ti-circle-check" aria-hidden="true" /></div>
          <h2>הטופס הוגש בהצלחה!</h2>
          {successMsg
            ? <p>{successMsg}</p>
            : <p>תודה על מילוי הטופס. נחזור אליך בהקדם.</p>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-page" dir="rtl">
      <div className="public-form-container">
        {formData?.icon && (
          <div className="public-form-icon">{formData.icon}</div>
        )}
        <FormRenderer
          form={formData}
          sections={sections}
          fields={fields}
          rules={rules}
          onSubmit={handleSubmit}
          submitLabel={formData?.settings?.submitLabel || 'שלח טופס'}
          layoutMode="stack"
        />
      </div>
    </div>
  );
}
