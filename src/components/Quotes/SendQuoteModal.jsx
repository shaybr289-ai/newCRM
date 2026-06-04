import { useState, useEffect } from 'react';
import { api, getAccessToken } from '../../api/client';
import { useSettings } from '../../hooks/useDataManagement';
import { buildPreviewHTML } from './QuotePreview';
import '../Customers/CustomerModal.css';

export default function SendQuoteModal({ form, items, customer, contact, autoConditions, vatRate, quoteTemplate, onClose, onSent }) {
  const { data: settings } = useSettings();

  const contactEmail = contact?.email || '';
  const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ');
  const customerName = customer?.company_name || '';
  const quoteName = form?.quote_name || '';
  const quoteNum = form?.quote_num || '';

  const [to, setTo] = useState(contactEmail);
  const [subject, setSubject] = useState(`הצעת מחיר — ${quoteName}`);
  const [body, setBody] = useState('');
  const [selectedTmpl, setSelectedTmpl] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingStep, setSendingStep] = useState('');
  const [result, setResult] = useState(null); // { ok, message }
  const [emailTemplates, setEmailTemplates] = useState([]);

  // Load email templates from settings
  useEffect(() => {
    if (settings?.email_templates_v1) {
      try { setEmailTemplates(JSON.parse(settings.email_templates_v1)); } catch {}
    }
  }, [settings]);

  // Check if sender email is configured (API key is set as env var on server)
  const senderEmail = (() => {
    try { return JSON.parse(settings?.email_config || '{}').senderEmail || ''; } catch { return ''; }
  })();

  // Apply template with placeholder replacement
  const applyTemplate = (tmplId) => {
    setSelectedTmpl(tmplId);
    if (!tmplId) { setBody(''); return; }
    const tmpl = emailTemplates.find(t => t.id === tmplId);
    if (!tmpl) return;
    const text = (tmpl.body || '')
      .replace(/\{שם_הצעה\}/g, quoteName)
      .replace(/\{מספר_הצעה\}/g, quoteNum)
      .replace(/\{שם_לקוח\}/g, customerName)
      .replace(/\{שם_איש_קשר\}/g, contactName)
      .replace(/\{מספר_תעודה\}/g, '')
      .replace(/\{מספר_הזמנה\}/g, '')
      .replace(/\{שם_דוח\}/g, '');
    setBody(text);
  };

  // Generate PDF and send email
  const handleSend = async () => {
    if (!to.trim()) { setResult({ ok: false, message: 'חסרה כתובת מייל נמען' }); return; }
    if (!senderEmail) { setResult({ ok: false, message: 'לא הוגדרה כתובת מייל שולח. הגדר בניהול נתונים → הגדרות' }); return; }

    setSending(true);
    setResult(null);

    try {
      // 1. Generate preview HTML (exclude body footer — will be rendered per-page by PDFShift)
      setSendingStep('מכין תצוגה מקדימה...');
      const html = buildPreviewHTML({ template: quoteTemplate, form, items, customer, autoConditions, vatRate, forPdf: true });

      // 2. Generate PDF on server (PDFShift) — pass footer text for page-level footer
      setSendingStep('יוצר קובץ PDF בשרת...');
      const footerText = quoteTemplate?.footer?.text || '';
      const pdfResp = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ html, filename: `${quoteName}.pdf`, footerText }),
      });
      if (!pdfResp.ok) {
        const err = await pdfResp.json().catch(() => ({}));
        throw new Error(err.error || 'שגיאה ביצירת PDF');
      }
      const pdfBlob = await pdfResp.blob();

      // 3. Convert blob to base64
      setSendingStep('מכין קובץ לשליחה...');
      const pdfBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });

      // 4. Build email HTML body
      const emailHtml = body
        ? `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;white-space:pre-wrap;">${body.replace(/\n/g, '<br>')}</div>`
        : `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;">מצורפת הצעת מחיר: ${quoteName}</div>`;

      // 5. Send via API (with timeout)
      setSendingStep('שולח מייל...');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('המייל לוקח זמן רב מדי — בדוק את הלוגים ב-Railway')), 60000));
      const resp = await Promise.race([
        api.post('/api/email/send', {
          to: to.trim(),
          subject,
          htmlBody: emailHtml,
          pdfBase64,
          fileName: `${quoteName}.pdf`,
        }),
        timeoutPromise,
      ]);

      if (resp.ok) {
        setResult({ ok: true, message: 'הצעת המחיר נשלחה בהצלחה!' });
        if (onSent) onSent();
      } else {
        setResult({ ok: false, message: resp.error || 'שגיאה בשליחה' });
      }
    } catch (err) {
      console.error('Send email error:', err);
      setResult({ ok: false, message: err.message || 'שגיאה בשליחת המייל' });
    } finally {
      setSending(false);
      setSendingStep('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>שליחת הצעת מחיר במייל</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {!senderEmail && (
            <div style={{ background: '#F59E0B15', border: '1px solid #F59E0B44', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
              לא הוגדרה כתובת מייל שולח. הגדר אותה ב<strong>ניהול נתונים → הגדרות → הגדרות מייל</strong>
            </div>
          )}

          {result && (
            <div style={{
              background: result.ok ? '#10B98115' : '#EF444415',
              border: `1px solid ${result.ok ? '#10B98144' : '#EF444444'}`,
              borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13,
              color: result.ok ? '#10B981' : '#EF4444', fontWeight: 600, textAlign: 'center',
            }}>
              {result.message}
            </div>
          )}

          <div className="form-grid">
            {/* To */}
            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>נמען (כתובת מייל)</label>
              <input type="email" value={to} onChange={e => setTo(e.target.value)} dir="ltr"
                placeholder="email@example.com" />
              {contactName && <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{contactName}</span>}
            </div>

            {/* Subject */}
            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>נושא המייל</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            {/* Template selector */}
            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>בחר תבנית טקסט</label>
              <select value={selectedTmpl} onChange={e => applyTemplate(e.target.value)}>
                <option value="">— טקסט חופשי —</option>
                {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Body */}
            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>גוף המייל</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
                placeholder="הקלד את תוכן המייל כאן..." style={{ lineHeight: 1.8 }} />
            </div>
          </div>

          {/* Attachment indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 12 }}>
            <i className="ti ti-paperclip" aria-hidden="true" style={{ color: 'var(--success)', fontSize: 16 }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              קובץ מצורף: <strong>{quoteName}.pdf</strong> (יופק אוטומטית מתבנית ההצעה)
            </span>
          </div>

          <div className="modal-footer" style={{ alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleSend}
              disabled={sending || !senderEmail || result?.ok}
              style={{ minWidth: 140 }}>
              {sending ? 'שולח...' : result?.ok ? 'נשלח!' : 'שלח הצעת מחיר'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              {result?.ok ? 'סגור' : 'ביטול'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
