import { useRef, useEffect } from 'react';
import { calcItemTotal } from '../../utils/constants';

/**
 * Build full HTML preview of a quote based on template
 */
export function buildPreviewHTML({ template, form, items, customer, autoConditions, vatRate = 18, companyInfo = {}, forPdf = false }) {
  const tmpl = template || {};
  const q = form || {};
  const cust = customer || {};
  const vat = parseFloat(vatRate) || 18;

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Calculations
  const onetimeItems = (items || []).filter(it => it.costType !== 'recurring');
  const recurringItems = (items || []).filter(it => it.costType === 'recurring');
  const onetimeSub = onetimeItems.reduce((s, it) => s + calcItemTotal(it), 0);
  const recurringSub = recurringItems.reduce((s, it) => s + calcItemTotal(it), 0);
  const totalSub = onetimeSub + recurringSub;
  const discPct = Math.min(100, Math.max(0, parseFloat(q.overall_discount) || 0));
  const disc = totalSub * (discPct / 100);
  const afterDisc = totalSub - disc;
  const vatAmt = afterDisc * (vat / 100);
  const grand = afterDisc + vatAmt;
  const fmt = (n) => '₪' + Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Costs table columns
  const cols = (tmpl.costsTable?.columns || [
    { id: 'num', label: '#', enabled: true },
    { id: 'productName', label: 'שם מוצר / שירות', enabled: true },
    { id: 'qty', label: 'כמות', enabled: true },
    { id: 'unit', label: 'יחידה', enabled: true },
    { id: 'unitPrice', label: 'מחיר ליחידה', enabled: true },
    { id: 'discount', label: 'הנחה %', enabled: true },
    { id: 'total', label: 'סה"כ', enabled: true },
  ]).filter(c => c.enabled);

  const renderItemRow = (it, idx) => {
    return cols.map(col => {
      switch (col.id) {
        case 'num': return `<td class="tc">${idx + 1}</td>`;
        case 'productName': return `<td>${esc(it.productName)}</td>`;
        case 'sku': return `<td class="tc">${esc(it.sku)}</td>`;
        case 'description': return `<td>${esc(it.description)}</td>`;
        case 'qty': return `<td class="tc">${it.quantity || 1}</td>`;
        case 'unit': return `<td class="tc">${esc(it.unit) || "יח'"}</td>`;
        case 'unitPrice': return `<td class="tc">${fmt(it.unitPrice || 0)}</td>`;
        case 'discount': return `<td class="tc">${Number(it.discount || 0).toFixed(1)}%</td>`;
        case 'total': return `<td class="tc"><strong>${fmt(calcItemTotal(it))}</strong></td>`;
        default: return '<td>—</td>';
      }
    }).join('');
  };

  const renderTable = (tableItems, title) => {
    if (!tableItems.length) return '';
    // Sort items by groupHeader so same groups are together, then render
    const sorted = [...tableItems].sort((a, b) => {
      const ga = a.groupHeader || '';
      const gb = b.groupHeader || '';
      if (ga && !gb) return -1;
      if (!ga && gb) return 1;
      if (ga !== gb) return ga.localeCompare(gb, 'he');
      return 0;
    });
    let rowsHtml = '';
    let currentGroup = null;
    let itemIdx = 0;
    sorted.forEach(it => {
      const group = it.groupHeader || '';
      if (group && group !== currentGroup) {
        rowsHtml += `<tr class="group-row"><td colspan="${cols.length}" style="background:#EEF2FF;font-weight:700;color:#1d4ed8;padding:8px 12px;font-size:13px;border-bottom:2px solid #C7D2FE">${esc(group)}</td></tr>`;
        currentGroup = group;
      }
      rowsHtml += `<tr>${renderItemRow(it, itemIdx++)}</tr>`;
    });
    return `
      <div class="itable-wrap">
        <div class="sec"><div class="sec-title">${esc(title)}</div></div>
        <table class="itable">
          <thead><tr>${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  };

  // Conditions
  const condHtml = autoConditions?.length > 0
    ? `<div class="sec"><div class="sec-title">תנאים כלליים</div>
       ${autoConditions.map((c, i) => {
         const text = q.condOverrides?.[c.id] !== undefined ? q.condOverrides[c.id] : (c.content || '');
         return `<div class="cond-item"><span class="cond-num">${i + 1}.</span><div><strong>${esc(c.name)}</strong><br/>${esc(text)}</div></div>`;
       }).join('')}
       </div>`
    : '';

  // Free conditions
  const freeCondHtml = q.conditions ? `<div class="sec"><div class="sec-title">תנאים נוספים</div><p>${esc(q.conditions).replace(/\n/g, '<br/>')}</p></div>` : '';

  // Signature section
  const sigSection = (tmpl.sections || []).find(s => s.type === 'signature' && s.enabled);
  const sigHtml = sigSection ? `
    <div class="sec sig-section">
      <div class="sec-title">אישור ההצעה</div>
      <p class="sig-text">${esc(sigSection.approvalText || 'אנו מאשרים בחתימתנו קבלת ההצעה לעיל ומסכימים לתנאיה')}</p>
      <div class="sig-fields">
        ${sigSection.showName !== false ? '<div class="sig-field"><div class="sig-line"></div><div class="sig-label">שם מלא + חתימה</div></div>' : ''}
        ${sigSection.showDate !== false ? '<div class="sig-field"><div class="sig-line"></div><div class="sig-label">תאריך</div></div>' : ''}
        ${sigSection.showRole !== false ? '<div class="sig-field"><div class="sig-line"></div><div class="sig-label">תפקיד</div></div>' : ''}
      </div>
    </div>
  ` : '';

  // Header
  const hdr = tmpl.header || {};
  const logoHtml = hdr.showLogo && hdr.logoData ? `<img src="${hdr.logoData}" alt="logo" style="max-height:60px;max-width:200px;"/>` : '';
  const companyName = hdr.companyName || companyInfo.name || '';

  // Totals
  const showSub = tmpl.costsTable?.showSubtotal !== false;
  const showVat = tmpl.costsTable?.showVat !== false;
  const showGrand = tmpl.costsTable?.showGrandTotal !== false;

  const buildTotals = (sub, label) => {
    const subDisc = sub * (discPct / 100);
    const subAfterDisc = sub - subDisc;
    const subVat = subAfterDisc * (vat / 100);
    const subGrand = subAfterDisc + subVat;
    return `<div class="totals">
      ${showSub ? `<div class="trow"><span>סה"כ ${label}:</span><span>${fmt(sub)}</span></div>` : ''}
      ${disc > 0 ? `<div class="trow" style="color:#EF4444"><span>הנחה (${discPct}%):</span><span>-${fmt(subDisc)}</span></div>` : ''}
      ${disc > 0 ? `<div class="trow"><span>לפני מע"מ:</span><span>${fmt(subAfterDisc)}</span></div>` : ''}
      ${showVat ? `<div class="trow"><span>מע"מ (${vat}%):</span><span>${fmt(subVat)}</span></div>` : ''}
      ${showGrand ? `<div class="trow tgrand"><span>סה"כ ${label} כולל מע"מ:</span><span>${fmt(subGrand)}</span></div>` : ''}
    </div>`;
  };

  const onetimeTotalsHtml = onetimeSub > 0 ? buildTotals(onetimeSub, 'חד"פ') : '';
  const recurringTotalsHtml = recurringSub > 0 ? buildTotals(recurringSub, 'שוטף') : '';

  // For PDF: footer is rendered per-page via PDFShift, exclude from body
  // For in-app preview: include footer in body (shown once at end)
  const footerHtml = (!forPdf && tmpl.footer?.text) ? `<div class="qfoot">${esc(tmpl.footer.text)}</div>` : '';

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><title>${esc(q.quote_name || 'הצעת מחיר')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Heebo','Segoe UI','Arial',sans-serif}
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
body{font-family:'Heebo','Segoe UI','Arial',sans-serif;background:#e5e7eb;color:#1a1a2e;direction:rtl}
.page{max-width:800px;margin:20px auto;background:#fff;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.1);min-height:100vh;display:flex;flex-direction:column}
.qhdr{border-bottom:2px solid #1d4ed8;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
.co-name{font-size:22px;font-weight:700;color:#1e3a8a}
.co-tag{font-size:13px;color:#64748b;margin-top:2px}
.qmeta{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px}
.qtitle{font-size:19px;font-weight:700;color:#1e3a8a;margin-bottom:10px}
.qmeta table{width:100%;font-size:13px} .qmeta td{padding:4px 8px}
.qmeta td:first-child{font-weight:600;color:#475569;width:120px}
.sec{margin-bottom:16px} .sec-title{font-size:14px;font-weight:700;color:#1d4ed8;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px}
.sec p{font-size:13px;line-height:1.7;color:#334155}
.itable{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px}
.itable thead{display:table-header-group}
.itable tfoot{display:table-footer-group}
.itable th{background:#1e3a8a;color:#fff;padding:8px 10px;text-align:right;font-weight:600}
.itable td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
.itable tr{page-break-inside:avoid;break-inside:avoid}
.itable tr:nth-child(even){background:#f8fafc}
.itable-wrap{page-break-inside:avoid;break-inside:avoid}
.tc{text-align:center}
.totals{border-top:2px solid #1e3a8a;margin-top:10px;padding-top:10px;min-width:280px;margin-right:auto;margin-left:0}
.trow{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
.tgrand{font-size:16px;font-weight:700;color:#1e3a8a;border-top:2px solid #1e3a8a;margin-top:6px;padding-top:8px}
.cond-item{display:flex;gap:8px;margin-bottom:8px;font-size:12px;line-height:1.6}
.cond-num{color:#1d4ed8;font-weight:700;min-width:20px}
.sig-section{margin-top:30px;page-break-inside:avoid}
.sig-text{font-size:13px;color:#334155;margin-bottom:20px;line-height:1.6}
.sig-fields{display:flex;gap:40px;justify-content:space-between;margin-top:16px}
.sig-field{flex:1;text-align:center}
.sig-line{border-bottom:1px solid #1e3a8a;margin-bottom:6px;min-height:30px}
.sig-label{font-size:12px;font-weight:600;color:#1d4ed8}
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
      <div class="co-name">${esc(companyName)}</div>
      ${hdr.tagline ? `<div class="co-tag">${esc(hdr.tagline)}</div>` : ''}
    </div>
    ${logoHtml}
  </div>
  <div class="qmeta">
    <div class="qtitle">הצעת מחיר</div>
    <table>
      ${q.quote_num ? `<tr><td>מספר הצעה:</td><td>${esc(q.quote_num)}</td></tr>` : ''}
      ${q.quote_date ? `<tr><td>תאריך:</td><td>${q.quote_date}</td></tr>` : ''}
      ${q.valid_until ? `<tr><td>בתוקף עד:</td><td>${q.valid_until}</td></tr>` : ''}
      <tr><td>לקוח:</td><td>${esc(cust.company_name || '')}</td></tr>
      ${q.deal_name ? `<tr><td>עסקה:</td><td>${esc(q.deal_name)}</td></tr>` : ''}
    </table>
  </div>
  ${(tmpl.sections || []).filter(s => s.enabled).map(sec => {
    switch (sec.type) {
      case 'intro': {
        let html = '';
        if (q.intro_text) html += `<div class="sec"><p style="font-size:13px;line-height:1.7;color:#334155">${esc(q.intro_text).replace(/\n/g, '<br/>')}</p></div>`;
        if (sec.content) html += `<div class="sec"><div class="sec-title">${esc(sec.title)}</div><p>${esc(sec.content).replace(/\n/g, '<br/>')}</p></div>`;
        return html;
      }
      case 'product_desc': {
        const text = sec.content || '';
        return text ? `<div class="sec"><div class="sec-title">${esc(sec.title)}</div><p>${esc(text).replace(/\n/g, '<br/>')}</p></div>` : '';
      }
      case 'costs': {
        const tableHtml = sec.costType === 'recurring'
          ? renderTable(recurringItems, sec.title || 'עלויות שוטפות') + recurringTotalsHtml
          : renderTable(onetimeItems, sec.title || 'עלויות חד-פעמיות') + onetimeTotalsHtml;
        return tableHtml ? `<div style="page-break-inside:avoid;break-inside:avoid;">${tableHtml}</div>` : '';
      }
      case 'conditions':
        return condHtml + freeCondHtml;
      case 'images': {
        const imgs = (q.images || []).filter(img => img && img.data);
        if (!imgs.length) return '';
        const imgsHtml = imgs.map(img => `
          <div style="margin-bottom:12px;page-break-inside:avoid;break-inside:avoid;">
            <img src="${img.data}" style="max-width:100%;max-height:450px;border:1px solid #e2e8f0;border-radius:8px;display:block;margin:0 auto;" />
          </div>`).join('');
        return `<div class="sec"><div class="sec-title">${esc(sec.title || 'תמונות')}</div>${imgsHtml}</div>`;
      }
      case 'signature':
        return sigHtml;
      default:
        return sec.content ? `<div class="sec"><div class="sec-title">${esc(sec.title)}</div><p>${esc(sec.content).replace(/\n/g, '<br/>')}</p></div>` : '';
    }
  }).join('')}
  ${!(tmpl.sections || []).length ? `
    ${q.intro_text ? '<div class="sec"><div class="sec-title">הקדמה</div><p>' + esc(q.intro_text).replace(/\n/g, '<br/>') + '</p></div>' : ''}
    ${renderTable(onetimeItems, 'עלויות חד-פעמיות')}
    ${onetimeTotalsHtml}
    ${renderTable(recurringItems, 'עלויות שוטפות (חודשי)')}
    ${recurringTotalsHtml}
    ${condHtml}${freeCondHtml}
  ` : ''}
  ${footerHtml}
</div></body></html>`;
}

/**
 * Quote Preview Modal - renders HTML in an iframe
 */
export default function QuotePreviewModal({ html, onClose }) {
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.85)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#1A1D2E' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            הדפסה / PDF
          </button>
        </div>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>תצוגה מקדימה</span>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
          סגור <i className="ti ti-x" aria-hidden="true" style={{ verticalAlign: '-2px' }} />
        </button>
      </div>
      {/* Iframe */}
      <iframe ref={iframeRef} style={{ flex: 1, border: 'none', background: '#e5e7eb' }} title="quote-preview" />
    </div>
  );
}
