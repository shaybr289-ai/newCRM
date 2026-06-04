import { useState } from 'react';
import './Platform.css';

export default function TenantForm({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'standard',
    adminUsername: '',
    adminPassword: '',
    adminEmail: '',
    adminFirstName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.adminUsername || !form.adminPassword) {
      setError('יש למלא את כל השדות המסומנים');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setError('ה-Slug יכול להכיל רק אותיות קטנות, מספרים ומקפים');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה ביצירת טנאנט');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="platform-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <form className="platform-modal" onSubmit={handleSubmit}>
        <h2 className="platform-modal-title">יצירת טנאנט חדש</h2>
        {error && <div className="platform-login-error">{error}</div>}

        <div className="platform-form-section">פרטי הטנאנט</div>
        <div className="platform-form-field">
          <label>שם הטנאנט *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="חברת ABC" />
        </div>
        <div className="platform-form-field">
          <label>Slug (מזהה ייחודי) *</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="abc-company" dir="ltr" />
        </div>
        <div className="platform-form-field">
          <label>תוכנית</label>
          <select value={form.plan} onChange={e => set('plan', e.target.value)}>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="platform-form-section">מנהל ראשי של הטנאנט</div>
        <div className="platform-form-field">
          <label>שם פרטי</label>
          <input value={form.adminFirstName} onChange={e => set('adminFirstName', e.target.value)} placeholder="ישראל" />
        </div>
        <div className="platform-form-field">
          <label>שם משתמש *</label>
          <input value={form.adminUsername} onChange={e => set('adminUsername', e.target.value)} placeholder="admin" dir="ltr" />
        </div>
        <div className="platform-form-field">
          <label>סיסמא *</label>
          <input type="password" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} placeholder="••••••••" dir="ltr" />
        </div>
        <div className="platform-form-field">
          <label>אימייל</label>
          <input type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} placeholder="admin@example.com" dir="ltr" />
        </div>

        <div className="platform-modal-actions">
          <button type="button" className="platform-btn" onClick={onClose}>ביטול</button>
          <button type="submit" className="platform-btn primary" disabled={loading}>
            {loading ? 'יוצר...' : 'צור טנאנט'}
          </button>
        </div>
      </form>
    </div>
  );
}
