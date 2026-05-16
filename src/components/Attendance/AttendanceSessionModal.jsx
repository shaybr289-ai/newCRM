import { useState, useEffect } from 'react';
import { useCreateAttendanceSession, useUpdateAttendanceSession } from '../../hooks/useAttendance';
import { useUsers } from '../../hooks/useUsers';
import { useShiftTemplates } from '../../hooks/useAttendance';

export default function AttendanceSessionModal({ session, onClose }) {
  const isEdit = !!session?.id;
  const createSession = useCreateAttendanceSession();
  const updateSession = useUpdateAttendanceSession();
  const { data: usersData } = useUsers({ limit: 200 });
  const { data: tmplData } = useShiftTemplates();
  const users = usersData?.data || [];
  const templates = tmplData?.data || [];

  const [form, setForm] = useState({
    userId: session?.user_id || '',
    clockInAt: session?.clock_in_at ? new Date(session.clock_in_at).toISOString().slice(0,16) : '',
    clockOutAt: session?.clock_out_at ? new Date(session.clock_out_at).toISOString().slice(0,16) : '',
    breakMinutes: session?.break_minutes ?? 0,
    manualReason: session?.manual_reason || '',
    shiftTemplateId: session?.shift_template_id || '',
    recordType: session?.record_type || 'work_day',
  });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isEdit) {
        await updateSession.mutateAsync({ id: session.id, ...form });
      } else {
        await createSession.mutateAsync(form);
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'שגיאה בשמירה');
    }
  };

  const loading = createSession.isPending || updateSession.isPending;

  return (
    <div className="att-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="att-modal">
        <h3>{isEdit ? 'עריכת דיווח נוכחות' : 'הוספת דיווח נוכחות'}</h3>
        <form onSubmit={handleSubmit}>
          {!isEdit && (
            <div className="att-form-row full">
              <label className="att-label">עובד *</label>
              <select className="att-input" value={form.userId} onChange={e => set('userId', e.target.value)} required>
                <option value="">בחר עובד...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>
          )}

          <div className="att-form-row">
            <div>
              <label className="att-label">שעת כניסה *</label>
              <input type="datetime-local" className="att-input" value={form.clockInAt}
                onChange={e => set('clockInAt', e.target.value)} required />
            </div>
            <div>
              <label className="att-label">שעת יציאה</label>
              <input type="datetime-local" className="att-input" value={form.clockOutAt}
                onChange={e => set('clockOutAt', e.target.value)} />
            </div>
          </div>

          <div className="att-form-row">
            <div>
              <label className="att-label">הפסקות (דקות)</label>
              <input type="number" min="0" className="att-input" value={form.breakMinutes}
                onChange={e => set('breakMinutes', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="att-label">סוג דיווח</label>
              <select className="att-input" value={form.recordType} onChange={e => set('recordType', e.target.value)}>
                <option value="work_day">יום עבודה</option>
                <option value="customer_visit">ביקור לקוח</option>
              </select>
            </div>
          </div>

          <div className="att-form-row">
            <div>
              <label className="att-label">תבנית משמרת</label>
              <select className="att-input" value={form.shiftTemplateId} onChange={e => set('shiftTemplateId', e.target.value)}>
                <option value="">ללא</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="att-form-row full">
            <label className="att-label">סיבת תיקון / הערה</label>
            <textarea className="att-input" rows={2} value={form.manualReason}
              onChange={e => set('manualReason', e.target.value)}
              placeholder="תיאור מדוע הוספה/תוקנה הרשומה ידנית..." />
          </div>

          {error && <p style={{ color: '#EF4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

          <div className="att-modal-footer">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}
