import React, { useState, useMemo } from 'react';
import { Icon, ICONS } from '../../utils/icons';
import '../Customers/CustomerModal.css';
import './ScreenDesigner.css';

// ── Screen Registry — defines the default structure for each module ──────────
export const SCREEN_REGISTRY = {
  quotes: {
    label: 'הצעות מחיר',
    icon: 'ti-clipboard-list',
    sections: [
      {
        id: 'header', label: 'כותרת הצעה', icon: 'ti-clipboard-list', cols: 2,
        fullWidth: [],
        fields: [
          { id: 'quoteName', label: 'שם הצעה', type: 'text', required: true },
          { id: 'customerId', label: 'לקוח', type: 'custom', required: true },
          { id: 'contactId', label: 'איש קשר', type: 'custom' },
          { id: 'quoteType', label: 'סוג הצעה', type: 'select', options: [['recurring', 'שוטף'], ['onetime', 'חד"פ'], ['combined', 'משולבת']] },
          { id: 'templateId', label: 'תבנית הצעה', type: 'custom' },
          { id: 'stage', label: 'שלב הצעה', type: 'select', options: [['draft', 'טיוטא'], ['sent', 'נשלחה'], ['waiting', 'בהמתנה'], ['negotiation', 'משא ומתן'], ['signed', 'חתומה']] },
          { id: 'status', label: 'סטטוס', type: 'select', options: [['active', 'פעיל'], ['cancelled', 'מבוטל'], ['expired', 'פג תוקף']] },
          { id: 'currency', label: 'מטבע', type: 'select', options: [['ILS', 'ש"ח'], ['USD', '$'], ['EUR', 'יורו'], ['GBP', 'ליש"ט']] },
          { id: 'quoteDate', label: 'תאריך הצעה', type: 'date' },
          { id: 'validUntil', label: 'תוקף עד', type: 'date' },
          { id: 'dealName', label: 'שם / מספר עסקה', type: 'text' },
          { id: 'overallDiscount', label: 'הנחה כללית (%)', type: 'number' },
          { id: 'owner', label: 'בעלים', type: 'custom' },
        ],
      },
      {
        id: 'intro', label: 'הקדמה', icon: 'ti-file-text', cols: 1,
        fullWidth: ['introText'],
        fields: [
          { id: 'introText', label: 'טקסט הקדמה', type: 'textarea' },
        ],
      },
      {
        id: 'onetimeItems', label: 'עלויות חד פעמיות', icon: 'ti-tool',
        fields: [],
        tableCols: [
          { id: 'num', label: '#', enabled: true, fixed: true },
          { id: 'productName', label: 'שם מוצר / שירות', enabled: true },
          { id: 'groupHeader', label: 'קיבוץ כותרות', enabled: true },
          { id: 'sku', label: 'מק"ט', enabled: true },
          { id: 'cost', label: 'עלות (פנימי)', enabled: true },
          { id: 'qty', label: 'כמות', enabled: true },
          { id: 'unit', label: 'יחידה', enabled: true },
          { id: 'unitPrice', label: 'מחיר ליחידה', enabled: true },
          { id: 'discount', label: 'הנחה %', enabled: true },
          { id: 'total', label: 'סה"כ', enabled: true, fixed: true },
        ],
      },
      {
        id: 'recurringItems', label: 'עלויות שוטפות', icon: 'ti-refresh',
        fields: [],
        tableCols: [
          { id: 'num', label: '#', enabled: true, fixed: true },
          { id: 'productName', label: 'שם מוצר / שירות', enabled: true },
          { id: 'groupHeader', label: 'קיבוץ כותרות', enabled: true },
          { id: 'sku', label: 'מק"ט', enabled: true },
          { id: 'cost', label: 'עלות (פנימי)', enabled: true },
          { id: 'qty', label: 'כמות', enabled: true },
          { id: 'unit', label: 'יחידה', enabled: true },
          { id: 'unitPrice', label: 'מחיר ליחידה', enabled: true },
          { id: 'discount', label: 'הנחה %', enabled: true },
          { id: 'total', label: 'סה"כ', enabled: true, fixed: true },
        ],
      },
      {
        id: 'conditions', label: 'תנאים', icon: 'ti-file-description', cols: 1,
        fullWidth: ['conditions'],
        fields: [
          { id: 'conditions', label: 'תנאים נוספים (חופשי)', type: 'textarea' },
        ],
      },
      {
        id: 'images', label: 'תמונות', icon: 'ti-photo',
        fields: [],
      },
    ],
  },
};

const STORAGE_KEY = 'biz_field_meta_v1';

function loadFieldMeta() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveFieldMeta(meta) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

// ── Field type palette ──────────────────────────────────────────────────────
const PALETTE = [
  { type: 'text',        icon: 'Aa', label: 'שורת יחיד',   color: 'var(--accent)' },
  { type: 'textarea',    icon: '≡',  label: 'שורות מרובות', color: 'var(--accent)' },
  { type: 'email',       icon: '@',  label: 'דוא"ל',       color: 'var(--danger)' },
  { type: 'phone',       icon: '☎',  label: 'טלפון',       color: 'var(--warning)' },
  { type: 'select',      icon: '▾',  label: 'רשימת בחירה', color: 'var(--info)' },
  { type: 'multiselect', icon: '☰',  label: 'בחירה מרובה', color: '#6366F1' },
  { type: 'date',        icon: 'ti-calendar', label: 'תאריך',       color: 'var(--warning)' },
  { type: 'number',      icon: '#',  label: 'מספר',        color: 'var(--success)' },
  { type: 'checkbox',    icon: '☑',  label: 'תיבת סימון',  color: '#EC4899' },
  { type: 'url',         icon: 'ti-link', label: 'כתובת URL',   color: '#14B8A6' },
];

const TYPE_ICONS = { text: 'Aa', textarea: '≡', email: '@', phone: '☎', select: '▾', multiselect: '☰', date: 'ti-calendar', datetime: 'ti-clock', number: '#', checkbox: '☑', lookup: 'ti-search', url: 'ti-link', file: 'ti-paperclip', image: 'ti-photo', custom: '⚙', price: '#' };

// ── useScreenMeta hook ──────────────────────────────────────────────────────
export function useScreenMeta(moduleId) {
  const allMeta = loadFieldMeta();
  const modMeta = allMeta[moduleId] || {};
  const reg = SCREEN_REGISTRY[moduleId];
  if (!reg) return { getSecs: () => [], gl: () => '', gv: () => true, getTableCols: () => [], getCustomFields: () => [] };

  const getF = (secId, fId) => (modMeta[secId]?.fields || []).find(f => f.id === fId) || null;

  const getSecs = () => {
    const storedOrder = modMeta._sections;
    const base = reg.sections.map(s => {
      const ss = (storedOrder || []).find(x => x.id === s.id);
      return { ...s, label: ss?.label ?? s.label, visible: ss?.visible !== false };
    });
    if (!storedOrder) return base;
    const ordered = storedOrder.map(ss => base.find(s => s.id === ss.id)).filter(Boolean);
    const remaining = base.filter(s => !storedOrder.find(ss => ss.id === s.id));
    return [...ordered, ...remaining];
  };

  return {
    gl: (secId, fId, def) => getF(secId, fId)?.label ?? def,
    gv: (secId, fId) => getF(secId, fId)?.visible !== false,
    go: (secId, fId) => {
      const idx = (modMeta[secId]?.fields || []).findIndex(f => f.id === fId);
      return idx >= 0 ? idx : undefined;
    },
    gfw: (secId, fId) => (modMeta[secId]?.fields || []).find(f => f.id === fId)?.fieldWidth,
    goo: (secId, fId, def) => getF(secId, fId)?.options ?? def,
    getSecs,
    gsl: (secId, def) => (modMeta._sections || []).find(s => s.id === secId)?.label ?? def,
    gsv: (secId) => (modMeta._sections || []).find(s => s.id === secId)?.visible !== false,
    getTableCols: (secId) => {
      const sec = reg.sections.find(s => s.id === secId);
      if (!sec?.tableCols) return [];
      const stored = modMeta['_tc_' + secId] || [];
      return sec.tableCols.map((c, i) => {
        const s = stored.find(sc => sc.id === c.id);
        return { ...c, label: s?.label ?? c.label, enabled: s?.enabled !== undefined ? s.enabled : c.enabled !== false, order: s?.order ?? i };
      }).sort((a, b) => a.order - b.order);
    },
    getCustomFields: (secId) => (modMeta[secId]?.fields || []).filter(f => f.isCustom && f.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    // Returns ordered list of visible fields for a section (respects stored order + visibility + custom fields)
    getFieldOrder: (secId) => {
      const sec = reg.sections.find(s => s.id === secId);
      if (!sec) return [];
      const stored = modMeta[secId]?.fields || [];
      // Base fields from registry with stored overrides
      const baseFields = sec.fields.map((f, i) => {
        const m = stored.find(sf => sf.id === f.id);
        return { id: f.id, type: f.type, label: m?.label ?? f.label, order: m?.order ?? i, visible: m?.visible !== false, isCustom: false,
          fieldWidth: m?.fieldWidth ?? f.fieldWidth };
      });
      // Custom fields added by user
      const customFields = stored.filter(f => f.isCustom && !sec.fields.find(sf => sf.id === f.id)).map(f => ({
        id: f.id, type: f.type, label: f.label, order: f.order ?? 999, visible: f.visible !== false, isCustom: true,
        fieldWidth: f.fieldWidth, options: f.options, maxLength: f.maxLength, numType: f.numType, decimalPlaces: f.decimalPlaces,
      }));
      return [...baseFields, ...customFields].sort((a, b) => a.order - b.order).filter(f => f.visible);
    },
  };
}

// ── ScreenDesignerModal ─────────────────────────────────────────────────────
export default function ScreenDesignerModal({ moduleId, onClose }) {
  const reg = SCREEN_REGISTRY[moduleId];
  if (!reg) return null;

  const allMeta = loadFieldMeta();
  const modMeta = allMeta[moduleId] || {};
  const getMeta = (secId, fId) => (modMeta[secId]?.fields || []).find(f => f.id === fId) || null;

  const initSects = () => {
    const storedSecOrder = modMeta._sections;
    const base = reg.sections.map(sec => {
      const storedSec = (storedSecOrder || []).find(s => s.id === sec.id);
      const baseFields = sec.fields.map((f, i) => {
        const m = getMeta(sec.id, f.id);
        return { ...f, label: m?.label ?? f.label, visible: m?.visible !== false, required: m?.required !== undefined ? m.required : !!f.required, fieldWidth: m?.fieldWidth ?? f.fieldWidth, order: m?.order ?? i, options: m?.options ?? f.options, visibleProfiles: m?.visibleProfiles ?? f.visibleProfiles, maxLength: m?.maxLength ?? f.maxLength, phoneFormat: m?.phoneFormat ?? f.phoneFormat, defaultValue: m?.defaultValue ?? f.defaultValue, sortOrder: m?.sortOrder ?? f.sortOrder, numType: m?.numType ?? f.numType, decimalPlaces: m?.decimalPlaces ?? f.decimalPlaces };
      });
      const customFields = (modMeta[sec.id]?.fields || []).filter(f => f.isCustom && !sec.fields.find(sf => sf.id === f.id));
      const fields = [...baseFields, ...customFields].sort((a, b) => (a.order || 0) - (b.order || 0));
      let tableCols;
      if (sec.tableCols) {
        const storedCols = modMeta['_tc_' + sec.id] || [];
        tableCols = sec.tableCols.map((c, i) => { const s = storedCols.find(sc => sc.id === c.id); return { ...c, label: s?.label ?? c.label, enabled: s?.enabled !== undefined ? s.enabled : c.enabled !== false, order: s?.order ?? i }; }).sort((a, b) => a.order - b.order);
      }
      return { ...sec, label: storedSec?.label ?? sec.label, visible: storedSec?.visible !== false, fields, tableCols };
    });
    if (!storedSecOrder) return base;
    const ordered = storedSecOrder.map(ss => base.find(s => s.id === ss.id)).filter(Boolean);
    const remaining = base.filter(s => !storedSecOrder.find(ss => ss.id === s.id));
    return [...ordered, ...remaining];
  };

  const [sects, setSects] = useState(initSects);
  const [selSec, setSelSec] = useState(null);
  const [selField, setSelField] = useState(null);
  const [selCol, setSelCol] = useState(null);
  const [expanded, setExpanded] = useState(() => Object.fromEntries(reg.sections.map(s => [s.id, true])));
  const [dragInfo, setDragInfo] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [saved, setSaved] = useState(false);

  const curSec = selSec ? sects.find(s => s.id === selSec) : null;
  const curField = selField ? sects.find(s => s.id === selField.secId)?.fields.find(f => f.id === selField.fieldId) : null;
  const curCol = selCol ? sects.find(s => s.id === selCol.secId)?.tableCols?.find(c => c.id === selCol.colId) : null;

  const updSec = (id, ch) => setSects(p => p.map(s => s.id !== id ? s : { ...s, ...ch }));
  const updF = (secId, fId, ch) => setSects(p => p.map(s => s.id !== secId ? s : { ...s, fields: s.fields.map(f => f.id !== fId ? f : { ...f, ...ch }) }));
  const updCol = (secId, cId, ch) => setSects(p => p.map(s => s.id !== secId ? s : { ...s, tableCols: (s.tableCols || []).map(c => c.id !== cId ? c : { ...c, ...ch }) }));
  const removeField = (secId, fId) => setSects(p => p.map(s => s.id !== secId ? s : { ...s, fields: s.fields.filter(f => f.id !== fId) }));

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  // Detect drop position (before/after) based on mouse position relative to element
  const calcDropPosition = (e, el) => {
    const rect = el.getBoundingClientRect();
    // RTL: right side = "before" (start), left side = "after" (end)
    const midX = rect.left + rect.width / 2;
    return e.clientX > midX ? 'before' : 'after';
  };

  const insertAtPosition = (fields, targetFieldId, fieldToInsert, position) => {
    const idx = fields.findIndex(f => f.id === targetFieldId);
    if (idx < 0) return [...fields, fieldToInsert];
    const fs = [...fields];
    const insertIdx = position === 'after' ? idx + 1 : idx;
    fs.splice(insertIdx, 0, fieldToInsert);
    return fs;
  };

  const handleDrop = () => {
    if (!dragInfo || !dropTarget) { setDragInfo(null); setDropTarget(null); return; }
    if (dragInfo.type === 'section' && dropTarget.type === 'section' && dragInfo.secIdx !== dropTarget.secIdx) {
      setSects(p => { const a = [...p]; const [mv] = a.splice(dragInfo.secIdx, 1); a.splice(dropTarget.secIdx, 0, mv); return a; });
    }
    if (dragInfo.type === 'field') {
      const dstSec = dropTarget.type === 'field' ? dropTarget.secId : dropTarget.type === 'secEnd' ? dropTarget.secId : null;
      if (!dstSec) { setDragInfo(null); setDropTarget(null); return; }
      setSects(p => {
        const field = p.find(s => s.id === dragInfo.secId)?.fields.find(f => f.id === dragInfo.fieldId);
        if (!field) return p;
        let ns = p.map(s => s.id === dragInfo.secId ? { ...s, fields: s.fields.filter(f => f.id !== dragInfo.fieldId) } : s);
        ns = ns.map(s => {
          if (s.id !== dstSec) return s;
          if (dropTarget.type === 'field') return { ...s, fields: insertAtPosition(s.fields, dropTarget.fieldId, field, dropTarget.position || 'before') };
          return { ...s, fields: [...s.fields, field] };
        });
        return ns;
      });
    }
    if (dragInfo.type === 'newfield') {
      const dstSec = dropTarget.type === 'field' ? dropTarget.secId : dropTarget.type === 'secEnd' ? dropTarget.secId : null;
      if (!dstSec) { setDragInfo(null); setDropTarget(null); return; }
      const ft = dragInfo.fieldType;
      const typeDefaults = ft === 'text' ? { maxLength: 255 } : ft === 'textarea' ? { maxLength: 2000 } : ft === 'phone' ? { phoneFormat: 'local' } :
        (ft === 'select' || ft === 'multiselect') ? { options: [['1', 'אפשרות 1']], defaultValue: '', sortOrder: 'entry' } :
          ft === 'number' ? { numType: 'integer', decimalPlaces: 2 } : {};
      const nf = { id: 'cf' + Date.now(), label: 'שדה חדש', type: ft, visible: true, required: false, order: 999, isCustom: true, visibleProfiles: ['all'], ...typeDefaults };
      setSects(p => p.map(s => {
        if (s.id !== dstSec) return s;
        if (dropTarget.type === 'field') return { ...s, fields: insertAtPosition(s.fields, dropTarget.fieldId, nf, dropTarget.position || 'before') };
        return { ...s, fields: [...s.fields, nf] };
      }));
      setSelField({ secId: dstSec, fieldId: nf.id }); setSelSec(null); setSelCol(null);
    }
    if (dragInfo.type === 'col' && dropTarget.type === 'col' && dropTarget.secId === dragInfo.secId && dropTarget.colId !== dragInfo.colId) {
      setSects(p => p.map(s => {
        if (s.id !== dragInfo.secId) return s;
        const cols = [...s.tableCols]; const si = cols.findIndex(c => c.id === dragInfo.colId); const di = cols.findIndex(c => c.id === dropTarget.colId);
        if (si < 0 || di < 0) return s;
        const [mv] = cols.splice(si, 1); cols.splice(di, 0, mv);
        return { ...s, tableCols: cols };
      }));
    }
    setDragInfo(null); setDropTarget(null);
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const meta = {};
    meta._sections = sects.map((s, i) => ({ id: s.id, label: s.label, visible: s.visible !== false, order: i }));
    sects.forEach(sec => {
      meta[sec.id] = { fields: sec.fields.map((f, i) => ({ id: f.id, label: f.label, type: f.type, visible: f.visible, required: f.required, fieldWidth: f.fieldWidth, order: i, options: f.options, visibleProfiles: f.visibleProfiles, maxLength: f.maxLength, phoneFormat: f.phoneFormat, defaultValue: f.defaultValue, sortOrder: f.sortOrder, numType: f.numType, decimalPlaces: f.decimalPlaces, ...(f.isCustom ? { isCustom: true } : {}) })) };
      if (sec.tableCols) { meta['_tc_' + sec.id] = sec.tableCols.map((c, i) => ({ id: c.id, label: c.label, enabled: c.enabled, order: i })); }
    });
    saveFieldMeta({ ...allMeta, [moduleId]: meta });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const hiddenFields = useMemo(() => sects.flatMap(s => s.fields.filter(f => f.visible === false).map(f => ({ ...f, secId: s.id, secLabel: s.label }))), [sects]);

  // ── Field preview ───────────────────────────────────────────────────────
  const fieldPreview = (f) => {
    if (f.type === 'textarea') return <textarea disabled rows={2} className="sd-field-preview" />;
    if (f.type === 'select' || f.type === 'multiselect' || f.type === 'custom')
      return <div className="sd-field-preview" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{f.type === 'multiselect' ? '— בחירה מרובה —' : '—'}</span><span style={{ fontSize: 9 }}>▾</span></div>;
    if (f.type === 'checkbox')
      return <div style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" disabled /><span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span></div>;
    const typeMap = { number: 'number', date: 'date', email: 'email', phone: 'tel', url: 'url', price: 'number' };
    return <input disabled type={typeMap[f.type] || 'text'} className="sd-field-preview" />;
  };

  // ── Render Canvas ───────────────────────────────────────────────────────
  const renderCanvas = () => sects.map((sec, secIdx) => {
    const isSecDragging = dragInfo?.type === 'section' && dragInfo.secIdx === secIdx;
    const isSecDropping = dropTarget?.type === 'section' && dropTarget.secIdx === secIdx;
    const isSelected = selSec === sec.id && !selField && !selCol;
    const isExpanded = expanded[sec.id];

    return (
      <div key={sec.id} className={`sd-section${isSecDragging ? ' dragging' : ''}${sec.visible === false ? ' hidden' : ''}${isSecDropping ? ' drop-target' : ''}`}>
        <div
          draggable
          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragInfo({ type: 'section', secIdx }); setDropTarget(null); }}
          onDragOver={e => { e.preventDefault(); if (dragInfo?.type === 'section') setDropTarget({ type: 'section', secIdx }); }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(); }}
          onDragEnd={() => { setDragInfo(null); setDropTarget(null); }}
          onClick={() => { setSelSec(sec.id); setSelField(null); setSelCol(null); }}
          className={`sd-section-header${isSelected ? ' selected' : ''}${isExpanded ? ' expanded' : ''}`}
        >
          <span className="sd-drag-handle">⠿</span>
          <button className="sd-expand-btn" onClick={e => { e.stopPropagation(); setExpanded(p => ({ ...p, [sec.id]: !p[sec.id] })); }}>
            {isExpanded ? '▼' : '▶'}
          </button>
          <span className="sd-section-icon">{sec.icon?.startsWith('ti-') ? <i className={`ti ${sec.icon}`} aria-hidden="true" /> : sec.icon}</span>
          <span className="sd-section-label">{sec.label}</span>
          {sec.visible === false && <span className="badge badge-warning" style={{ fontSize: 10 }}>מוסתר</span>}
          <button className="sd-vis-btn" onClick={e => { e.stopPropagation(); updSec(sec.id, { visible: sec.visible === false }); }}
            title={sec.visible === false ? 'הצג חלק' : 'הסתר חלק'}>
            {sec.visible === false ? <i className="ti ti-eye-off" aria-hidden="true" /> : <i className="ti ti-eye" aria-hidden="true" />}
          </button>
        </div>

        {isExpanded && (
          <div className="sd-section-body">
            {/* Table columns */}
            {sec.tableCols && (
              <div>
                <div className="sd-cols-label"><Icon svg={ICONS.columns || ICONS.settings} size={12} />עמודות טבלה</div>
                <div className="sd-cols-wrap">
                  {sec.tableCols.map(col => {
                    const isSelC = selCol?.secId === sec.id && selCol?.colId === col.id;
                    const isDropC = dropTarget?.type === 'col' && dropTarget.secId === sec.id && dropTarget.colId === col.id;
                    return (
                      <div key={col.id}
                        draggable={!col.fixed}
                        onDragStart={e => { if (col.fixed) { e.preventDefault(); return; } e.dataTransfer.effectAllowed = 'move'; setDragInfo({ type: 'col', secId: sec.id, colId: col.id }); setDropTarget(null); }}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (dragInfo?.type === 'col') setDropTarget({ type: 'col', secId: sec.id, colId: col.id }); }}
                        onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(); }}
                        onDragEnd={() => { setDragInfo(null); setDropTarget(null); }}
                        onClick={e => { e.stopPropagation(); setSelCol({ secId: sec.id, colId: col.id }); setSelSec(null); setSelField(null); }}
                        className={`sd-col-chip${col.fixed ? ' fixed' : ''}${isSelC ? ' selected' : ''}${isDropC ? ' drop-target' : ''}${col.enabled === false ? ' disabled' : ''}`}
                      >
                        {!col.fixed && <span className="sd-drag-handle" style={{ fontSize: 11 }}>⠿</span>}
                        <span className="sd-col-label">{col.label}</span>
                        {col.fixed && <span className="sd-fixed-badge">קבוע</span>}
                        {!col.fixed && (
                          <button className="sd-vis-btn" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); updCol(sec.id, col.id, { enabled: col.enabled === false }); }}>
                            {col.enabled === false ? <i className="ti ti-eye-off" aria-hidden="true" /> : <i className="ti ti-eye" aria-hidden="true" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fields grid */}
            <div
              onDragOver={e => { e.preventDefault(); if (dragInfo && (dragInfo.type === 'field' || dragInfo.type === 'newfield')) setDropTarget({ type: 'secEnd', secId: sec.id }); }}
              onDrop={e => { e.preventDefault(); handleDrop(); }}
              className={`sd-fields-grid${sec.cols === 1 ? ' cols-1' : ''}${dropTarget?.type === 'secEnd' && dropTarget.secId === sec.id ? ' drop-active' : ''}`}
            >
              {sec.fields.map(f => {
                const isSel = selField?.secId === sec.id && selField?.fieldId === f.id;
                const isDrop = dropTarget?.type === 'field' && dropTarget.secId === sec.id && dropTarget.fieldId === f.id;
                // 2-column grid: full width or single column
                const isFullWidth = (sec.fullWidth || []).includes(f.id) || f.fieldWidth === 'full' || sec.cols === 1;
                const fwGC = isFullWidth ? '1/-1' : undefined;
                return (
                  <div key={f.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragInfo({ type: 'field', secId: sec.id, fieldId: f.id }); setDropTarget(null); }}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (dragInfo && (dragInfo.type === 'field' || dragInfo.type === 'newfield')) { const pos = calcDropPosition(e, e.currentTarget); setDropTarget({ type: 'field', secId: sec.id, fieldId: f.id, position: pos }); } }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(); }}
                    onDragEnd={() => { setDragInfo(null); setDropTarget(null); }}
                    onClick={e => { e.stopPropagation(); setSelField({ secId: sec.id, fieldId: f.id }); setSelSec(null); setSelCol(null); }}
                    className={`sd-field${f.visible === false ? ' hidden' : ''}${isDrop && dropTarget?.position === 'before' ? ' drop-before' : ''}${isDrop && dropTarget?.position === 'after' ? ' drop-after' : ''}`}
                    style={{ gridColumn: fwGC }}
                  >
                    <div className={`sd-field-inner${isSel ? ' selected' : ''}`}>
                      <div className="sd-drop-arrow" />
                      <div className="sd-field-top">
                        <span className="sd-drag-handle" style={{ fontSize: 10 }}>⠿</span>
                        <span className="sd-field-name">
                          {f.label}
                          {f.required && <span className="sd-field-required"> *</span>}
                          {f.isCustom && <span className="sd-field-custom-badge"><i className="ti ti-star" aria-hidden="true" /></span>}
                        </span>
                        <span className="sd-type-badge">{(() => { const ic = TYPE_ICONS[f.type] || 'Aa'; return ic.startsWith('ti-') ? <i className={`ti ${ic}`} aria-hidden="true" /> : ic; })()}</span>
                        <button className="sd-vis-btn" style={{ fontSize: 9 }} onClick={e => { e.stopPropagation(); updF(sec.id, f.id, { visible: f.visible === false }); }}>
                          {f.visible === false ? <i className="ti ti-eye-off" aria-hidden="true" /> : <i className="ti ti-eye" aria-hidden="true" />}
                        </button>
                      </div>
                      {fieldPreview(f)}
                    </div>
                  </div>
                );
              })}
              {sec.fields.length === 0 && !sec.tableCols && <div className="sd-field-empty">גרור שדה לכאן</div>}
            </div>
          </div>
        )}
      </div>
    );
  });

  // ── Render Sidebar ──────────────────────────────────────────────────────
  const renderSidebar = () => (
    <div className="sd-sidebar">
      {/* Field editor */}
      {curField ? (
        <div className="sd-sidebar-card">
          <div className="sd-sidebar-title">עריכת שדה</div>
          <div className="sd-sidebar-field">
            <label>שם השדה</label>
            <input type="text" value={curField.label} onChange={e => updF(selField.secId, selField.fieldId, { label: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            <label className="sd-sidebar-check">
              <input type="checkbox" checked={!!curField.required} onChange={e => updF(selField.secId, selField.fieldId, { required: e.target.checked })} /> שדה חובה
            </label>
            <label className="sd-sidebar-check">
              <input type="checkbox" checked={curField.visible !== false} onChange={e => updF(selField.secId, selField.fieldId, { visible: e.target.checked })} /> גלוי בטופס
            </label>
          </div>

          <div className="sd-sidebar-divider">
            <div className="sd-sidebar-subtitle">גלוי לפרופילים</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['all', 'כולם'], ['admin', 'מנהל'], ['sales', 'מכירות'], ['finance', 'כספים'], ['support', 'שירות לקוחות']].map(([k, lbl]) => {
                const vp = curField.visibleProfiles || ['all'];
                const chk = k === 'all' ? vp.includes('all') || vp.length === 0 : vp.includes(k);
                return (
                  <label key={k} className={`sd-profile-check${chk ? ' active' : ''}`}>
                    <input type="checkbox" checked={chk} onChange={e => {
                      const cur = curField.visibleProfiles || ['all'];
                      let next;
                      if (k === 'all') { next = ['all']; }
                      else { const without = cur.filter(x => x !== 'all' && x !== k); next = e.target.checked ? [...without, k] : without; if (!next.length) next = ['all']; }
                      updF(selField.secId, selField.fieldId, { visibleProfiles: next });
                    }} /> {lbl}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="sd-sidebar-divider">
            <div className="sd-sidebar-subtitle">רוחב שדה</div>
            <div className="sd-width-grid">
              {[['auto', 'עמודה אחת'], ['full', 'שורה מלאה']].map(([v, lbl]) => (
                <button key={v} className={`sd-width-btn${(curField.fieldWidth || 'auto') === v ? ' active' : ''}`}
                  onClick={() => updF(selField.secId, selField.fieldId, { fieldWidth: v === 'auto' ? undefined : v })}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Type-specific settings */}
          {curField.type === 'text' && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-field">
                <label>אורך מקסימלי (עד 255)</label>
                <input type="number" min={1} max={255} value={curField.maxLength || 255} onChange={e => updF(selField.secId, selField.fieldId, { maxLength: Math.min(255, Math.max(1, +e.target.value || 255)) })} />
              </div>
            </div>
          )}
          {curField.type === 'textarea' && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-field">
                <label>אורך מקסימלי (עד 2000)</label>
                <input type="number" min={1} max={2000} value={curField.maxLength || 2000} onChange={e => updF(selField.secId, selField.fieldId, { maxLength: Math.min(2000, Math.max(1, +e.target.value || 2000)) })} />
              </div>
            </div>
          )}
          {curField.type === 'phone' && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-field">
                <label>פורמט טלפון</label>
                <select value={curField.phoneFormat || 'local'} onChange={e => updF(selField.secId, selField.fieldId, { phoneFormat: e.target.value })}>
                  <option value="local">מקומי (05x-xxxxxxx)</option>
                  <option value="international">בינלאומי (+xxx...)</option>
                </select>
              </div>
            </div>
          )}
          {curField.type === 'number' && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-field">
                <label>סוג מספר</label>
                <select value={curField.numType || 'integer'} onChange={e => updF(selField.secId, selField.fieldId, { numType: e.target.value })}>
                  <option value="integer">מספר שלם</option>
                  <option value="decimal">עשרוני</option>
                </select>
              </div>
              {curField.numType === 'decimal' && (
                <div className="sd-sidebar-field" style={{ marginTop: 6 }}>
                  <label>ספרות אחרי הנקודה</label>
                  <input type="number" min={0} max={10} value={curField.decimalPlaces ?? 2} onChange={e => updF(selField.secId, selField.fieldId, { decimalPlaces: +e.target.value })} />
                </div>
              )}
            </div>
          )}
          {(curField.type === 'select' || curField.type === 'multiselect') && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-subtitle">ערכי הרשימה</div>
              {(curField.options || []).map(([k, v], oi) => (
                <div key={oi} className="sd-option-row">
                  <input type="text" className="code-input" value={k} placeholder="קוד" onChange={e => { const o = [...(curField.options || [])]; o[oi] = [e.target.value, v]; updF(selField.secId, selField.fieldId, { options: o }); }} />
                  <input type="text" value={v} placeholder="תווית" style={{ flex: 1 }} onChange={e => { const o = [...(curField.options || [])]; o[oi] = [k, e.target.value]; updF(selField.secId, selField.fieldId, { options: o }); }} />
                  <button className="sd-remove-btn" onClick={() => updF(selField.secId, selField.fieldId, { options: (curField.options || []).filter((_, i) => i !== oi) })} aria-label="הסר ערך"><i className="ti ti-x" aria-hidden="true" /></button>
                </div>
              ))}
              <button className="sd-add-option-btn" onClick={() => updF(selField.secId, selField.fieldId, { options: [...(curField.options || []), ['', '']] })}>
                + הוסף ערך
              </button>
              {(curField.options || []).length > 0 && (
                <div className="sd-sidebar-field">
                  <label>ברירת מחדל</label>
                  <select value={curField.defaultValue || ''} onChange={e => updF(selField.secId, selField.fieldId, { defaultValue: e.target.value })}>
                    <option value="">— ללא —</option>
                    {(curField.options || []).map(([kk, vv]) => <option key={kk} value={kk}>{vv}</option>)}
                  </select>
                </div>
              )}
              <div className="sd-sidebar-field">
                <label>סדר הצגה</label>
                <select value={curField.sortOrder || 'entry'} onChange={e => updF(selField.secId, selField.fieldId, { sortOrder: e.target.value })}>
                  <option value="entry">לפי סדר הזנה</option>
                  <option value="alpha">לפי א-ב</option>
                </select>
              </div>
            </div>
          )}

          {curField.isCustom && (
            <button className="sd-delete-field-btn" onClick={() => { removeField(selField.secId, selField.fieldId); setSelField(null); }}>
              הסר שדה מותאם
            </button>
          )}
        </div>
      ) : curCol ? (
        <div className="sd-sidebar-card">
          <div className="sd-sidebar-title">עריכת עמודה</div>
          <div className="sd-sidebar-field">
            <label>שם העמודה</label>
            <input type="text" value={curCol.label} onChange={e => updCol(selCol.secId, selCol.colId, { label: e.target.value })} />
          </div>
          {!curCol.fixed ? (
            <label className="sd-sidebar-check">
              <input type="checkbox" checked={curCol.enabled !== false} onChange={e => updCol(selCol.secId, selCol.colId, { enabled: e.target.checked })} /> הצג עמודה
            </label>
          ) : (
            <div className="badge badge-accent" style={{ fontSize: 10, marginTop: 4 }}>עמודה קבועה — לא ניתן להסתירה</div>
          )}
        </div>
      ) : curSec ? (
        <div className="sd-sidebar-card">
          <div className="sd-sidebar-title">עריכת חלק</div>
          <div className="sd-sidebar-field">
            <label>שם החלק</label>
            <input type="text" value={curSec.label} onChange={e => updSec(curSec.id, { label: e.target.value })} />
          </div>
          <label className="sd-sidebar-check">
            <input type="checkbox" checked={curSec.visible !== false} onChange={e => updSec(curSec.id, { visible: e.target.checked })} /> הצג חלק זה
          </label>
        </div>
      ) : (
        <div className="sd-sidebar-card sd-sidebar-empty">
          <div className="sd-sidebar-empty-icon"><Icon svg={ICONS.edit || ICONS.settings} size={28} /></div>
          <div>לחץ על שדה, עמודה</div>
          <div>או חלק לעריכה</div>
        </div>
      )}

      {/* Hidden fields */}
      {hiddenFields.length > 0 && (
        <div className="sd-sidebar-card">
          <div className="sd-sidebar-subtitle">שדות מוסתרים ({hiddenFields.length})</div>
          {hiddenFields.map(f => (
            <div key={f.id}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragInfo({ type: 'field', secId: f.secId, fieldId: f.id }); }}
              onDragEnd={() => { setDragInfo(null); setDropTarget(null); }}
              className="sd-hidden-item"
            >
              <span className="sd-type-badge">{(() => { const ic = TYPE_ICONS[f.type] || 'Aa'; return ic.startsWith('ti-') ? <i className={`ti ${ic}`} aria-hidden="true" /> : ic; })()}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{f.secLabel}</span>
            </div>
          ))}
        </div>
      )}

      {/* New field palette */}
      <div className="sd-sidebar-card">
        <div className="sd-sidebar-subtitle">גרור סוג שדה להוספה</div>
        <div className="sd-palette-grid">
          {PALETTE.map(p => (
            <div key={p.type}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; setDragInfo({ type: 'newfield', fieldType: p.type }); }}
              onDragEnd={() => { setDragInfo(null); setDropTarget(null); }}
              className="sd-palette-item"
              onMouseEnter={e => e.currentTarget.style.borderColor = p.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span className="sd-palette-icon" style={{ color: p.color }}>{p.icon?.startsWith('ti-') ? <i className={`ti ${p.icon}`} aria-hidden="true" /> : p.icon}</span>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 1080, maxHeight: '92vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>עיצוב מסך — {reg.label}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="sd-hints">
            <span className="sd-hint">⠿ גרור שדות לשינוי מיקום</span>
            <span className="sd-hint">⠿ גרור עמודות טבלה לשינוי סדר</span>
            <span className="sd-hint">לחץ לעריכה</span>
          </div>

          <div className="sd-layout">
            <div className="sd-canvas">{renderCanvas()}</div>
            {renderSidebar()}
          </div>

          <div className="modal-footer" style={{ alignItems: 'center' }}>
            {saved && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', flex: 1 }}>ההגדרות נשמרו בהצלחה</span>}
            <button type="button" className="btn btn-primary" onClick={handleSave}>שמור הגדרות</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setSects(initSects()); setSelSec(null); setSelField(null); setSelCol(null); }}>איפוס</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>סגור</button>
          </div>
        </div>
      </div>
    </div>
  );
}
