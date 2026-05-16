import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FormRenderer } from '@shared/renderer';
import { useFormFull } from '../../hooks/useForms';
import { api } from '../../api/client';
import './FormPreview.css';

/**
 * Preview the form. Two modes:
 *  - Desktop (default): free-form layout with x/y/w/h positioning
 *  - Mobile:            stacked vertical layout (matches the mobile app)
 *
 * When the URL carries `?linkedModule=X&linkedRecordId=Y` (e.g. from the
 * "Fill" button on a task), the form is rendered in REAL-FILL mode: the
 * Submit button actually POSTs to /api/forms/:id/submit and ties the
 * submission to that record. Otherwise it stays a no-op preview.
 */
export default function FormPreviewPage() {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedModule = searchParams.get('linkedModule');
  const linkedRecordId = searchParams.get('linkedRecordId');
  const isRealFill = !!(linkedModule && linkedRecordId);

  const { data: full, isLoading, error } = useFormFull(formId);
  const [submittedValues, setSubmittedValues] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [device, setDevice] = useState('desktop'); // 'desktop' | 'mobile'

  if (isLoading) return <div className="preview-loading">טוען טופס…</div>;
  if (error)     return <div className="preview-loading error">שגיאה: {String(error.message || error)}</div>;
  if (!full)     return null;

  // Build the values array the way the server expects it
  const buildValuesPayload = (values) => {
    const fieldByKey = Object.fromEntries((full.fields || []).map(f => [f.field_key, f]));
    return Object.entries(values).map(([key, val]) => {
      const f = fieldByKey[key] || {};
      const entry = {
        field_key: key,
        field_label: f.label || key,
        field_type: f.field_type || 'text',
      };
      if (f.field_type === 'signature' && typeof val === 'string' && val.startsWith('data:')) {
        entry.file_data = val;
      } else if ((f.field_type === 'file' || f.field_type === 'image') && Array.isArray(val)) {
        entry.value_json = val;
        entry.file_data = val[0]?.dataUrl || null;
      } else if (f.field_type === 'module_lookup' && val && typeof val === 'object') {
        entry.value_json = { id: val.id, label: val.label };
        entry.value_text = String(val.id);
      } else if (typeof val === 'number') {
        entry.value_number = val;
      } else if (Array.isArray(val) || (val && typeof val === 'object')) {
        entry.value_json = val;
      } else {
        entry.value_text = val != null ? String(val) : null;
      }
      return entry;
    });
  };

  const handleSubmit = async ({ values }) => {
    setSubmitError(null);
    if (isRealFill) {
      try {
        await api.post(`/api/forms/${formId}/submit`, {
          values: buildValuesPayload(values),
          linked_module: linkedModule,
          linked_record_id: linkedRecordId,
          status: 'submitted',
        });
        setSubmittedValues(values);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        setSubmitError(err?.message || String(err));
      }
    } else {
      setSubmittedValues(values);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const handleSaveDraft = ({ values }) => {
    if (isRealFill) {
      alert('שמירת טיוטה — לא נתמכת בשלב זה. השתמש בכפתור "שלח".');
      return;
    }
    alert('בתצוגה מקדימה, "שמור טיוטה" לא נשמר בפועל.\n\nהערכים:\n' + JSON.stringify(values, null, 2));
  };

  const layoutMode = device === 'desktop' ? 'grid' : 'stack';

  return (
    <div className="preview-page">
      <header className="preview-header">
        <button className="btn btn-ghost" onClick={() => isRealFill ? window.close() : navigate(`/forms/${formId}/edit`)}>
          {isRealFill ? <><i className="ti ti-x" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> סגור</> : '← חזרה לעורך'}
        </button>

        {!isRealFill && (
          <div className="device-toggle">
            <button
              className={`device-btn ${device === 'desktop' ? 'active' : ''}`}
              onClick={() => setDevice('desktop')}
            >
              <i className="ti ti-device-desktop" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> דסקטופ
            </button>
            <button
              className={`device-btn ${device === 'mobile' ? 'active' : ''}`}
              onClick={() => setDevice('mobile')}
            >
              <i className="ti ti-device-mobile" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> מובייל
            </button>
          </div>
        )}

        <div className="preview-badge" style={isRealFill ? { background: 'var(--accent)', color: '#fff' } : undefined}>
          {isRealFill ? `מילוי טופס · ${linkedModule}` : 'תצוגה מקדימה'}
        </div>
      </header>

      <main className={`preview-main ${device === 'mobile' ? 'mobile-frame' : ''}`}>
        {submittedValues && (
          <div className="preview-result">
            {isRealFill ? (
              <>
                <h3><i className="ti ti-circle-check" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הטופס נשלח בהצלחה</h3>
                <p>ההגשה נשמרה ומקושרת לרשומה.</p>
                <button className="btn btn-primary" onClick={() => window.close()}>
                  סגור חלון
                </button>
              </>
            ) : (
              <>
                <h3><i className="ti ti-circle-check" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הטופס "נשלח" (תצוגה מקדימה)</h3>
                <p>הערכים שהיו נשלחים לשרת:</p>
                <pre>{JSON.stringify(submittedValues, null, 2)}</pre>
                <button className="btn btn-primary" onClick={() => setSubmittedValues(null)}>
                  מלא שוב
                </button>
              </>
            )}
          </div>
        )}

        {submitError && (
          <div style={{
            background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA',
            padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 14,
          }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> שגיאה בשליחת הטופס: {submitError}
          </div>
        )}

        {!submittedValues && (
          <div className={`preview-form-wrap ${device === 'mobile' ? 'mobile-wrap' : 'desktop-wrap'}`}>
            <FormRenderer
              form={full}
              sections={full.sections || []}
              fields={full.fields || []}
              rules={full.rules || []}
              onSubmit={handleSubmit}
              onSaveDraft={isRealFill ? null : handleSaveDraft}
              submitLabel={isRealFill ? 'שלח טופס' : 'שלח (תצוגה מקדימה)'}
              draftLabel="שמור טיוטה"
              layoutMode={layoutMode}
            />
          </div>
        )}
      </main>
    </div>
  );
}
