import { useState } from 'react';
import { CLIENT_TYPES, CURRENCIES, PAYMENT_TERMS, STATUS_OPTIONS, EMPTY_CUSTOMER } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import OwnerSelect from '../Layout/OwnerSelect';
import useAuthStore from '../../store/authStore';
import '../Layout/EditorPage.css';
import '../Tasks/TasksDashboard.css';
import './CustomerModal.css';

export default function CustomerModal({ customer, onSave, onClose, loading, backLabel }) {
  const currentUser = useAuthStore((s) => s.user);
  // When creating (no existing customer), pre-fill owner_id with current user
  const initial = customer || { ...EMPTY_CUSTOMER, owner_id: currentUser?.id || '' };
  const [form, setForm] = useState(initial);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!form.company_name?.trim()) { alert('שם חברה הוא שדה חובה'); return; }
    onSave(form);
  };

  const isEdit = !!customer?.id;

  return (
    <div className="animate-in">
      <div className="tdb-topbar" style={{ marginBottom: 16 }}>
        <div className="tdb-topbar-left">
          <button className="tdb-calendar-btn" onClick={onClose}>← {backLabel || 'חזרה ללקוחות'}</button>
          <span className="tdb-topbar-icon"><i className="ti ti-building" aria-hidden="true" /></span>
          <h1 className="tdb-topbar-title">{isEdit ? `עריכת לקוח — ${form.company_name || ''}` : 'לקוח חדש'}</h1>
        </div>
        <div className="tdb-topbar-right">
          <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="form-section-title">פרטי חברה</h3>
        <div className="form-grid">
          <div className="form-field"><label>שם חברה *</label><input value={form.company_name || ''} onChange={e => upd('company_name', e.target.value)} autoFocus /></div>
          <div className="form-field"><label>סוג לקוח</label>
            <select value={form.client_type || 'ltd'} onChange={e => upd('client_type', e.target.value)}>
              {CLIENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field"><label>ח.פ / ע.מ</label><input value={form.reg_num || ''} onChange={e => upd('reg_num', e.target.value)} dir="ltr" /></div>
          <div className="form-field"><label>מספר לקוח</label><input value={form.cust_num || ''} onChange={e => upd('cust_num', e.target.value)} dir="ltr" /></div>
        </div>

        <h3 className="form-section-title">פרטי קשר</h3>
        <div className="form-grid">
          <div className="form-field"><label>טלפון</label><input value={form.phone || ''} onChange={e => upd('phone', e.target.value)} dir="ltr" type="tel" /></div>
          <div className="form-field"><label>נייד</label><input value={form.mobile || ''} onChange={e => upd('mobile', e.target.value)} dir="ltr" type="tel" /></div>
          <div className="form-field"><label>אי-מייל</label><input value={form.email || ''} onChange={e => upd('email', e.target.value)} dir="ltr" type="email" /></div>
          <div className="form-field"><label>אתר אינטרנט</label><input value={form.website || ''} onChange={e => upd('website', e.target.value)} dir="ltr" /></div>
        </div>

        <h3 className="form-section-title">כתובת</h3>
        <div className="form-grid">
          <div className="form-field"><label>רחוב</label><input value={form.street || ''} onChange={e => upd('street', e.target.value)} /></div>
          <div className="form-field"><label>עיר</label><input value={form.city || ''} onChange={e => upd('city', e.target.value)} /></div>
          <div className="form-field"><label>מיקוד</label><input value={form.zip || ''} onChange={e => upd('zip', e.target.value)} dir="ltr" /></div>
          <div className="form-field"><label>מדינה</label><input value={form.country || 'ישראל'} onChange={e => upd('country', e.target.value)} /></div>
        </div>

        <h3 className="form-section-title">תנאים מסחריים</h3>
        <div className="form-grid">
          <div className="form-field"><label>תנאי תשלום</label>
            <select value={form.payment_terms || 'net30'} onChange={e => upd('payment_terms', e.target.value)}>
              {PAYMENT_TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field"><label>מטבע</label>
            <select value={form.currency || 'ILS'} onChange={e => upd('currency', e.target.value)}>
              {CURRENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field"><label>מסגרת אשראי</label><input value={form.credit_limit || ''} onChange={e => upd('credit_limit', e.target.value)} type="number" dir="ltr" /></div>
          <div className="form-field"><label>סטטוס</label>
            <select value={form.status || 'active'} onChange={e => upd('status', e.target.value)}>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <OwnerSelect value={form.owner_id} onChange={v => upd('owner_id', v)} label="בעלי רשומה לקוח" />
        </div>

        <div className="form-field" style={{ marginTop: 12 }}><label>הערות</label><textarea value={form.notes || ''} onChange={e => upd('notes', e.target.value)} rows={3} /></div>
      </div>
    </div>
  );
}
