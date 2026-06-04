import { useState, useEffect } from 'react';
import { api, getAccessToken } from '../../api/client';
import { useSettings } from '../../hooks/useDataManagement';
import '../Customers/CustomerModal.css';

function getDisplayValue(val, field) {
  if (val == null || val === '') return '—';
  if (field?.type === 'enum' && field.options) { const opt = field.options.find(([k]) => k === val); return opt ? opt[1] : val; }
  if (field?.type === 'boolean') return val ? 'כן' : 'לא';
  if (field?.type === 'date') { try { return new Date(val).toLocaleDateString('he-IL'); } catch { return val; } }
  if (field?.type === 'number') { const n = Number(val); return isNaN(n) ? val : n.toLocaleString('he-IL'); }
  return String(val);
}

function buildReportHTML({ report, selectedFields, filtered, hasJoins }) {
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const headers = selectedFields.map(f => hasJoins ? `${f.modLabel} — ${f.label}` : f.label);
  const rows = filtered.map(row => selectedFields.map(f => getDisplayValue(row[f.key], f)));

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;margin:0;padding:24px}
  h1{font-size:18px;color:#074876;margin:0 0 4px}
  .meta{font-size:11px;color:#64748b;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  th{background:#074876;color:#fff;padding:7px 10px;text-align:right;font-size:11px;white-space:nowrap}
  td{padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
</style></head><body>
  <h1>${esc(report.name || 'דוח')}</h1>
  <div class="meta">${new Date().toLocaleDateString('he-IL')} · ${filtered.length} רשומות</div>
  <table>
    <thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</body></html>`;
}

export default function SendReportModal({ report, selectedFields, filtered, onClose }) {
  const { data: settings } = useSettings();

  const reportName = report?.name || 'דוח';
  const hasJoins = (report?.joinModules || []).length > 0;

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(`דוח — ${reportName}`);
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
      .replace(/\{שם_דוח\}/g, reportName)
      .replace(/\{שם_לקוח\}/g, '')
      .replace(/\{שם_איש_קשר\}/g, '')
      .replace(/\{שם_הצעה\}/g, '')
      .replace(/\{מספר_הצעה\}/g, '')
      .replace(/\{מספר_תעודה\}/g, '')
      .replace(/\{מספר_הזמנה\}/g, '');
    setBody(text);
  };

  const handleSend = async () => {
    if (!to.trim()) { setResult({ ok: false, message: 'חסרה כתובת מייל נמען' }); return; }
    if (!senderEmail) { setResult({ ok: false, message: 'לא הוגדרה כתובת מייל שולח. הגדר בניהול נתונים → הגדרות' }); return; }

    setSending(true);
    setResult(null);

    try {
      setSendingStep('מכין דוח...');
      const html = buildReportHTML({ report, selectedFields, filtered, hasJoins });

      setSendingStep('יוצר קובץ PDF...');
      const pdfResp = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ html, filename: `${reportName}.pdf` }),
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
        : `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;">מצורף דוח: ${reportName} (${filtered.length} רשומות)</div>`;

      setSendingStep('שולח מייל...');
      const timeoutPromise = new Promise((_,reject)=>setTimeout(()=>reject(new Error('המייל לוקח זמן רב מדי')),60000));
      const resp = await Promise.race([
        api.post('/api/email/send', {
          to: to.trim(),
          subject,
          htmlBody: emailHtml,
          pdfBase64,
          fileName: `${reportName}.pdf`,
        }),
        timeoutPromise,
      ]);

      if (resp.ok) {
        setResult({ ok: true, message: 'הדוח נשלח בהצלחה!' });
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
          <h2>שליחת דוח במייל</h2>
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
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
                placeholder="הקלד את תוכן המייל כאן..." style={{ lineHeight: 1.8 }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 12 }}>
            <i className="ti ti-paperclip" aria-hidden="true" style={{ color: 'var(--success)', fontSize: 16 }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              קובץ מצורף: <strong>{reportName}.pdf</strong> — {filtered.length} רשומות
            </span>
          </div>

          <div className="modal-footer" style={{ alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleSend}
              disabled={sending || !senderEmail || result?.ok || !filtered.length} style={{ minWidth: 140 }}>
              {sending ? 'שולח...' : result?.ok ? 'נשלח!' : 'שלח דוח'}
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
