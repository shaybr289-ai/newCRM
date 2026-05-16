import { useState } from 'react';
import { useShiftTemplates, useCreateShiftTemplate, useUpdateShiftTemplate, useDeleteShiftTemplate } from '../../hooks/useAttendance';

const EMPTY = { name: '', start_time: '08:00', end_time: '17:00', break_minutes: 30, late_tolerance_min: 10, early_dep_tolerance_min: 10 };

export default function ShiftTemplatesAdmin() {
  const { data, isLoading } = useShiftTemplates();
  const create = useCreateShiftTemplate();
  const update = useUpdateShiftTemplate();
  const remove = useDeleteShiftTemplate();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const templates = data?.data || [];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing('new'); setForm(EMPTY); setError(''); };
  const openEdit = (t) => { setEditing(t.id); setForm({ name: t.name, start_time: t.start_time, end_time: t.end_time, break_minutes: t.break_minutes, late_tolerance_min: t.late_tolerance_min, early_dep_tolerance_min: t.early_dep_tolerance_min }); setError(''); };
  const cancel = () => { setEditing(null); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing === 'new') await create.mutateAsync(form);
      else await update.mutateAsync({ id: editing, ...form });
      cancel();
    } catch (err) { setError(err?.message || 'שגיאה'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('למחוק תבנית זו?')) return;
    try { await remove.mutateAsync(id); } catch {}
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="att-section-title" style={{ margin: 0 }}>תבניות משמרת</p>
        <button className="btn btn-primary" onClick={openNew}>+ הוסף תבנית</button>
      </div>

      {editing && (
        <div className="att-table-wrap" style={{ padding: 20, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 15 }}>{editing === 'new' ? 'תבנית חדשה' : 'עריכת תבנית'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="att-form-row">
              <div className="att-form-row full">
                <label className="att-label">שם התבנית *</label>
                <input className="att-input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder='למשל "משמרת בוקר"' />
              </div>
            </div>
            <div className="att-form-row">
              <div>
                <label className="att-label">שעת התחלה</label>
                <input type="time" className="att-input" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
              </div>
              <div>
                <label className="att-label">שעת סיום</label>
                <input type="time" className="att-input" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>
            <div className="att-form-row">
              <div>
                <label className="att-label">הפסקה (דקות)</label>
                <input type="number" min="0" className="att-input" value={form.break_minutes} onChange={e => set('break_minutes', +e.target.value)} />
              </div>
              <div>
                <label className="att-label">סובלנות איחור (דקות)</label>
                <input type="number" min="0" className="att-input" value={form.late_tolerance_min} onChange={e => set('late_tolerance_min', +e.target.value)} />
              </div>
            </div>
            {error && <p style={{ color: '#EF4444', fontSize: 13 }}>{error}</p>}
            <div className="att-modal-footer">
              <button type="submit" className="btn btn-primary" disabled={create.isPending || update.isPending}>שמור</button>
              <button type="button" className="btn btn-secondary" onClick={cancel}>ביטול</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <p style={{ color: 'var(--text-2)' }}>טוען...</p> : (
        <div className="att-table-wrap">
          <table className="att-table">
            <thead>
              <tr><th>שם</th><th>כניסה</th><th>יציאה</th><th>הפסקה</th><th>סובלנות איחור</th><th></th></tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-2)' }}>אין תבניות</td></tr>
              )}
              {templates.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.start_time}</td>
                  <td>{t.end_time}</td>
                  <td>{t.break_minutes} ד'</td>
                  <td>{t.late_tolerance_min} ד'</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => openEdit(t)}>עריכה</button>
                    <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleDelete(t.id)}>מחק</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
