/**
 * SubmissionsPage — view and manage submissions for a specific form.
 * Route: /forms/:id/submissions
 */
import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ModuleTopbar from '../Layout/ModuleTopbar';
import { useFormFull, useFormSubmissions } from '../../hooks/useForms';
import { useCompanyInfo } from '../../hooks/useDataManagement';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import SubmissionPreviewModal, { buildSubmissionHTML } from './SubmissionPreview';
import './SubmissionsPage.css';

const STATUS_LABEL = {
  draft: 'טיוטה',
  submitted: 'הוגש',
  pending: 'ממתין',
  reviewed: 'נסקר',
  approved: 'אושר',
  rejected: 'נדחה',
};
const STATUS_COLOR = {
  draft: 'var(--text-3)',
  submitted: 'var(--accent)',
  pending: 'var(--warning)',
  reviewed: 'var(--info, #0EA5E9)',
  approved: 'var(--success)',
  rejected: 'var(--danger)',
};

export default function SubmissionsPage() {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: full } = useFormFull(formId);
  const { data, isLoading, error } = useFormSubmissions(formId, { limit: 100 });
  const { data: companyInfo } = useCompanyInfo();
  const [selected, setSelected] = useState(null);       // expanded submission
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);

  const submissions = data?.data || [];
  const fields = full?.fields || [];
  const sections = full?.sections || [];

  const filtered = useMemo(() => {
    if (!statusFilter) return submissions;
    return submissions.filter((s) => s.status === statusFilter);
  }, [submissions, statusFilter]);

  const handleStatusChange = async (subId, newStatus) => {
    setUpdatingId(subId);
    try {
      await api.put(`/api/submissions/${subId}/status`, { status: newStatus });
      qc.invalidateQueries({ queryKey: ['form-submissions', formId] });
      if (selected?.id === subId) setSelected((s) => ({ ...s, status: newStatus }));
    } catch (e) {
      alert('שגיאה בעדכון סטטוס: ' + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (subId) => {
    if (!confirm('למחוק הגשה זו לצמיתות?')) return;
    try {
      await api.delete(`/api/submissions/${subId}`);
      qc.invalidateQueries({ queryKey: ['form-submissions', formId] });
      if (selected?.id === subId) setSelected(null);
    } catch (e) {
      alert('שגיאה במחיקה: ' + e.message);
    }
  };

  const handleExpand = async (sub) => {
    if (selected?.id === sub.id) { setSelected(null); return; }
    try {
      const detail = await api.get(`/api/submissions/${sub.id}/full`);
      setSelected(detail);
    } catch {
      setSelected(sub);
    }
  };

  /**
   * Open the styled preview (with header/logo, like a quote).
   * Loads full submission detail (with values) if we don't already have it.
   */
  const handlePreview = async (sub, e) => {
    e?.stopPropagation();
    let detail = (selected?.id === sub.id) ? selected : null;
    if (!detail) {
      try {
        detail = await api.get(`/api/submissions/${sub.id}/full`);
      } catch (err) {
        alert('שגיאה בטעינת פרטי ההגשה: ' + err.message);
        return;
      }
    }
    const html = buildSubmissionHTML({
      form: full || {},
      submission: detail,
      submissionValues: detail.values || [],
      sections,
      fields,
      companyInfo: companyInfo || {},
    });
    setPreviewHtml(html);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="submissions-page">
      <ModuleTopbar icon="ti-clipboard-list" title="הגשות טפסים">
        <button className="tdb-calendar-btn" onClick={() => navigate('/forms')}>
          <i className="ti ti-arrow-right" /> רשימת טפסים
        </button>
        <button className="tdb-calendar-btn" onClick={() => navigate(`/forms/${formId}/edit`)}>
          <i className="ti ti-edit" /> ערוך טופס
        </button>
      </ModuleTopbar>

      {/* Filter pills */}
      <div className="submissions-filters">
        {['', 'submitted', 'pending', 'reviewed', 'approved', 'rejected', 'draft'].map((s) => (
          <button
            key={s}
            className={`pill ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s ? STATUS_LABEL[s] : `הכל (${submissions.length})`}
            {s && ` (${submissions.filter(x => x.status === s).length})`}
          </button>
        ))}
      </div>

      {isLoading && <div className="submissions-empty">טוען הגשות...</div>}
      {error && <div className="submissions-empty error">שגיאה: {String(error.message)}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="submissions-empty">
          <div style={{ fontSize: 40, marginBottom: 8 }}><i className="ti ti-mailbox" aria-hidden="true" /></div>
          <p>אין הגשות{statusFilter ? ` במצב "${STATUS_LABEL[statusFilter]}"` : ''}</p>
        </div>
      )}

      <div className="submissions-list">
        {filtered.map((sub) => (
          <div key={sub.id} className={`submission-row ${selected?.id === sub.id ? 'is-expanded' : ''}`}>
            {/* Summary row */}
            <div className="submission-summary" onClick={() => handleExpand(sub)}>
              <span
                className="sub-status-badge"
                style={{ background: STATUS_COLOR[sub.status] + '22', color: STATUS_COLOR[sub.status] }}
              >
                {STATUS_LABEL[sub.status] || sub.status}
              </span>
              <span className="sub-num">{sub.submission_num || sub.id.slice(0, 8)}</span>
              <span className="sub-date">{formatDate(sub.submitted_at || sub.created_at)}</span>
              <span className="sub-ip">{sub.ip_address ? `IP: ${sub.ip_address}` : ''}</span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={(e) => handlePreview(sub, e)}
                title="הצג טופס מעוצב — ניתן להדפיס או לייצא PDF"
              >
                <i className="ti ti-eye" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הצג / PDF
              </button>
              <span className="sub-expand-icon">{selected?.id === sub.id ? '▲' : '▼'}</span>
            </div>

            {/* Expanded detail */}
            {selected?.id === sub.id && (
              <div className="submission-detail">
                {/* Values */}
                <div className="submission-values">
                  {(selected.values || []).length === 0 && (
                    <p className="muted-hint">אין ערכים מפורטים זמינים.</p>
                  )}
                  {(selected.values || []).map((v) => (
                    <div key={v.id || v.field_key} className="sub-value-row">
                      <span className="sub-value-label">{v.field_label || v.field_key}</span>
                      <span className="sub-value-val">
                        {renderValue(v)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="submission-actions">
                  <span className="sub-action-label">שנה סטטוס:</span>
                  {['reviewed', 'approved', 'rejected'].map((s) => (
                    <button
                      key={s}
                      className="btn btn-secondary"
                      disabled={sub.status === s || updatingId === sub.id}
                      onClick={() => handleStatusChange(sub.id, s)}
                      style={{ color: STATUS_COLOR[s] }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                  <button
                    className="btn btn-ghost"
                    style={{ marginRight: 'auto', color: 'var(--danger)' }}
                    onClick={() => handleDelete(sub.id)}
                  >
                    <i className="ti ti-trash" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> מחק
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Styled preview modal — shows the submission like a quote, with print/PDF */}
      {previewHtml && (
        <SubmissionPreviewModal
          html={previewHtml}
          onClose={() => setPreviewHtml(null)}
          title={`${full?.name || 'טופס'} — הגשה`}
        />
      )}
    </div>
  );
}

function renderValue(v) {
  // Multi-file (image/file) — array of { name, type, dataUrl }
  if (Array.isArray(v.value_json) && v.value_json.length > 0 && v.value_json[0]?.dataUrl) {
    return (
      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {v.value_json.map((it, i) => {
          const isImg = (it.dataUrl || '').startsWith('data:image') || (it.type || '').startsWith('image/');
          if (isImg) {
            return (
              <img
                key={i}
                src={it.dataUrl}
                alt={it.name || ''}
                style={{ maxWidth: 120, maxHeight: 90, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            );
          }
          return <span key={i} style={{ fontSize: 12 }}><i className="ti ti-paperclip" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> {it.name || 'קובץ'}</span>;
        })}
      </span>
    );
  }

  // Single legacy file/image
  if (v.file_data) {
    if (v.file_data.startsWith('data:image')) {
      return <img src={v.file_data} alt="תמונה" style={{ maxWidth: 160, maxHeight: 120, borderRadius: 6 }} />;
    }
    return <span><i className="ti ti-paperclip" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 2 }} /> קובץ מצורף</span>;
  }

  // Module lookup — show label not ID
  if (v.value_json && typeof v.value_json === 'object' && !Array.isArray(v.value_json) && v.value_json.label) {
    return <span style={{ fontWeight: 600 }}>{v.value_json.label}</span>;
  }

  if (v.value_json) {
    if (Array.isArray(v.value_json)) return v.value_json.join(', ');
    return JSON.stringify(v.value_json);
  }
  return String(v.value_text ?? v.value_number ?? '—');
}
