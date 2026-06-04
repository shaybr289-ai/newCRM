import { useState, useEffect, useRef } from 'react';
import { useSettings, useSaveSetting, useCompanyInfo, useSaveCompanyInfo } from '../../hooks/useDataManagement';
import { api } from '../../api/client';
import useLangStore from '../../store/langStore';

export default function SettingsTab({ readOnly = false }) {
  const { data: settings } = useSettings();
  const { data: company } = useCompanyInfo();
  const saveSetting = useSaveSetting();
  const saveCompany = useSaveCompanyInfo();
  const { lang, setLang } = useLangStore();
  const [uiLang, setUiLang] = useState(lang);

  const [vatRate, setVatRate] = useState('');
  const [usdRate, setUsdRate] = useState('');
  const [eurRate, setEurRate] = useState('');
  const [gbpRate, setGbpRate] = useState('');
  const [fxSyncTime, setFxSyncTime] = useState('18:00');
  const [fxTimezone, setFxTimezone] = useState('Asia/Jerusalem');
  const [companyForm, setCompanyForm] = useState({});
  const [saved, setSaved] = useState('');
  const [refreshingFx, setRefreshingFx] = useState(false);

  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const DEFAULT_SCHEDULE = {
    weekStart: '0',
    businessDays: [0, 1, 2, 3, 4],
    hoursMode: 'global',
    globalHours: { from: '08:00', to: '17:00' },
    perDayHours: Object.fromEntries([0,1,2,3,4,5,6].map(d => [d, { from: '08:00', to: '17:00' }])),
  };
  const [workSchedule, setWorkSchedule] = useState(DEFAULT_SCHEDULE);
  const updWS = (k, v) => setWorkSchedule(p => ({ ...p, [k]: v }));

  // Email settings
  const [emailCfg, setEmailCfg] = useState({ senderEmail: '', senderName: '' });
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [editTmpl, setEditTmpl] = useState(null); // { name, body } or null

  useEffect(() => {
    if (settings) {
      try {
        const ws = JSON.parse(settings.work_schedule || '{}');
        setWorkSchedule(prev => ({
          ...DEFAULT_SCHEDULE,
          ...ws,
          perDayHours: { ...DEFAULT_SCHEDULE.perDayHours, ...(ws.perDayHours || {}) },
        }));
      } catch {}
      setVatRate(settings.vat_rate || '18');
      setUsdRate(parseFloat(settings.usd_rate || '3.70').toFixed(3));
      setEurRate(parseFloat(settings.eur_rate || '4.00').toFixed(3));
      setGbpRate(parseFloat(settings.gbp_rate || '4.70').toFixed(3));
      setFxSyncTime(settings.exchange_rate_sync_time || '18:00');
      setFxTimezone(settings.exchange_rate_timezone || 'Asia/Jerusalem');
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
    await saveSetting.mutateAsync({ key: 'exchange_rate_sync_time', value: fxSyncTime });
    await saveSetting.mutateAsync({ key: 'exchange_rate_timezone', value: fxTimezone });
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
    await saveSetting.mutateAsync({ key: 'work_schedule', value: JSON.stringify(workSchedule) });
    setSaved('פרטי חברה נשמרו');
    setTimeout(() => setSaved(''), 3000);
  };

  const toggleBusinessDay = (day) => {
    updWS('businessDays', workSchedule.businessDays.includes(day)
      ? workSchedule.businessDays.filter(d => d !== day)
      : [...workSchedule.businessDays, day].sort((a, b) => a - b));
  };

  const updDayHours = (day, field, val) =>
    setWorkSchedule(p => ({ ...p, perDayHours: { ...p.perDayHours, [day]: { ...p.perDayHours[day], [field]: val } } }));

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

  // Email template variable insertion
  const bodyRef = useRef(null);
  const TEMPLATE_VARS = [
    { group: 'כללי', items: [
      { label: 'שם לקוח',     key: '{שם_לקוח}' },
      { label: 'שם איש קשר', key: '{שם_איש_קשר}' },
    ]},
    { group: 'הצעת מחיר', items: [
      { label: 'שם הצעה',    key: '{שם_הצעה}' },
      { label: 'מספר הצעה',  key: '{מספר_הצעה}' },
    ]},
    { group: 'תעודת משלוח', items: [
      { label: 'מספר תעודה',  key: '{מספר_תעודה}' },
      { label: 'מספר הזמנה',  key: '{מספר_הזמנה}' },
    ]},
    { group: 'דוחות', items: [
      { label: 'שם דוח', key: '{שם_דוח}' },
    ]},
  ];

  const insertVar = (varKey) => {
    const el = bodyRef.current;
    const currentBody = editTmpl?.body || '';
    if (!el) {
      setEditTmpl(p => ({ ...p, body: currentBody + varKey }));
      return;
    }
    const start = el.selectionStart ?? currentBody.length;
    const end = el.selectionEnd ?? currentBody.length;
    const newBody = currentBody.slice(0, start) + varKey + currentBody.slice(end);
    setEditTmpl(p => ({ ...p, body: newBody }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleRefreshRates = async () => {
    setRefreshingFx(true);
    try {
      const data = await api.post('/api/settings/refresh-exchange-rates');
      setUsdRate(parseFloat(data.usd).toFixed(3));
      setEurRate(parseFloat(data.eur).toFixed(3));
      setGbpRate(parseFloat(data.gbp).toFixed(3));
      setSaved(`שערי חליפין עודכנו — $${parseFloat(data.usd).toFixed(3)} ‚ €${parseFloat(data.eur).toFixed(3)} ‚ £${parseFloat(data.gbp).toFixed(3)}`);
      setTimeout(() => setSaved(''), 5000);
    } catch (err) {
      setSaved('⚠️ שגיאה בטעינת שערי חליפין');
      setTimeout(() => setSaved(''), 4000);
    } finally {
      setRefreshingFx(false);
    }
  };

  return (
    <div>
      {saved && (
        <div style={{ background: '#10B98122', border: '1px solid #10B98144', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#10B981', fontWeight: 600, textAlign: 'center' }}>
          {saved}
        </div>
      )}

      {/* Language */}
      <div className="settings-section">
        <h3>שפת מערכת / System Language</h3>
        <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 14 }}>
          בחר את שפת הממשק. בשפה אנגלית התצוגה תהיה משמאל לימין.
        </p>
        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: readOnly ? 'default' : 'pointer', fontSize: 14 }}>
            <input
              type="radio"
              name="ui_lang"
              value="he"
              checked={uiLang === 'he'}
              onChange={() => setUiLang('he')}
              disabled={readOnly}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            עברית
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: readOnly ? 'default' : 'pointer', fontSize: 14 }}>
            <input
              type="radio"
              name="ui_lang"
              value="en"
              checked={uiLang === 'en'}
              onChange={() => setUiLang('en')}
              disabled={readOnly}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            English
          </label>
        </div>
        {!readOnly && (
          <button
            className="btn btn-primary"
            onClick={async () => {
              setLang(uiLang);
              await saveSetting.mutateAsync({ key: 'ui_language', value: uiLang });
              setSaved(uiLang === 'en' ? 'Language saved — English' : 'שפה נשמרה — עברית');
              setTimeout(() => setSaved(''), 3000);
            }}
            disabled={saveSetting.isPending}
          >
            {saveSetting.isPending ? '...' : uiLang === 'en' ? 'Save Language' : 'שמור שפה'}
          </button>
        )}
      </div>

      {/* VAT & Exchange */}
      <div className="settings-section">
        <h3>מע"מ ושערי חליפין</h3>
        <div className="settings-grid">
          <div className="form-field">
            <label>שיעור מע"מ (%)</label>
            <input type="number" value={vatRate} onChange={e => setVatRate(e.target.value)} dir="ltr" min="0" max="100" step="0.1" disabled={readOnly} />
          </div>
          <div className="form-field">
            <label>שער דולר (1$ = ₪)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={usdRate} onChange={e => setUsdRate(e.target.value)} dir="ltr" min="0" step="0.01" style={{ flex: 1 }} disabled={readOnly} />
              {!readOnly && <button type="button" onClick={handleRefreshRates} disabled={refreshingFx}
                title="רענן שערי חליפין" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 16 }}>
                {refreshingFx ? '⏳' : '🔄'}
              </button>}
            </div>
          </div>
          <div className="form-field">
            <label>שער יורו (1€ = ₪)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={eurRate} onChange={e => setEurRate(e.target.value)} dir="ltr" min="0" step="0.01" style={{ flex: 1 }} disabled={readOnly} />
              {!readOnly && <button type="button" onClick={handleRefreshRates} disabled={refreshingFx}
                title="רענן שערי חליפין" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 16 }}>
                {refreshingFx ? '⏳' : '🔄'}
              </button>}
            </div>
          </div>
          <div className="form-field">
            <label>שער ליש"ט (1£ = ₪)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={gbpRate} onChange={e => setGbpRate(e.target.value)} dir="ltr" min="0" step="0.01" style={{ flex: 1 }} disabled={readOnly} />
              {!readOnly && <button type="button" onClick={handleRefreshRates} disabled={refreshingFx}
                title="רענן שערי חליפין" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 16 }}>
                {refreshingFx ? '⏳' : '🔄'}
              </button>}
            </div>
          </div>
          <div className="form-field">
            <label>שעת עדכון אוטומטי</label>
            <input type="time" value={fxSyncTime} onChange={e => setFxSyncTime(e.target.value)} dir="ltr" disabled={readOnly} />
          </div>
          <div className="form-field">
            <label>אזור זמן</label>
            <select value={fxTimezone} onChange={e => setFxTimezone(e.target.value)} dir="ltr" disabled={readOnly}>
              <optgroup label="ישראל ואזור">
                <option value="Asia/Jerusalem">ישראל (Asia/Jerusalem)</option>
                <option value="Asia/Beirut">לבנון / קפריסין (Asia/Beirut)</option>
                <option value="Asia/Amman">ירדן (Asia/Amman)</option>
                <option value="Asia/Dubai">איחוד האמירויות (Asia/Dubai)</option>
                <option value="Asia/Riyadh">ערב הסעודית (Asia/Riyadh)</option>
                <option value="Africa/Cairo">מצרים (Africa/Cairo)</option>
              </optgroup>
              <optgroup label="אירופה">
                <option value="Europe/London">בריטניה (Europe/London)</option>
                <option value="Europe/Paris">צרפת / גרמניה (Europe/Paris)</option>
                <option value="Europe/Rome">איטליה (Europe/Rome)</option>
                <option value="Europe/Moscow">רוסיה — מוסקבה (Europe/Moscow)</option>
              </optgroup>
              <optgroup label="אמריקה">
                <option value="America/New_York">ארה"ב — מזרח (America/New_York)</option>
                <option value="America/Chicago">ארה"ב — מרכז (America/Chicago)</option>
                <option value="America/Denver">ארה"ב — הרים (America/Denver)</option>
                <option value="America/Los_Angeles">ארה"ב — מערב (America/Los_Angeles)</option>
                <option value="America/Sao_Paulo">ברזיל (America/Sao_Paulo)</option>
              </optgroup>
              <optgroup label="אסיה-פסיפיק">
                <option value="Asia/Kolkata">הודו (Asia/Kolkata)</option>
                <option value="Asia/Shanghai">סין (Asia/Shanghai)</option>
                <option value="Asia/Tokyo">יפן (Asia/Tokyo)</option>
                <option value="Australia/Sydney">אוסטרליה — סידני (Australia/Sydney)</option>
              </optgroup>
            </select>
          </div>
        </div>
        {!readOnly && (
          <button className="btn btn-primary" onClick={handleSaveSettings} style={{ marginTop: 12 }}
            disabled={saveSetting.isPending}>
            {saveSetting.isPending ? 'שומר...' : 'שמור הגדרות'}
          </button>
        )}
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
            {!readOnly && (
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
            )}
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
                style={{ width: 18, height: 18, accentColor: 'var(--brand)', cursor: readOnly ? 'default' : 'pointer' }}
                disabled={readOnly}
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
            <input value={companyForm.name || ''} onChange={e => updC('name', e.target.value)} disabled={readOnly} />
          </div>
          <div className="form-field">
            <label>ח.פ / ע.מ</label>
            <input value={companyForm.tax_id || ''} onChange={e => updC('tax_id', e.target.value)} dir="ltr" disabled={readOnly} />
          </div>
          <div className="form-field">
            <label>טלפון</label>
            <input value={companyForm.phone || ''} onChange={e => updC('phone', e.target.value)} dir="ltr" type="tel" disabled={readOnly} />
          </div>
          <div className="form-field">
            <label>אי-מייל</label>
            <input value={companyForm.email || ''} onChange={e => updC('email', e.target.value)} dir="ltr" type="email" disabled={readOnly} />
          </div>
          <div className="form-field">
            <label>אתר אינטרנט</label>
            <input value={companyForm.website || ''} onChange={e => updC('website', e.target.value)} dir="ltr" disabled={readOnly} />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>כתובת</label>
            <input value={companyForm.address || ''} onChange={e => updC('address', e.target.value)} disabled={readOnly} />
          </div>
        </div>

        {/* ── Work Schedule ─────────────────────────────────────────────────── */}
        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--text-1)' }}>לוח זמנים עסקי</div>

          {/* Week start */}
          <div className="form-field" style={{ maxWidth: 220, marginBottom: 16 }}>
            <label>השבוע מתחיל ב</label>
            <select value={workSchedule.weekStart} onChange={e => updWS('weekStart', e.target.value)} disabled={readOnly}>
              {DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
            </select>
          </div>

          {/* Days + Hours table */}
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>ימי עסקים ושעות עבודה</div>

          {/* Apply-to-all template row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#EEF6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, marginBottom: 8 }}>
            <i className="ti ti-copy" style={{ color: '#2563EB', fontSize: 15, flexShrink: 0 }} aria-hidden="true" />
            <span style={{ fontSize: 12, color: '#1E40AF', fontWeight: 600, minWidth: 100 }}>החל לכל הימים:</span>
            <input type="time" value={workSchedule.globalHours.from} dir="ltr"
              onChange={e => updWS('globalHours', { ...workSchedule.globalHours, from: e.target.value })}
              style={{ width: 100, fontSize: 12, padding: '4px 8px' }} disabled={readOnly} />
            <span style={{ fontSize: 12, color: '#1E40AF' }}>עד</span>
            <input type="time" value={workSchedule.globalHours.to} dir="ltr"
              onChange={e => updWS('globalHours', { ...workSchedule.globalHours, to: e.target.value })}
              style={{ width: 100, fontSize: 12, padding: '4px 8px' }} disabled={readOnly} />
            {!readOnly && (
              <button type="button" onClick={() => {
                const updated = {};
                [0,1,2,3,4,5,6].forEach(d => { updated[d] = { ...workSchedule.globalHours }; });
                setWorkSchedule(p => ({ ...p, perDayHours: updated }));
              }} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#2563EB', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}>
                החל לכל הימים
              </button>
            )}
          </div>

          {/* Per-day rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 80px 1fr 1fr', gap: 8, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>
              <span />
              <span>יום</span>
              <span>מ:</span>
              <span>עד:</span>
            </div>
            {DAYS.map((dayName, i) => {
              const active = workSchedule.businessDays.includes(i);
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '28px 80px 1fr 1fr', gap: 8,
                  alignItems: 'center', padding: '6px 12px',
                  background: active ? 'var(--bg-card)' : 'transparent',
                  border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
                  borderRadius: 8, opacity: active ? 1 : 0.45,
                  transition: 'all .15s',
                }}>
                  <input type="checkbox" checked={active} onChange={() => toggleBusinessDay(i)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: readOnly ? 'default' : 'pointer' }} disabled={readOnly} />
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {dayName}
                  </span>
                  <input type="time" value={workSchedule.perDayHours[i]?.from || '08:00'} dir="ltr"
                    disabled={readOnly || !active}
                    onChange={e => updDayHours(i, 'from', e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px', opacity: active ? 1 : 0.4 }} />
                  <input type="time" value={workSchedule.perDayHours[i]?.to || '17:00'} dir="ltr"
                    disabled={readOnly || !active}
                    onChange={e => updDayHours(i, 'to', e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px', opacity: active ? 1 : 0.4 }} />
                </div>
              );
            })}
          </div>
        </div>

        {!readOnly && (
          <button className="btn btn-primary" onClick={handleSaveCompany} style={{ marginTop: 12 }}
            disabled={saveCompany.isPending}>
            {saveCompany.isPending ? 'שומר...' : 'שמור פרטי חברה'}
          </button>
        )}
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
              onChange={e => setEmailCfg(p => ({ ...p, senderEmail: e.target.value }))} dir="ltr" placeholder="האימייל שרשמת לברבו" disabled={readOnly} />
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>חייב להיות המייל שרשמת ל-Brevo</span>
          </div>
          <div className="form-field">
            <label>שם השולח (יוצג בתיבת הדואר של הנמען)</label>
            <input value={emailCfg.senderName}
              onChange={e => setEmailCfg(p => ({ ...p, senderName: e.target.value }))} placeholder="שם החברה / שם פרטי..." disabled={readOnly} />
          </div>
        </div>
        {!readOnly && (
          <button className="btn btn-primary" onClick={handleSaveEmailCfg} style={{ marginTop: 12 }}
            disabled={saveSetting.isPending}>
            שמור הגדרות מייל
          </button>
        )}
      </div>

      {/* Email Templates */}
      <div className="settings-section">
        <h3>תבניות טקסט למייל</h3>
        <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 10 }}>
          צור תבניות טקסט שישמשו לגוף המייל בעת שליחת מסמכים. השתמש במשתנים כדי שהמידע ימולא אוטומטית בעת שליחה.
        </p>
        {/* Variable reference */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {TEMPLATE_VARS.flatMap(g => g.items).map(v => (
            <span key={v.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, fontSize: 11, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <span style={{ fontWeight: 600 }}>{v.label}</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{v.key}</span>
            </span>
          ))}
        </div>

        {/* Template list */}
        {emailTemplates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {emailTemplates.map(t => (
              <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => setEditTmpl({ ...t })}>ערוך</button>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)' }}
                        onClick={() => deleteTemplate(t.id)}>מחק</button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{t.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit template */}
        {editTmpl && !readOnly ? (
          <div style={{ border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: 16, background: 'var(--accent-light)' }}>
            <div className="form-field" style={{ marginBottom: 10 }}>
              <label>שם התבנית</label>
              <input value={editTmpl.name || ''} onChange={e => setEditTmpl(p => ({ ...p, name: e.target.value }))} placeholder="לדוגמה: תבנית ראשונית" />
            </div>

            {/* Variable chips */}
            <div style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>לחץ על משתנה להוספה בגוף המייל:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TEMPLATE_VARS.map(group => (
                  <div key={group.group} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, minWidth: 72 }}>{group.group}:</span>
                    {group.items.map(v => (
                      <button key={v.key} type="button" onClick={() => insertVar(v.key)}
                        style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent)',
                          transition: 'background .12s' }}
                        title={v.key}>
                        {v.label} <span style={{ opacity: 0.55, fontSize: 10 }}>{v.key}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: 10 }}>
              <label>תוכן המייל</label>
              <textarea ref={bodyRef} value={editTmpl.body || ''} onChange={e => setEditTmpl(p => ({ ...p, body: e.target.value }))} rows={5}
                placeholder="שלום {שם_איש_קשר},&#10;&#10;מצורפת הצעת מחיר &quot;{שם_הצעה}&quot; מספר {מספר_הצעה}.&#10;&#10;בברכה,&#10;צוות החברה" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={addOrUpdateTemplate}>{editTmpl.id ? 'עדכן תבנית' : 'הוסף תבנית'}</button>
              <button className="btn btn-ghost" onClick={() => setEditTmpl(null)}>ביטול</button>
            </div>
          </div>
        ) : !readOnly ? (
          <button className="btn btn-secondary" onClick={() => setEditTmpl({ name: '', body: '' })}>
            + תבנית חדשה
          </button>
        ) : null}
      </div>
    </div>
  );
}
