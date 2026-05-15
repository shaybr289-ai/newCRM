import { useState, useEffect } from 'react';
import { useSettings, useSaveSetting, useCompanyInfo, useSaveCompanyInfo } from '../../hooks/useDataManagement';

export default function SettingsTab() {
  const { data: settings } = useSettings();
  const { data: company } = useCompanyInfo();
  const saveSetting = useSaveSetting();
  const saveCompany = useSaveCompanyInfo();

  const [vatRate, setVatRate] = useState('');
  const [usdRate, setUsdRate] = useState('');
  const [eurRate, setEurRate] = useState('');
  const [gbpRate, setGbpRate] = useState('');
  const [companyForm, setCompanyForm] = useState({});
  const [saved, setSaved] = useState('');
  const [refreshingUsd, setRefreshingUsd] = useState(false);

  // Email settings
  const [emailCfg, setEmailCfg] = useState({ senderEmail: '', senderName: '' });
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [editTmpl, setEditTmpl] = useState(null); // { name, body } or null

  useEffect(() => {
    if (settings) {
      setVatRate(settings.vat_rate || '18');
      setUsdRate(settings.usd_rate || '3.7');
      setEurRate(settings.eur_rate || '4.0');
      setGbpRate(settings.gbp_rate || '4.7');
      // Load email config
      try { const ec = JSON.parse(settings.email_config || '{}'); setEmailCfg({ senderEmail: ec.senderEmail || '', senderName: ec.senderName || '' }); } catch {}
      // Load email templates
      try { setEmailTemplates(JSON.parse(settings.email_templates_v1 || '[]')); } catch {}
    }
  }, [settings]);

  useEffect(() => {
    if (company) setCompanyForm({ ...company });
  }, [company]);

  const handleSaveSettings = async () => {
    await saveSetting.mutateAsync({ key: 'vat_rate', value: vatRate });
    await saveSetting.mutateAsync({ key: 'usd_rate', value: usdRate });
    await saveSetting.mutateAsync({ key: 'eur_rate', value: eurRate });
    await saveSetting.mutateAsync({ key: 'gbp_rate', value: gbpRate });
    setSaved('הגדרות נשמרו');
    setTimeout(() => setSaved(''), 3000);
  };

  const handleSaveCompany = async () => {
    await saveCompany.mutateAsync({
      name: companyForm.name || '',
      taxId: companyForm.tax_id || '',
      phone: companyForm.phone || '',
      email: companyForm.email || '',
      website: companyForm.website || '',
      address: companyForm.address || '',
      logo: companyForm.logo || '',
      showLogoInApp: !!companyForm.show_logo_in_app,
    });
    setSaved('פרטי חברה נשמרו');
    setTimeout(() => setSaved(''), 3000);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert('קובץ גדול מדי. מקסימום 1MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setCompanyForm(p => ({ ...p, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => setCompanyForm(p => ({ ...p, logo: '' }));

  const handleSaveEmailCfg = async () => {
    await saveSetting.mutateAsync({ key: 'email_config', value: JSON.stringify(emailCfg) });
    setSaved('הגדרות מייל נשמרו');
    setTimeout(() => setSaved(''), 3000);
  };

  const handleSaveTemplates = async (updated) => {
    const list = updated || emailTemplates;
    await saveSetting.mutateAsync({ key: 'email_templates_v1', value: JSON.stringify(list) });
    setEmailTemplates(list);
    setSaved('תבניות מייל נשמרו');
    setTimeout(() => setSaved(''), 3000);
  };

  const addOrUpdateTemplate = () => {
    if (!editTmpl?.name?.trim()) return;
    let updated;
    if (editTmpl.id) {
      updated = emailTemplates.map(t => t.id === editTmpl.id ? editTmpl : t);
    } else {
      updated = [...emailTemplates, { ...editTmpl, id: 'et' + Date.now() }];
    }
    handleSaveTemplates(updated);
    setEditTmpl(null);
  };

  const deleteTemplate = (id) => {
    const updated = emailTemplates.filter(t => t.id !== id);
    handleSaveTemplates(updated);
  };

  const updC = (k, v) => setCompanyForm(p => ({ ...p, [k]: v }));

  const handleRefreshUsdRate = async () => {
    setRefreshingUsd(true);
    try {
      const res = await fetch('/api/settings/refresh-usd-rate', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה');
      setUsdRate(String(data.rate));
      setSaved(`שער דולר עודכן: ${data.rate} ₪`);
      setTimeout(() => setSaved(''), 4000);
    } catch (err) {
      setSaved('שגיאה בטעינת שער מבנק ישראל');
      setTimeout(() => setSaved(''), 4000);
    } finally {
      setRefreshingUsd(false);
    }
  };

  return (
    <div>
      {saved && (
        <div style={{ background: '#10B98122', border: '1px solid #10B98144', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#10B981', fontWeight: 600, textAlign: 'center' }}>
          {saved}
        </div>
      )}

      {/* VAT & Exchange */}
      <div className="settings-section">
        <h3>מע"מ ושערי חליפין</h3>
        <div className="settings-grid">
          <div className="form-field">
            <label>שיעור מע"מ (%)</label>
            <input type="number" value={vatRate} onChange={e => setVatRate(e.target.value)} dir="ltr" min="0" max="100" step="0.1" />
          </div>
          <div className="form-field">
            <label>שער דולר (1$ = ₪)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={usdRate} onChange={e => setUsdRate(e.target.value)} dir="ltr" min="0" step="0.01" style={{ flex: 1 }} />
              <button type="button" onClick={handleRefreshUsdRate} disabled={refreshingUsd}
                title="רענן שער מבנק ישראל"
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 16, whiteSpace: 'nowrap' }}>
                {refreshingUsd ? '⏳' : '🔄'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>מתעדכן אוטומטית בכל יום ב-18:00</div>
          </div>
          <div className="form-field">
            <label>שער יורו (1€ = ₪)</label>
            <input type="number" value={eurRate} onChange={e => setEurRate(e.target.value)} dir="ltr" min="0" step="0.01" />
          </div>
          <div className="form-field">
            <label>שער ליש"ט (1£ = ₪)</label>
            <input type="number" value={gbpRate} onChange={e => setGbpRate(e.target.value)} dir="ltr" min="0" step="0.01" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveSettings} style={{ marginTop: 12 }}
          disabled={saveSetting.isPending}>
          {saveSetting.isPending ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </div>

      {/* Company Info */}
      <div className="settings-section">
        <h3>פרטי החברה</h3>
        <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 12 }}>פרטים אלו יופיעו בהצעות מחיר, במסמכים ובמסך הראשי של המערכת</p>

        {/* Logo upload */}
        <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10 }}>לוגו החברה</label>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {companyForm.logo ? (
              <div style={{ width: 140, height: 100, background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src={companyForm.logo} alt="לוגו" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: 140, height: 100, background: '#fff', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                ללא לוגו
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="btn btn-secondary" style={{ fontSize: 12, cursor: 'pointer' }}>
                {companyForm.logo ? 'החלף לוגו' : 'העלה לוגו'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </label>
              {companyForm.logo && (
                <button type="button" className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleLogoRemove}>
                  הסר לוגו
                </button>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>PNG / JPG / SVG — עד 1MB</span>
            </div>
          </div>

          {/* Show logo in mobile app toggle */}
          {companyForm.logo && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginTop: 14, cursor: 'pointer',
              padding: '10px 14px',
              background: companyForm.show_logo_in_app ? 'rgba(10,94,154,0.07)' : 'var(--bg-page)',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${companyForm.show_logo_in_app ? 'rgba(10,94,154,0.3)' : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}>
              <input
                type="checkbox"
                checked={!!companyForm.show_logo_in_app}
                onChange={e => updC('show_logo_in_app', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--brand)', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>הצגת לוגו באפליקציה</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  הלוגו יוצג בראש מסך הבית של אפליקציית המובייל
                </div>
              </div>
            </label>
          )}
        </div>

        <div className="settings-grid">
          <div className="form-field">
            <label>שם החברה</label>
            <input value={companyForm.name || ''} onChange={e => updC('name', e.target.value)} />
          </div>
          <div className="form-field">
            <label>ח.פ / ע.מ</label>
            <input value={companyForm.tax_id || ''} onChange={e => updC('tax_id', e.target.value)} dir="ltr" />
          </div>
          <div className="form-field">
            <label>טלפון</label>
            <input value={companyForm.phone || ''} onChange={e => updC('phone', e.target.value)} dir="ltr" type="tel" />
          </div>
          <div className="form-field">
            <label>אי-מייל</label>
            <input value={companyForm.email || ''} onChange={e => updC('email', e.target.value)} dir="ltr" type="email" />
          </div>
          <div className="form-field">
            <label>אתר אינטרנט</label>
            <input value={companyForm.website || ''} onChange={e => updC('website', e.target.value)} dir="ltr" />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>כתובת</label>
            <input value={companyForm.address || ''} onChange={e => updC('address', e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveCompany} style={{ marginTop: 12 }}
          disabled={saveCompany.isPending}>
          {saveCompany.isPending ? 'שומר...' : 'שמור פרטי חברה'}
        </button>
      </div>

      {/* Email Settings */}
      <div className="settings-section">
        <h3>הגדרות מייל (שליחת הצעות מחיר דרך Brevo)</h3>
        <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 12 }}>
          המיילים נשלחים דרך <a href="https://www.brevo.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Brevo</a> (חינם עד 300 מיילים ליום).
          <br />מפתח ה-API מוגדר כמשתנה סביבה בשרת (BREVO_API_KEY).
        </p>
        <div className="settings-grid">
          <div className="form-field">
            <label>כתובת מייל שולח</label>
            <input type="email" value={emailCfg.senderEmail || ''}
              onChange={e => setEmailCfg(p => ({ ...p, senderEmail: e.target.value }))} dir="ltr" placeholder="האימייל שרשמת לברבו" />
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>חייב להיות המייל שרשמת ל-Brevo</span>
          </div>
          <div className="form-field">
            <label>שם השולח (יוצג בתיבת הדואר של הנמען)</label>
            <input value={emailCfg.senderName}
              onChange={e => setEmailCfg(p => ({ ...p, senderName: e.target.value }))} placeholder="שם החברה / שם פרטי..." />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveEmailCfg} style={{ marginTop: 12 }}
          disabled={saveSetting.isPending}>
          שמור הגדרות מייל
        </button>
      </div>

      {/* Email Templates */}
      <div className="settings-section">
        <h3>תבניות טקסט למייל</h3>
        <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 12 }}>
          צור תבניות טקסט שישמשו לגוף המייל בעת שליחת הצעת מחיר. ניתן להשתמש ב-{'{שם_הצעה}'}, {'{שם_לקוח}'}, {'{שם_איש_קשר}'} כמשתנים
        </p>

        {/* Template list */}
        {emailTemplates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {emailTemplates.map(t => (
              <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => setEditTmpl({ ...t })}>ערוך</button>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)' }}
                      onClick={() => deleteTemplate(t.id)}>מחק</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{t.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit template */}
        {editTmpl ? (
          <div style={{ border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: 16, background: 'var(--accent-light)' }}>
            <div className="form-field" style={{ marginBottom: 10 }}>
              <label>שם התבנית</label>
              <input value={editTmpl.name || ''} onChange={e => setEditTmpl(p => ({ ...p, name: e.target.value }))} placeholder="לדוגמה: תבנית ראשונית" />
            </div>
            <div className="form-field" style={{ marginBottom: 10 }}>
              <label>תוכן המייל</label>
              <textarea value={editTmpl.body || ''} onChange={e => setEditTmpl(p => ({ ...p, body: e.target.value }))} rows={5}
                placeholder="שלום {שם_איש_קשר},&#10;&#10;מצורפת הצעת מחיר &quot;{שם_הצעה}&quot;.&#10;&#10;בברכה,&#10;צוות החברה" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={addOrUpdateTemplate}>{editTmpl.id ? 'עדכן תבנית' : 'הוסף תבנית'}</button>
              <button className="btn btn-ghost" onClick={() => setEditTmpl(null)}>ביטול</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={() => setEditTmpl({ name: '', body: '' })}>
            + תבנית חדשה
          </button>
        )}
      </div>
    </div>
  );
}
