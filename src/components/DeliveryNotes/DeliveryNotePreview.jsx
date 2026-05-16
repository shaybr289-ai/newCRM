/**
 * Build HTML for delivery note PDF rendering
 */
export function buildDeliveryNoteHTML({ note, items, customer, contact, order, companyInfo = {}, forPdf = false }) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '';
  const isReturn = note?.note_type === 'return';

  const companyName = esc(companyInfo.name || '');
  const companyPhone = esc(companyInfo.phone || '');
  const companyEmail = esc(companyInfo.email || '');
  const companyAddress = esc(companyInfo.address || '');
  const companyTaxId = esc(companyInfo.tax_id || '');
  const logoHtml = companyInfo.logo ? `<img src="${companyInfo.logo}" alt="לוגו" style="max-height:60px;max-width:180px;object-fit:contain" />` : '';

  const title = isReturn ? 'תעודת החזרה' : 'תעודת משלוח';
  const headerColor = isReturn ? '#F59E0B' : '#1d4ed8';

  // Items table rows
  const rowsHtml = (items || []).map((it, idx) => `
    <tr>
      <td class="tc">${idx + 1}</td>
      <td>${esc(it.productName || it.product_name || '—')}</td>
      <td class="tc" style="direction:ltr">${esc(it.sku || '—')}</td>
      <td class="tc">${Number(it.quantity_delivered || 0)}</td>
      <td class="tc">${esc(it.unit || '—')}</td>
      <td>${esc(it.description || '')}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><title>${title} ${esc(note.note_num || '')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Heebo','Segoe UI','Arial',sans-serif}
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
body{font-family:'Heebo','Arial',sans-serif;background:#e5e7eb;color:#1a1a2e;direction:rtl}
.page{max-width:800px;margin:20px auto;background:#fff;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.1)}
.dhdr{border-bottom:3px solid ${headerColor};padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start}
.dhdr-right{display:flex;flex-direction:column;gap:4px}
.co-name{font-size:22px;font-weight:800;color:${headerColor}}
.co-meta{font-size:11px;color:#64748b;margin-top:2px}
.dhdr-left{text-align:left}
.dtitle{font-size:28px;font-weight:800;color:${headerColor};margin-bottom:4px}
.dnum{font-size:14px;font-weight:700;color:#334155;background:${headerColor}18;padding:4px 12px;border-radius:8px;display:inline-block}

.dmeta{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dmeta-group{font-size:12px}
.dmeta-group-title{font-size:10px;color:${headerColor};font-weight:700;text-transform:uppercase;margin-bottom:4px;letter-spacing:.5px}
.dmeta-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;border-bottom:1px solid #f1f5f9}
.dmeta-row:last-child{border:0}
.dmeta-label{color:#64748b;font-weight:500}
.dmeta-value{font-weight:600;color:#1a1a2e}

.sec{margin-bottom:20px}
.sec-title{font-size:14px;font-weight:700;color:${headerColor};border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px}

.itable{width:100%;border-collapse:collapse;font-size:12px}
.itable thead{display:table-header-group}
.itable th{background:${headerColor};color:#fff;padding:8px 10px;text-align:right;font-weight:600}
.itable td{padding:8px 10px;border-bottom:1px solid #e2e8f0}
.itable tr{page-break-inside:avoid;break-inside:avoid}
.itable tr:nth-child(even){background:#f8fafc}
.tc{text-align:center}

.sig-section{margin-top:30px;padding:16px;border:2px solid #e2e8f0;border-radius:12px;background:#fafbff;page-break-inside:avoid;break-inside:avoid}
.sig-title{font-size:13px;font-weight:700;color:${headerColor};margin-bottom:12px}
.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:12px}
.sig-field{}
.sig-label{font-size:11px;color:#64748b;margin-bottom:4px}
.sig-value{font-weight:600;color:#1a1a2e;border-bottom:1px solid #cbd5e1;padding:4px 0;min-height:20px}
.sig-img{max-height:100px;max-width:300px;border:1px dashed #cbd5e1;padding:6px;background:#fff;border-radius:8px}

.dfoot{border-top:1px solid #e2e8f0;margin-top:30px;padding-top:12px;font-size:10px;color:#94a3b8;text-align:center}
.note-box{background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:10px;font-size:12px;color:#92400E;margin-top:16px}

@media print{
  html,body{background:#fff !important;margin:0 !important;padding:0 !important}
  .page{box-shadow:none !important;margin:0 !important;padding:8mm 5mm !important;max-width:100% !important}
}
</style></head>
<body><div class="page">
  <div class="dhdr">
    <div class="dhdr-right">
      ${logoHtml}
      ${companyName ? `<div class="co-name">${companyName}</div>` : ''}
      <div class="co-meta">
        ${companyTaxId ? `ח.פ: ${companyTaxId} • ` : ''}
        ${companyPhone ? `טל': ${companyPhone} • ` : ''}
        ${companyEmail ? companyEmail : ''}
      </div>
      ${companyAddress ? `<div class="co-meta">${companyAddress}</div>` : ''}
    </div>
    <div class="dhdr-left">
      <div class="dtitle">${title}</div>
      ${note.note_num ? `<div class="dnum">${esc(note.note_num)}</div>` : ''}
    </div>
  </div>

  <div class="dmeta">
    <div class="dmeta-group">
      <div class="dmeta-group-title">פרטי לקוח</div>
      ${customer?.company_name ? `<div class="dmeta-row"><span class="dmeta-label">שם לקוח:</span><span class="dmeta-value">${esc(customer.company_name)}</span></div>` : ''}
      ${customer?.cust_num ? `<div class="dmeta-row"><span class="dmeta-label">מספר לקוח:</span><span class="dmeta-value">${esc(customer.cust_num)}</span></div>` : ''}
      ${customer?.reg_num ? `<div class="dmeta-row"><span class="dmeta-label">ח.פ/ע.מ:</span><span class="dmeta-value">${esc(customer.reg_num)}</span></div>` : ''}
      ${contact ? `<div class="dmeta-row"><span class="dmeta-label">איש קשר:</span><span class="dmeta-value">${esc((contact.first_name || '') + ' ' + (contact.last_name || ''))}</span></div>` : ''}
      ${contact?.mobile || contact?.phone ? `<div class="dmeta-row"><span class="dmeta-label">טלפון:</span><span class="dmeta-value" style="direction:ltr">${esc(contact.mobile || contact.phone)}</span></div>` : ''}
    </div>
    <div class="dmeta-group">
      <div class="dmeta-group-title">פרטי משלוח</div>
      ${note.delivery_date ? `<div class="dmeta-row"><span class="dmeta-label">תאריך אספקה:</span><span class="dmeta-value">${fmtDate(note.delivery_date)}</span></div>` : ''}
      ${order?.order_num ? `<div class="dmeta-row"><span class="dmeta-label">הזמנת מקור:</span><span class="dmeta-value">${esc(order.order_num)}</span></div>` : ''}
      ${note.delivery_address ? `<div class="dmeta-row"><span class="dmeta-label">כתובת אספקה:</span><span class="dmeta-value">${esc(note.delivery_address)}</span></div>` : ''}
      ${note.source_address ? `<div class="dmeta-row"><span class="dmeta-label">כתובת מקור:</span><span class="dmeta-value">${esc(note.source_address)}</span></div>` : ''}
      ${note.driver_name ? `<div class="dmeta-row"><span class="dmeta-label">שם נהג:</span><span class="dmeta-value">${esc(note.driver_name)}</span></div>` : ''}
      ${note.vehicle_num ? `<div class="dmeta-row"><span class="dmeta-label">מס' רכב:</span><span class="dmeta-value" style="direction:ltr">${esc(note.vehicle_num)}</span></div>` : ''}
      ${note.tracking_num ? `<div class="dmeta-row"><span class="dmeta-label">מס' מעקב:</span><span class="dmeta-value" style="direction:ltr">${esc(note.tracking_num)}</span></div>` : ''}
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">${isReturn ? 'פריטים שמוחזרים' : 'פריטים שמסופקים'} (${(items || []).length})</div>
    <table class="itable">
      <thead><tr>
        <th style="width:40px">#</th>
        <th>שם מוצר / שירות</th>
        <th style="width:100px">מק"ט</th>
        <th style="width:80px">${isReturn ? 'כמות להחזרה' : 'כמות לאספקה'}</th>
        <th style="width:60px">יחידה</th>
        <th>הערות</th>
      </tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="6" class="tc" style="color:#94a3b8">אין פריטים</td></tr>'}</tbody>
    </table>
  </div>

  ${note.notes ? `<div class="note-box"><strong>הערות:</strong> ${esc(note.notes).replace(/\n/g, '<br>')}</div>` : ''}

  <div class="sig-section">
    <div class="sig-title">אישור קבלה וחתימה</div>
    <div class="sig-row">
      <div class="sig-field">
        <div class="sig-label">שם המקבל</div>
        <div class="sig-value">${esc(note.signed_by || '')}</div>
      </div>
      <div class="sig-field">
        <div class="sig-label">תאריך חתימה</div>
        <div class="sig-value">${note.signed_at ? new Date(note.signed_at).toLocaleString('he-IL') : ''}</div>
      </div>
    </div>
    ${note.signature_data ? `
      <div style="margin-top:16px">
        <div class="sig-label">חתימה:</div>
        <img src="${note.signature_data}" class="sig-img" alt="חתימה" />
      </div>
    ` : `
      <div style="margin-top:16px">
        <div class="sig-label">חתימה:</div>
        <div style="height:80px;border:1px dashed #cbd5e1;background:#fff;border-radius:8px"></div>
      </div>
    `}
  </div>

  <div class="dfoot">
    תעודה זו הופקה ע"י מערכת BIZ-APP • ${fmtDate(new Date())}
  </div>
</div></body></html>`;
}
