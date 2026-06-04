import { useState, useEffect } from 'react';
import { api, getAccessToken } from '../../api/client';
import { useSettings, useCompanyInfo } from '../../hooks/useDataManagement';
import { buildDeliveryNoteHTML } from './DeliveryNotePreview';
import { useUpdateDeliveryNote } from '../../hooks/useDeliveryNotes';
import '../Customers/CustomerModal.css';

export default function SendDeliveryNoteModal({ note, items, customer, contact, order, onClose, onStatusChange }) {
  const updateMut = useUpdateDeliveryNote();
  const { data: settings } = useSettings();
  const { data: companyInfo } = useCompanyInfo();

  const contactEmail = contact?.email || '';
  const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ');
  const customerName = customer?.company_name || '';
  const isReturn = note?.note_type === 'return';
  const title = isReturn ? 'תעודת החזרה' : 'תעודת משלוח';
  const fileName = `${title}-${note?.note_num || 'DN'}`;

  const [to, setTo] = useState(contactEmail);
  const [subject, setSubject] = useState(`${title} — ${note?.note_num || ''}`);
  const [body, setBody] = useState('');
  const [selectedTmpl, setSelectedTmpl] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingStep, setSendingStep] = useState('');
  const [result, setResult] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);

  useEffect(() => {
    if (settings?.email_templates_v1) {
      try { setEmailTemplates(JSON.parse(settings.email_templates_v1)); } catch {}
    }
  }, [settings]);

  const senderEmail = (() => {
    try { return JSON.parse(settings?.email_config || '{}').senderEmail || ''; } catch { return ''; }
  })();

  const applyTemplate = (tmplId) => {
    setSelectedTmpl(tmplId);
    if (!tmplId) { setBody(''); return; }
    const tmpl = emailTemplates.find(t => t.id === tmplId);
    if (!tmpl) return;
    const text = (tmpl.body || '')
      .replace(/\{שם_תעודה\}/g, note?.note_num || '')
      .replace(/\{מספר_תעודה\}/g, note?.note_num || '')
      .replace(/\{מספר_הזמנה\}/g, order?.order_num || '')
      .replace(/\{שם_לקוח\}/g, customerName)
      .replace(/\{שם_איש_קשר\}/g, contactName)
      .replace(/\{שם_הצעה\}/g, '')
      .replace(/\{מספר_הצעה\}/g, '')
      .replace(/\{שם_דוח\}/g, '');
    setBody(text);
  };

  const handleSend = async () => {
    if (!to.trim()) { setResult({ ok: false, message: 'חסרה כתובת מייל נמען' }); return; }
    if (!senderEmail) { setResult({ ok: false, message: 'לא הוגדרה כתובת מייל שולח. הגדר בניהול נתונים → הגדרות' }); return; }

    setSending(true);
    setResult(null);

    try {
      setSendingStep('מכין תצוגה מקדימה...');
      const html = buildDeliveryNoteHTML({ note, items, customer, contact, order, companyInfo, forPdf: true });

      setSendingStep('יוצר קובץ PDF בשרת...');
      const pdfResp = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ html, filename: `${fileName}.pdf` }),
      });
      if (!pdfResp.ok) {
        const err = await pdfResp.json().catch(() => ({}));
        throw new Error(err.error || 'שגיאה ביצירת PDF');
      }
      const pdfBlob = await pdfResp.blob();

      setSendingStep('מכין קובץ לשליחה...');
      const pdfBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });

      const emailHtml = body
        ? `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;white-space:pre-wrap;">${body.replace(/\n/g, '<br>')}</div>`
        : `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;">מצורפת ${title}: ${note?.note_num || ''}</div>`;

      setSendingStep('שולח מייל...');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('המייל לוקח זמן רב מדי — בדוק את הלוגים ב-Railway')), 60000));
      const resp = await Promise.race([
        api.post('/api/email/send', {
          to: to.trim(),
          subject,
          htmlBody: emailHtml,
          pdfBase64,
          fileName: `${fileName}.pdf`,
        }),
        timeoutPromise,
      ]);

      if (resp.ok) {
        setResult({ ok: true, message: `${title} נשלחה בהצלחה!` });
        // Update status to 'sent' (only if still draft — don't overwrite 'delivered')
        if (note?.id && note.status === 'draft') {
          try {
            await updateMut.mutateAsync({ id: note.id, status: 'sent' });
            if (onStatusChange) onStatusChange('sent');
          } catch (e) { console.error('Failed to update note status to sent:', e); }
        }
      } else {
        setResult({ ok: false, message: resp.error || 'שגיאה בשליחה' });
      }
    } catch (err) {
      console.error('Send delivery note error:', err);
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
          <h2>שליחת {title} במייל</h2>
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

          {sending && sendingStep && (
            <div style={{ background: 'var(--accent)15', border: '1px solid var(--accent)44', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--accent)', fontWeight: 600, textAlign: 'center' }}>
              {sendingStep}
            </div>
          )}

          <div className="form-grid">
            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>נמען (כתובת מייל)</label>
              <input type="email" value={to} onChange={e => setTo(e.target.value)} dir="ltr" placeholder="email@example.com" />
              {contactName && <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{contactName}</span>}
            </div>

            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>נושא המייל</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>בחר תבנית טקסט</label>
              <select value={selectedTmpl} onChange={e => applyTemplate(e.target.value)}>
                <option value="">— טקסט חופשי —</option>
                {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-field" style={{ gridColumn: '1/-1' }}>
              <label>גוף המייל</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="הקלד את תוכן המייל כאן..." style={{ lineHeight: 1.8 }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 12 }}>
            <i className="ti ti-paperclip" aria-hidden="true" style={{ color: 'var(--success)', fontSize: 16 }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              קובץ מצורף: <strong>{fileName}.pdf</strong>
            </span>
          </div>

          <div className="modal-footer" style={{ alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleSend} disabled={sending || !senderEmail || result?.ok} style={{ minWidth: 140 }}>
              {sending ? 'שולח...' : result?.ok ? 'נשלח!' : `שלח ${title}`}
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
