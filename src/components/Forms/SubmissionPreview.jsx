import { useRef, useEffect } from 'react';

/**
 * Build full HTML preview of a submitted form.
 *
 * Looks just like a quote print: blue header with company logo, metadata
 * table, sections rendered as labeled value rows, signature/image fields
 * rendered visually, footer at the bottom.
 *
 * Args:
 *   form              — { id, name, description, form_num, ... }
 *   submission        — { submission_num, submitted_at, status, submitted_by, ... }
 *   submissionValues  — [{ field_key, field_label, field_type, value_text, value_number, value_json, file_data }, ...]
 *   sections          — form sections (so we can group values by section)
 *   fields            — form field defs (so we know type/order even if value is missing)
 *   companyInfo       — { name, address, phone, email, tax_id, logo? }
 *   forPdf            — true when generating for PDF (no in-app footer)
 */
export function buildSubmissionHTML({
  form = {},
  submission = {},
  submissionValues = [],
  sections = [],
  fields = [],
  companyInfo = {},
  forPdf = false,
}) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('he-IL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return String(d); }
  };

  const STATUS_LABEL = {
    draft: 'טיוטה',
    submitted: 'הוגש',
    pending: 'ממתין לסקירה',
    reviewed: 'נסקר',
    approved: 'אושר',
    rejected: 'נדחה',
  };

  // Build a map: field_key → submission value
  const valueByKey = {};
  for (const v of submissionValues) valueByKey[v.field_key] = v;

  // Field types that don't have a value (layout-only)
  const DISPLAY_TYPES = new Set(['heading', 'paragraph', 'divider', 'spacer', 'logo', 'image_display']);

  /**
   * Render a single field's value as HTML.
   */
  const renderFieldValue = (field, value) => {
    const type = field.field_type;

    // No value at all
    if (!value && type !== 'checkbox' && type !== 'toggle') {
      return '<span style="color:#94a3b8;font-style:italic">לא מולא</span>';
    }

    // Signature — render image
    if (type === 'signature') {
      const data = value?.file_data || value?.value_text;
      if (data && String(data).startsWith('data:image')) {
        return `<img src="${data}" alt="חתימה" style="max-height:80px;max-width:240px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;padding:4px" />`;
      }
      return '<span style="color:#94a3b8;font-style:italic">לא נחתם</span>';
    }

    // Image / file — supports both legacy single (file_data) and new array (value_json)
    if (type === 'image' || type === 'file') {
      // Build a normalized list of attachments
      let items = [];
      const vj = value?.value_json;
      if (Array.isArray(vj)) {
        items = vj.filter(Boolean);
      } else if (value?.file_data) {
        items = [{ name: type === 'image' ? 'תמונה' : 'קובץ', type: '', dataUrl: value.file_data }];
      }
      if (items.length === 0) {
        if (value?.file_url) return `<a href="${esc(value.file_url)}" style="color:#1d4ed8">קובץ מצורף</a>`;
        return '<span style="color:#94a3b8;font-style:italic">לא צורף</span>';
      }
      return `<div style="display:flex;flex-wrap:wrap;gap:8px">${items.map(it => {
        const data = it.dataUrl || '';
        const isImg = String(data).startsWith('data:image') || String(it.type || '').startsWith('image/');
        if (isImg && data) {
          return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:4px;background:#fff">
            <img src="${data}" alt="${esc(it.name || 'תמונה')}" style="max-height:200px;max-width:280px;display:block;border-radius:4px" />
            ${it.name ? `<div style="font-size:11px;color:#64748b;margin-top:4px;text-align:center">${esc(it.name)}</div>` : ''}
          </div>`;
        }
        // Non-image: show icon + name
        const icon = (it.type || '').includes('pdf') ? 'PDF' :
                     (it.type || '').includes('word') ? 'DOC' : '📄';
        return `<div style="display:inline-flex;align-items:center;gap:6px;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;background:#f8fafc;font-size:13px">
          <span style="font-size:18px">${icon}</span>
          <span>${esc(it.name || 'קובץ')}</span>
        </div>`;
      }).join('')}</div>`;
    }

    // Rating — stars
    if (type === 'rating') {
      const n = Number(value?.value_number ?? value?.value_text ?? 0);
      const max = Number(field.validation?.max || 5);
      const stars = '★'.repeat(Math.max(0, Math.min(max, n))) + '☆'.repeat(Math.max(0, max - n));
      return `<span style="color:#f59e0b;font-size:18px;letter-spacing:2px">${stars}</span> <span style="color:#475569;font-size:13px;margin-right:8px">${n} / ${max}</span>`;
    }

    // Slider
    if (type === 'slider') {
      const n = Number(value?.value_number ?? value?.value_text ?? 0);
      const min = Number(field.validation?.min ?? 0);
      const max = Number(field.validation?.max ?? 100);
      const pct = max > min ? Math.round(((n - min) / (max - min)) * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:10px">
          <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
            <div style="height:100%;background:linear-gradient(90deg,#3B82F6,#1d4ed8);width:${pct}%"></div>
          </div>
          <span style="font-weight:700;color:#1e3a8a;min-width:40px">${n}</span>
        </div>`;
    }

    // Checkbox / toggle
    if (type === 'checkbox' || type === 'toggle') {
      const t = value?.value_text;
      const truthy = t === 'true' || t === '1' || value?.value_number === 1;
      return truthy
        ? '<span style="color:#16a34a;font-weight:700">&#10003; כן</span>'
        : '<span style="color:#dc2626;font-weight:700">&#10007; לא</span>';
    }

    // Multi-select / array values
    if (type === 'multi_select' || Array.isArray(value?.value_json)) {
      const arr = value?.value_json;
      if (Array.isArray(arr) && arr.length > 0) {
        // Resolve labels from field options if possible
        const opts = field.options || [];
        const labels = arr.map((v) => {
          const opt = opts.find((o) => o.value === v || o.value === String(v));
          return opt?.label || v;
        });
        return labels.map(l => `<span style="display:inline-block;background:#EFF6FF;color:#1d4ed8;padding:3px 10px;border-radius:99px;font-size:12px;margin-left:4px">${esc(l)}</span>`).join('');
      }
      return '<span style="color:#94a3b8;font-style:italic">—</span>';
    }

    // Select / radio — try to map value to option label
    if (type === 'select' || type === 'radio') {
      const raw = value?.value_text;
      const opts = field.options || [];
      const opt = opts.find((o) => o.value === raw || o.value === String(raw));
      return esc(opt?.label || raw || '—');
    }

    // Module lookup — show the stored display label (falls back to ID for legacy)
    if (type === 'module_lookup') {
      const vj = value?.value_json;
      let label = null;
      if (vj && typeof vj === 'object' && (vj.label || vj.id)) {
        label = vj.label || vj.id;
      } else {
        label = value?.value_text || '';
      }
      if (!label) return '<span style="color:#94a3b8;font-style:italic">—</span>';
      return `<span style="color:#1a1a2e;font-weight:600">${esc(label)}</span>`;
    }

    // Number / currency / percentage
    if (type === 'currency') {
      const n = Number(value?.value_number ?? value?.value_text ?? 0);
      return '₪' + n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (type === 'percentage') {
      return Number(value?.value_number ?? value?.value_text ?? 0).toFixed(1) + '%';
    }
    if (type === 'number') {
      return Number(value?.value_number ?? value?.value_text ?? 0).toLocaleString('he-IL');
    }

    // Date / time
    if (type === 'date') {
      const d = value?.value_text;
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('he-IL'); }
      catch { return esc(d); }
    }
    if (type === 'datetime') return fmtDate(value?.value_text);
    if (type === 'time')     return esc(value?.value_text || '—');

    // JSON object — pretty print
    if (value?.value_json && typeof value.value_json === 'object') {
      return `<pre style="background:#f8fafc;padding:8px;border-radius:6px;font-size:12px;direction:ltr;text-align:left">${esc(JSON.stringify(value.value_json, null, 2))}</pre>`;
    }

    // Default text — preserve newlines
    const text = value?.value_text ?? value?.value_number ?? '';
    return esc(text).replace(/\n/g, '<br/>');
  };

  /**
   * Render one field row (label on right, value on left in RTL).
   */
  const renderFieldRow = (field) => {
    if (DISPLAY_TYPES.has(field.field_type)) {
      // Layout fields — render as informational headings
      if (field.field_type === 'heading') {
        return `<h3 style="margin:18px 0 8px;color:#1e3a8a;font-size:16px;font-weight:700;border-right:3px solid #1d4ed8;padding-right:10px">${esc(field.label || '')}</h3>`;
      }
      if (field.field_type === 'paragraph') {
        return `<p style="margin:8px 0;color:#475569;font-size:13px;line-height:1.7">${esc(field.label || '').replace(/\n/g, '<br/>')}</p>`;
      }
      if (field.field_type === 'divider') {
        return '<hr style="border:none;border-top:1px solid #e2e8f0;margin:14px 0" />';
      }
      return '';
    }

    if (field.hidden) return '';

    const value = valueByKey[field.field_key];
    return `
      <div class="frow">
        <div class="flbl">${esc(field.label || field.field_key)}</div>
        <div class="fval">${renderFieldValue(field, value)}</div>
      </div>`;
  };

  /**
   * Render one section: title + its fields.
   */
  const renderSection = (section, sectionFields) => {
    if (sectionFields.length === 0) return '';
    return `
      <div class="sec">
        ${section?.title ? `<div class="sec-title">${esc(section.title)}</div>` : ''}
        ${section?.description ? `<p style="color:#64748b;font-size:12px;margin-bottom:8px">${esc(section.description)}</p>` : ''}
        <div class="sec-body">
          ${sectionFields.map(renderFieldRow).join('')}
        </div>
      </div>`;
  };

  // Group fields by section
  const fieldsBySection = new Map();
  const orphanFields = [];
  for (const f of fields) {
    if (f.section_id) {
      if (!fieldsBySection.has(f.section_id)) fieldsBySection.set(f.section_id, []);
      fieldsBySection.get(f.section_id).push(f);
    } else {
      orphanFields.push(f);
    }
  }
  // Sort each group by sort_order
  for (const arr of fieldsBySection.values()) {
    arr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }
  orphanFields.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const sectionsSorted = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const sectionsHtml = sectionsSorted
    .map(s => renderSection(s, fieldsBySection.get(s.id) || []))
    .join('');
  const orphanHtml = orphanFields.length > 0
    ? renderSection(null, orphanFields)
    : '';

  // Header (company)
  const companyName = companyInfo.name || '';
  const companyTagline = companyInfo.tagline || '';
  const companyAddress = companyInfo.address || '';
  const companyPhone = companyInfo.phone || '';
  const companyEmail = companyInfo.email || '';
  const companyTaxId = companyInfo.tax_id || '';
  const logoHtml = companyInfo.logo
    ? `<img src="${companyInfo.logo}" alt="logo" style="max-height:60px;max-width:200px;object-fit:contain" />`
    : '';

  // Submitter info — prefer name → username → email; only fall back to UUID
  // for legacy rows. Public submissions (no auth) show a friendly label.
  const submittedByName = (submission.submitted_by_name || '').trim();
  const submittedBy = submittedByName
    || submission.submitted_by_username
    || submission.submitted_by_email
    || (submission.is_public ? 'משתמש ציבורי (טופס פתוח)' : '—');
  const submittedAt = fmtDate(submission.submitted_at || submission.created_at);
  const reviewedByName = (submission.reviewed_by_name || '').trim();
  const reviewedBy = reviewedByName || submission.reviewed_by_username || '';
  const reviewedAt = submission.reviewed_at ? fmtDate(submission.reviewed_at) : '';
  const status = STATUS_LABEL[submission.status] || submission.status || '';

  const footerHtml = !forPdf
    ? `<div class="qfoot">
        ${companyAddress ? esc(companyAddress) + ' · ' : ''}
        ${companyPhone ? esc(companyPhone) + ' · ' : ''}
        ${companyEmail ? esc(companyEmail) : ''}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><title>${esc(form.name || 'הגשת טופס')} — ${esc(submission.submission_num || '')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Heebo','Segoe UI','Arial',sans-serif}
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
body{font-family:'Heebo','Segoe UI','Arial',sans-serif;background:#e5e7eb;color:#1a1a2e;direction:rtl}
.page{max-width:800px;margin:20px auto;background:#fff;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.1);min-height:100vh;display:flex;flex-direction:column}
.qhdr{border-bottom:2px solid #1d4ed8;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
.co-name{font-size:22px;font-weight:700;color:#1e3a8a}
.co-tag{font-size:13px;color:#64748b;margin-top:2px}
.co-contact{font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.5}
.qmeta{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px}
.qtitle{font-size:19px;font-weight:700;color:#1e3a8a;margin-bottom:10px}
.qmeta table{width:100%;font-size:13px} .qmeta td{padding:4px 8px;vertical-align:top}
.qmeta td:first-child{font-weight:600;color:#475569;width:130px}
.status-badge{display:inline-block;padding:3px 12px;border-radius:99px;font-size:12px;font-weight:700}
.st-submitted{background:#DBEAFE;color:#1e40af}
.st-pending  {background:#FEF3C7;color:#92400e}
.st-reviewed {background:#E0E7FF;color:#3730a3}
.st-approved {background:#D1FAE5;color:#065f46}
.st-rejected {background:#FEE2E2;color:#991b1b}
.st-draft    {background:#F1F5F9;color:#475569}
.sec{margin-bottom:18px;page-break-inside:avoid;break-inside:avoid}
.sec-title{font-size:14px;font-weight:700;color:#1d4ed8;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px}
.sec-body{display:flex;flex-direction:column;gap:8px}
.frow{display:grid;grid-template-columns:170px 1fr;gap:12px;padding:8px 10px;border-bottom:1px dotted #e2e8f0;page-break-inside:avoid}
.frow:nth-child(even){background:#fafbfc}
.frow:last-child{border-bottom:none}
.flbl{font-weight:600;color:#475569;font-size:13px}
.fval{color:#1a1a2e;font-size:13px;line-height:1.7;word-break:break-word}
.qfoot{border-top:1px solid #e2e8f0;margin-top:auto;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center}
@media print{
  html,body{background:#fff !important;margin:0 !important;padding:0 !important}
  .page{box-shadow:none !important;margin:0 !important;padding:8mm 5mm !important;max-width:100% !important;min-height:auto !important;display:block !important}
  .qfoot{display:none !important}
}
</style></head>
<body><div class="page">
  <div class="qhdr">
    <div>
      ${companyName ? `<div class="co-name">${esc(companyName)}</div>` : ''}
      ${companyTagline ? `<div class="co-tag">${esc(companyTagline)}</div>` : ''}
      ${(companyAddress || companyPhone || companyEmail) ? `
        <div class="co-contact">
          ${companyAddress ? esc(companyAddress) + (companyPhone || companyEmail ? ' · ' : '') : ''}
          ${companyPhone ? esc(companyPhone) + (companyEmail ? ' · ' : '') : ''}
          ${companyEmail ? esc(companyEmail) : ''}
          ${companyTaxId ? '<br/>ע"מ/ח"פ: ' + esc(companyTaxId) : ''}
        </div>` : ''}
    </div>
    ${logoHtml}
  </div>

  <div class="qmeta">
    <div class="qtitle">${esc(form.name || 'טופס')}</div>
    ${form.description ? `<p style="font-size:12px;color:#64748b;margin-bottom:10px">${esc(form.description)}</p>` : ''}
    <table>
      ${form.form_num ? `<tr><td>טופס מס':</td><td>${esc(form.form_num)}</td></tr>` : ''}
      ${submission.submission_num ? `<tr><td>הגשה מס':</td><td><strong>${esc(submission.submission_num)}</strong></td></tr>` : ''}
      <tr><td>נשלח על ידי:</td><td>${esc(submittedBy)}</td></tr>
      <tr><td>תאריך הגשה:</td><td>${submittedAt}</td></tr>
      ${status ? `<tr><td>סטטוס:</td><td><span class="status-badge st-${esc(submission.status || 'submitted')}">${esc(status)}</span></td></tr>` : ''}
      ${reviewedBy ? `<tr><td>נסקר על ידי:</td><td>${esc(reviewedBy)}${reviewedAt ? ' · ' + reviewedAt : ''}</td></tr>` : ''}
      ${submission.review_notes ? `<tr><td>הערות סקירה:</td><td>${esc(submission.review_notes)}</td></tr>` : ''}
    </table>
  </div>

  ${sectionsHtml}
  ${orphanHtml}

  ${footerHtml}
</div></body></html>`;
}

/**
 * SubmissionPreviewModal — full-screen overlay rendering the HTML in an iframe,
 * with toolbar buttons for Print / PDF and Close.
 */
export default function SubmissionPreviewModal({ html, onClose, title = 'תצוגת הגשה' }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [html]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.85)',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 20px', background: '#1A1D2E',
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#3B82F6,#2563EB)',
              color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            <i className="ti ti-printer" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> הדפסה / PDF
          </button>
        </div>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{title}</span>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
            color: '#fff', fontSize: 13, cursor: 'pointer',
          }}
        >
          <i className="ti ti-x" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> סגור
        </button>
      </div>
      {/* Iframe */}
      <iframe
        ref={iframeRef}
        style={{ flex: 1, border: 'none', background: '#e5e7eb' }}
        title="submission-preview"
      />
    </div>
  );
}
