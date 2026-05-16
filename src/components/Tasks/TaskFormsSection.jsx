/**
 * TaskFormsSection — embedded inside the task editor.
 *
 * Shows:
 *   1. List of forms ATTACHED to this task (form_assignments rows) with
 *      a per-form status: "filled" if there's a submission linked to the
 *      task, otherwise "pending".
 *   2. Picker to attach an additional form from the catalog.
 *   3. Detach button per attached form.
 *
 * Props:
 *   taskId  — uuid of the task; if null, the section asks the user to save first.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

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

export default function TaskFormsSection({ taskId }) {
  const navigate = useNavigate();
  const [data, setData] = useState({ forms: [], submissions: [] });
  const [allForms, setAllForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Load assigned forms + submissions for this task
  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true); setError(null);
    try {
      const r = await api.get(`/api/entity-forms/tasks/${taskId}`);
      setData({ forms: r.forms || [], submissions: r.submissions || [] });
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Load full active forms list (for the picker)
  const loadCatalog = useCallback(async () => {
    try {
      const r = await api.get('/api/forms-list');
      setAllForms(r.data || []);
    } catch { setAllForms([]); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (showPicker) loadCatalog(); }, [showPicker, loadCatalog]);

  // Group submissions by form so we can mark each attached form as filled / pending
  const submissionsByForm = useMemo(() => {
    const m = new Map();
    for (const s of data.submissions) {
      if (!m.has(s.form_id)) m.set(s.form_id, []);
      m.get(s.form_id).push(s);
    }
    return m;
  }, [data.submissions]);

  // Count of forms that are required (assigned) but still have no submission
  const pendingCount = useMemo(() => {
    return data.forms.filter(f =>
      f.assignment_id && !(submissionsByForm.get(f.id) || []).length
    ).length;
  }, [data.forms, submissionsByForm]);

  const handleAttach = async (formId) => {
    setBusyId('attach');
    try {
      await api.post(`/api/forms/${formId}/assignments`, {
        entity_type: 'tasks',
        entity_id: taskId,
      });
      await load();
      setShowPicker(false);
      setPickerSearch('');
    } catch (err) {
      alert('שגיאה בהצמדת הטופס: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDetach = async (form) => {
    if (!form.assignment_id) return;
    if (!confirm(`להסיר את הטופס "${form.name}" מהמשימה?`)) return;
    setBusyId(form.id);
    try {
      await api.delete(`/api/forms/${form.id}/assignments/${form.assignment_id}`);
      await load();
    } catch (err) {
      alert('שגיאה: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  // Open form fill page with the task pre-linked
  const handleFill = (formId) => {
    // Open in a new tab so the user doesn't lose their unsaved task changes
    window.open(
      `/forms/${formId}/preview?linkedModule=tasks&linkedRecordId=${taskId}`,
      '_blank'
    );
  };

  if (!taskId) {
    return (
      <div style={{
        padding: 14,
        border: '1px dashed var(--border)',
        borderRadius: 8,
        color: 'var(--text-3)',
        fontSize: 13,
        textAlign: 'center',
      }}>
        <i className="ti ti-device-floppy" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> שמור את המשימה קודם — לאחר השמירה תוכל להצמיד טפסים למילוי.
      </div>
    );
  }

  // Filter the picker's catalog: hide forms already attached
  const attachedIds = new Set(data.forms.filter(f => f.assignment_id).map(f => f.id));
  const pickerOptions = allForms
    .filter(f => !attachedIds.has(f.id))
    .filter(f => !pickerSearch
      || f.name.includes(pickerSearch)
      || (f.form_num || '').includes(pickerSearch));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 className="form-section-title" style={{ margin: 0 }}>
          <i className="ti ti-forms" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 6 }} /> טפסים מצורפים למשימה
          {pendingCount > 0 && (
            <span style={{
              background: 'var(--warning)', color: '#fff',
              borderRadius: 99, padding: '2px 10px',
              fontSize: 11, fontWeight: 700, marginRight: 10,
            }}>
              {pendingCount} ממתינים למילוי
            </span>
          )}
        </h3>
        <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }}
          onClick={() => setShowPicker(p => !p)}>
          {showPicker ? <><i className="ti ti-x" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> סגור</> : <><i className="ti ti-plus" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הצמד טופס</>}
        </button>
      </div>

      {/* Picker */}
      {showPicker && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 14, marginBottom: 14,
        }}>
          <input
            type="text"
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            placeholder="חיפוש טופס..."
            style={{ width: '100%', marginBottom: 10 }}
            autoFocus
          />
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pickerOptions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 12, color: 'var(--text-3)', fontSize: 13 }}>
                {allForms.length === 0 ? 'טוען טפסים...' : 'אין טפסים להצמדה.'}
              </div>
            )}
            {pickerOptions.map(f => (
              <button
                key={f.id}
                type="button"
                disabled={busyId === 'attach'}
                onClick={() => handleAttach(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 18 }}>{f.icon?.startsWith('ti-') ? <i className={`ti ${f.icon}`} aria-hidden="true" /> : (f.icon || <i className="ti ti-forms" aria-hidden="true" />)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {f.form_num}
                    {f.linked_module && f.linked_module !== 'tasks'
                      ? ` · קשור ל${f.linked_module}` : ''}
                  </div>
                </div>
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>הצמד ←</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <div style={{ padding: 12, fontSize: 13, color: 'var(--text-3)' }}>טוען...</div>}
      {error && <div style={{ padding: 12, fontSize: 13, color: 'var(--danger)' }}>שגיאה: {error}</div>}

      {!loading && data.forms.length === 0 && (
        <div style={{
          padding: 20, textAlign: 'center', color: 'var(--text-3)',
          border: '1px dashed var(--border)', borderRadius: 8, fontSize: 13,
        }}>
          אין טפסים מצורפים למשימה. לחץ "הצמד טופס" כדי לבחור.
        </div>
      )}

      {!loading && data.forms.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.forms.map(f => {
            const subs = submissionsByForm.get(f.id) || [];
            const filled = subs.length > 0;
            const isAssigned = !!f.assignment_id;
            return (
              <div
                key={f.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'var(--bg-card)',
                  border: `1px solid ${isAssigned ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 10,
                  borderRightWidth: isAssigned ? 4 : 1,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 20 }}>{f.icon?.startsWith('ti-') ? <i className={`ti ${f.icon}`} aria-hidden="true" /> : (f.icon || <i className="ti ti-forms" aria-hidden="true" />)}</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</span>
                    {isAssigned && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        background: 'var(--accent)', color: '#fff',
                        padding: '2px 8px', borderRadius: 99,
                      }}>נדרש</span>
                    )}
                    {!isAssigned && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: 'var(--bg-elevated)', color: 'var(--text-3)',
                        padding: '2px 8px', borderRadius: 99,
                      }}>זמין</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {f.form_num}
                    {filled && ` · מולא ${subs.length}× — אחרון: ${
                      new Date(subs[0].submitted_at || subs[0].created_at).toLocaleString('he-IL', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    }`}
                  </div>
                </div>

                {/* Status pill */}
                {filled ? (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    background: STATUS_COLOR[subs[0].status] + '22',
                    color: STATUS_COLOR[subs[0].status],
                    padding: '4px 10px', borderRadius: 99,
                  }}>
                    <i className="ti ti-check" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> {STATUS_LABEL[subs[0].status] || subs[0].status}
                  </span>
                ) : (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    background: 'var(--warning)22', color: 'var(--warning)',
                    padding: '4px 10px', borderRadius: 99,
                  }}>
                    <i className="ti ti-hourglass" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> ממתין למילוי
                  </span>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => handleFill(f.id)}
                    title="פתח את הטופס למילוי"
                  >
                    <i className="ti ti-edit" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> מלא
                  </button>
                  {filled && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => navigate(`/forms/${f.id}/submissions`)}
                      title="ראה את כל ההגשות של הטופס"
                    >
                      <i className="ti ti-send" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הגשות
                    </button>
                  )}
                  {isAssigned && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger)' }}
                      onClick={() => handleDetach(f)}
                      disabled={busyId === f.id}
                      title="הסר את הטופס מהמשימה"
                      aria-label="הסר טופס"><i className="ti ti-trash" aria-hidden="true" /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
