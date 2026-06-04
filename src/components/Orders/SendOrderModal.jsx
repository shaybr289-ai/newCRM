import { useState, useEffect } from 'react';
import { api, getAccessToken } from '../../api/client';
import { useSettings } from '../../hooks/useDataManagement';
import { ORDER_STATUSES, DELIVERY_TYPES } from '../../utils/constants';
import '../Customers/CustomerModal.css';

function buildOrderHTML({ order, items, customer, contact, companyName }) {
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmt = (n) => `₪${(Number(n)||0).toLocaleString('he-IL',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const statusLabel = ORDER_STATUSES.find(([k])=>k===order.status)?.[1] || order.status || '';
  const deliveryLabel = DELIVERY_TYPES.find(([k])=>k===order.delivery_type)?.[1] || '';
  const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ');
  const total = (items||[]).reduce((sum,it)=>{
    const lineTotal = (Number(it.unit_price||it.unitPrice)||0) * (Number(it.quantity)||1) * (1-(Number(it.discount)||0)/100);
    return sum + lineTotal;
  },0);

  const itemRows = (items||[]).filter(it=>!it.groupHeader).map(it=>{
    const price = Number(it.unit_price||it.unitPrice)||0;
    const qty = Number(it.quantity)||1;
    const disc = Number(it.discount)||0;
    const lineTotal = price * qty * (1-disc/100);
    return `<tr>
      <td>${esc(it.productName||it.product_name||'')}</td>
      <td style="text-align:center">${qty}</td>
      <td style="text-align:center">${esc(it.unit||'')}</td>
      <td style="text-align:left">${fmt(price)}</td>
      <td style="text-align:center">${disc?disc+'%':''}</td>
      <td style="text-align:left;font-weight:600">${fmt(lineTotal)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;margin:0;padding:24px}
  h1{font-size:20px;color:#074876;margin:0 0 4px}
  .meta{display:flex;gap:32px;margin-bottom:20px;flex-wrap:wrap}
  .meta-item label{font-size:11px;color:#64748b;display:block}
  .meta-item span{font-size:13px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#074876;color:#fff;padding:8px 10px;text-align:right;font-size:12px}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;vertical-align:top}
  .total-row td{font-weight:700;border-top:2px solid #074876;background:#f8fafc}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#EBF5FF;color:#074876}
</style></head><body>
  <h1>הזמנה ${esc(order.order_num?'#'+order.order_num:'')} — ${esc(order.order_name||'')}</h1>
  ${companyName?`<div style="font-size:12px;color:#64748b;margin-bottom:12px">${esc(companyName)}</div>`:''}
  <div class="meta">
    <div class="meta-item"><label>לקוח</label><span>${esc(customer?.company_name||'')}</span></div>
    ${contactName?`<div class="meta-item"><label>איש קשר</label><span>${esc(contactName)}</span></div>`:''}
    ${order.order_date?`<div class="meta-item"><label>תאריך הזמנה</label><span>${new Date(order.order_date).toLocaleDateString('he-IL')}</span></div>`:''}
    ${order.delivery_date?`<div class="meta-item"><label>תאריך אספקה</label><span>${new Date(order.delivery_date).toLocaleDateString('he-IL')}</span></div>`:''}
    <div class="meta-item"><label>סטטוס</label><span class="badge">${esc(statusLabel)}</span></div>
    ${deliveryLabel?`<div class="meta-item"><label>סוג משלוח</label><span>${esc(deliveryLabel)}</span></div>`:''}
    ${order.delivery_address?`<div class="meta-item"><label>כתובת משלוח</label><span>${esc(order.delivery_address)}</span></div>`:''}
  </div>
  ${itemRows ? `<table>
    <thead><tr>
      <th>פריט</th><th style="text-align:center">כמות</th><th style="text-align:center">יח'</th>
      <th style="text-align:left">מחיר יחידה</th><th style="text-align:center">הנחה</th><th style="text-align:left">סה"כ</th>
    </tr></thead>
    <tbody>${itemRows}
      <tr class="total-row"><td colspan="5">סה"כ לתשלום</td><td style="text-align:left">${fmt(total)}</td></tr>
    </tbody>
  </table>` : ''}
  ${order.notes?`<p style="margin-top:16px;padding:10px 14px;background:#f8fafc;border-radius:6px;font-size:12px"><strong>הערות:</strong> ${esc(order.notes)}</p>`:''}
</body></html>`;
}

export default function SendOrderModal({ order, items, customer, contact, onClose, onSent }) {
  const { data: settings } = useSettings();

  const contactEmail = contact?.email || '';
  const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ');
  const customerName = customer?.company_name || '';
  const orderNum = order?.order_num ? `#${order.order_num}` : '';
  const orderName = order?.order_name || '';

  const [to, setTo] = useState(contactEmail);
  const [subject, setSubject] = useState(`הזמנה ${orderNum} — ${orderName}`);
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
      .replace(/\{שם_לקוח\}/g, customerName)
      .replace(/\{שם_איש_קשר\}/g, contactName)
      .replace(/\{מספר_הזמנה\}/g, order?.order_num || '')
      .replace(/\{שם_הצעה\}/g, '')
      .replace(/\{מספר_הצעה\}/g, '')
      .replace(/\{מספר_תעודה\}/g, '')
      .replace(/\{שם_דוח\}/g, '');
    setBody(text);
  };

  const handleSend = async () => {
    if (!to.trim()) { setResult({ ok: false, message: 'חסרה כתובת מייל נמען' }); return; }
    if (!senderEmail) { setResult({ ok: false, message: 'לא הוגדרה כתובת מייל שולח. הגדר בניהול נתונים → הגדרות' }); return; }

    setSending(true);
    setResult(null);

    try {
      setSendingStep('מכין מסמך...');
      const html = buildOrderHTML({ order, items, customer, contact });

      setSendingStep('יוצר קובץ PDF...');
      const pdfResp = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ html, filename: `הזמנה-${order?.order_num || order?.id}.pdf` }),
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
        ? `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;white-space:pre-wrap;">${body.replace(/\n/g,'<br>')}</div>`
        : `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;">מצורפת הזמנה ${orderNum}: ${orderName}</div>`;

      setSendingStep('שולח מייל...');
      const timeoutPromise = new Promise((_,reject) => setTimeout(()=>reject(new Error('המייל לוקח זמן רב מדי')),60000));
      const resp = await Promise.race([
        api.post('/api/email/send', {
          to: to.trim(),
          subject,
          htmlBody: emailHtml,
          pdfBase64,
          fileName: `הזמנה-${order?.order_num || order?.id}.pdf`,
        }),
        timeoutPromise,
      ]);

      if (resp.ok) {
        setResult({ ok: true, message: 'ההזמנה נשלחה בהצלחה!' });
        if (onSent) onSent();
      } else {
        setResult({ ok: false, message: resp.error || 'שגיאה בשליחה' });
      }
    } catch (err) {
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
          <h2>שליחת הזמנה במייל</h2>
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
            }}>{result.message}</div>
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
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
                placeholder="הקלד את תוכן המייל כאן..." style={{ lineHeight: 1.8 }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 12 }}>
            <i className="ti ti-paperclip" aria-hidden="true" style={{ color: 'var(--success)', fontSize: 16 }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              קובץ מצורף: <strong>הזמנה-{order?.order_num || ''}.pdf</strong> (מופק אוטומטית)
            </span>
          </div>

          <div className="modal-footer" style={{ alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleSend}
              disabled={sending || !senderEmail || result?.ok} style={{ minWidth: 140 }}>
              {sending ? 'שולח...' : result?.ok ? 'נשלח!' : 'שלח הזמנה'}
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
