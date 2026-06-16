import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Icon, ICONS } from '../../utils/icons';
import useAuthStore from '../../store/authStore';
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
          { id: 'owner', label: 'בעלי רשומה הצעת מחיר', type: 'custom' },
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
  deals: {
    label: 'עסקאות',
    icon: 'ti-currency-shekel',
    sections: [
      {
        id: 'deal_info', label: 'פרטי עסקה', icon: 'ti-briefcase', cols: 2,
        fullWidth: [],
        fields: [
          { id: 'deal_name', label: 'שם עסקה', type: 'text', required: true },
          { id: 'customer_id', label: 'לקוח', type: 'custom' },
          { id: 'contact_id', label: 'איש קשר', type: 'custom' },
          { id: 'deal_type', label: 'סוג עסקה', type: 'select', options: [['חדשה', 'חדשה'], ['חידוש', 'חידוש'], ['הוספה', 'הוספה']] },
          { id: 'stage', label: 'שלב עסקה', type: 'select', showProbability: true, options: [['תחילת תהליך', 'תחילת תהליך', 10], ['צרכים', 'הבנת צרכים', 20], ['גיבוש', 'גיבוש הצעה', 30], ['נשלחה', 'הצעה נשלחה ללקוח', 40], ['משא ומתן', 'משא ומתן', 50], ['אפיון', 'אפיון', 60], ['פיילוט', 'פיילוט', 70], ['סגירה', 'לקראת סגירה', 90], ['חתומה', 'עסקה חתומה', 100], ['הפסד', 'סגירה-הפסד', 0]] },
          { id: 'priority', label: 'עדיפות', type: 'select', options: [['1', '1 — נמוכה'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 — גבוהה']] },
          { id: 'owner', label: 'בעלי רשומה', type: 'custom' },
        ],
      },
      {
        id: 'deal_amounts', label: 'סכומים ותאריכים', icon: 'ti-calendar', cols: 2,
        fullWidth: [],
        fields: [
          { id: 'expected_one_time', label: 'חד"פ צפוי (₪)', type: 'number' },
          { id: 'expected_recurring', label: 'שוטף צפוי (₪)', type: 'number' },
          { id: 'expected_close_date', label: 'סגירה צפויה', type: 'date' },
          { id: 'actual_close_date', label: 'תאריך סגירה בפועל', type: 'date' },
        ],
      },
      {
        id: 'deal_notes', label: 'הערות', icon: 'ti-notes', cols: 1,
        fullWidth: ['notes'],
        fields: [
          { id: 'notes', label: 'הערות', type: 'textarea', fieldWidth: 'full' },
        ],
      },
    ],
  },
  contacts: {
    label: 'אנשי קשר',
    icon: 'ti-address-book',
    sections: [
      {
        id: 'info', label: 'פרטים אישיים', icon: 'ti-user', cols: 2,
        fullWidth: [],
        fields: [
          { id: 'first_name', label: 'שם פרטי', type: 'text', required: true },
          { id: 'last_name', label: 'שם משפחה', type: 'text' },
          { id: 'customer_id', label: 'לקוח', type: 'custom' },
          { id: 'site_id', label: 'אתר', type: 'custom' },
          { id: 'role', label: 'תפקיד', type: 'text' },
          { id: 'department', label: 'מחלקה', type: 'text' },
          { id: 'status', label: 'סטטוס', type: 'select', options: [['active', 'פעיל'], ['inactive', 'לא פעיל']] },
        ],
      },
      {
        id: 'contact_info', label: 'פרטי התקשרות', icon: 'ti-phone', cols: 2,
        fullWidth: [],
        fields: [
          { id: 'email', label: 'אי-מייל', type: 'email' },
          { id: 'mobile', label: 'נייד', type: 'phone' },
          { id: 'birth_date', label: 'תאריך לידה', type: 'date' },
          { id: 'owner', label: 'בעלי רשומה', type: 'custom' },
        ],
      },
      {
        id: 'flags', label: 'סימולים', icon: 'ti-star', cols: 2,
        fullWidth: [],
        fields: [
          { id: 'is_primary', label: 'איש קשר ראשי', type: 'checkbox' },
          { id: 'is_vip', label: 'VIP', type: 'checkbox' },
        ],
      },
      {
        id: 'notes_sec', label: 'הערות', icon: 'ti-notes', cols: 1,
        fullWidth: ['notes'],
        fields: [
          { id: 'notes', label: 'הערות', type: 'textarea', fieldWidth: 'full' },
        ],
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
  { type: 'text',        icon: 'Aa',              label: 'שורת טקסט',    color: 'var(--accent)' },
  { type: 'textarea',    icon: '≡',               label: 'טקסט ארוך',    color: 'var(--accent)' },
  { type: 'number',      icon: '#',               label: 'מספר',          color: 'var(--success)' },
  { type: 'bigint',      icon: '##',              label: 'מספר ארוך',     color: '#6366F1' },
  { type: 'currency',    icon: '₪',               label: 'מטבע',          color: '#3B82F6' },
  { type: 'percent',     icon: '%',               label: 'אחוז',          color: '#8B5CF6' },
  { type: 'date',        icon: 'ti-calendar',     label: 'תאריך',         color: 'var(--warning)' },
  { type: 'datetime',    icon: 'ti-calendar-time',label: 'תאריך ושעה',   color: '#F97316' },
  { type: 'select',      icon: '▾',               label: 'רשימת בחירה',  color: 'var(--info)' },
  { type: 'multiselect', icon: '☰',               label: 'בחירה מרובה',  color: '#6366F1' },
  { type: 'radio',       icon: '◉',               label: 'לחצן רדיו',    color: '#EC4899' },
  { type: 'checkbox',    icon: '☑',               label: 'תיבת סימון',   color: '#EC4899' },
  { type: 'email',       icon: '@',               label: 'דוא"ל',         color: 'var(--danger)' },
  { type: 'phone',       icon: '☎',               label: 'טלפון',         color: 'var(--warning)' },
  { type: 'url',         icon: 'ti-link',         label: 'כתובת URL',    color: '#14B8A6' },
  { type: 'address',     icon: 'ti-map-pin',      label: 'כתובת',         color: '#F97316' },
  { type: 'user',        icon: 'ti-user',         label: 'משתמש',         color: 'var(--accent)' },
  { type: 'autonumber',  icon: 'ti-bolt',         label: 'מספר אוטומטי', color: '#10B981' },
  { type: 'file',        icon: 'ti-paperclip',    label: 'קובץ',          color: '#6B7280' },
  { type: 'image',       icon: 'ti-photo',        label: 'תמונה',         color: '#14B8A6' },
  { type: 'subform',     icon: 'ti-table',        label: 'תת טופס',       color: '#7C3AED' },
];

const TYPE_ICONS = {
  text: 'Aa', textarea: '≡', email: '@', phone: '☎',
  select: '▾', multiselect: '☰', radio: '◉',
  date: 'ti-calendar', datetime: 'ti-calendar-time',
  number: '#', bigint: '##', currency: '₪', percent: '%',
  checkbox: '☑', url: 'ti-link',
  address: 'ti-map-pin', user: 'ti-user',
  autonumber: 'ti-bolt', file: 'ti-paperclip', image: 'ti-photo',
  subform: 'ti-table',
  custom: '⚙', price: '#', lookup: 'ti-search',
};

// ── buildScreenMetaAccessors — pure function, builds accessor API from raw modMeta ──
function buildScreenMetaAccessors(moduleId, modMeta, currentProfileId, isAdmin) {
  const reg = SCREEN_REGISTRY[moduleId];
  const empty = { getSecs: () => [], gl: () => '', gv: () => true, getTableCols: () => [], getCustomFields: () => [], getFieldOrder: () => [], modMeta: {} };
  if (!reg) return empty;

  // Returns true if the field is visible to the current user based on visibleProfiles
  const profileAllowed = (visibleProfiles) => {
    if (isAdmin) return true; // admins always see all fields
    if (!visibleProfiles || visibleProfiles.length === 0 || visibleProfiles.includes('all')) return true;
    if (!currentProfileId) return true; // users with no profile see all
    return visibleProfiles.includes(currentProfileId);
  };

  const getF = (secId, fId) => (modMeta[secId]?.fields || []).find(f => f.id === fId) || null;

  const getSecs = () => {
    const storedOrder = modMeta._sections;
    const base = reg.sections.map(s => {
      const ss = (storedOrder || []).find(x => x.id === s.id);
      return { ...s, label: ss?.label ?? s.label, visible: ss?.visible !== false };
    });
    const customSecs = (storedOrder || [])
      .filter(s => s.isCustom)
      .map(s => ({ id: s.id, label: s.label, icon: s.icon || 'ti-layout-list', visible: s.visible !== false, isCustom: true, cols: 2, fullWidth: [], fields: [] }));
    const all = [...base, ...customSecs];
    if (!storedOrder) return all;
    const ordered = storedOrder.map(ss => all.find(s => s.id === ss.id)).filter(Boolean);
    const remaining = all.filter(s => !storedOrder.find(ss => ss.id === s.id));
    return [...ordered, ...remaining];
  };

  return {
    modMeta,
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
    getCustomFields: (secId) => {
      const sec = reg.sections.find(s => s.id === secId);
      if (!sec) {
        return (modMeta[secId]?.fields || [])
          .filter(f => f.visible !== false && profileAllowed(f.visibleProfiles))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      return (modMeta[secId]?.fields || [])
        .filter(f => f.isCustom && f.visible !== false && profileAllowed(f.visibleProfiles))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    getFieldOrder: (secId) => {
      const sec = reg.sections.find(s => s.id === secId);
      if (!sec) {
        return (modMeta[secId]?.fields || [])
          .filter(f => f.visible !== false && profileAllowed(f.visibleProfiles))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      const stored = modMeta[secId]?.fields || [];
      const baseFields = sec.fields.map((f, i) => {
        const m = stored.find(sf => sf.id === f.id);
        return { id: f.id, type: f.type, label: m?.label ?? f.label, order: m?.order ?? i, visible: m?.visible !== false, isCustom: false,
          fieldWidth: m?.fieldWidth ?? f.fieldWidth, visibleProfiles: m?.visibleProfiles ?? f.visibleProfiles };
      });
      const customFields = stored.filter(f => f.isCustom && !sec.fields.find(sf => sf.id === f.id)).map(f => ({
        id: f.id, type: f.type, label: f.label, order: f.order ?? 999, visible: f.visible !== false, isCustom: true,
        fieldWidth: f.fieldWidth, options: f.options, maxLength: f.maxLength, numType: f.numType, decimalPlaces: f.decimalPlaces,
        visibleProfiles: f.visibleProfiles,
      }));
      return [...baseFields, ...customFields]
        .sort((a, b) => a.order - b.order)
        .filter(f => f.visible && profileAllowed(f.visibleProfiles));
    },
  };
}

// ── useScreenMeta hook — loads from DB (tenant-shared), falls back to localStorage ──
export function useScreenMeta(moduleId) {
  const authUser = useAuthStore(s => s.user);
  const { data: dbMeta } = useQuery({
    queryKey: ['screen-meta', moduleId],
    queryFn: () => api.get(`/api/screen-meta/${moduleId}`).catch(() => null),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return useMemo(() => {
    const localMeta = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.[moduleId] || {}; } catch { return {}; } })();
    const modMeta = (dbMeta && Object.keys(dbMeta).length > 0) ? dbMeta : localMeta;
    const profileId = authUser?.profileId || authUser?.profile_id || null;
    const isAdmin = authUser?.userType === 'admin' || authUser?.userType === 'superAdmin' || authUser?.user_type === 'admin' || authUser?.user_type === 'superAdmin';
    return buildScreenMetaAccessors(moduleId, modMeta, profileId, isAdmin);
  }, [moduleId, dbMeta, authUser]);
}

// ── ScreenDesignerModal ─────────────────────────────────────────────────────
// modMeta: raw meta object from useScreenMeta (DB or localStorage)
// onSaved: called after successful save so parent can refresh
export default function ScreenDesignerModal({ moduleId, modMeta: initModMeta, onClose, onSaved }) {
  const reg = SCREEN_REGISTRY[moduleId];
  if (!reg) return null;

  const modMeta = initModMeta || {};
  const getMeta = (secId, fId) => (modMeta[secId]?.fields || []).find(f => f.id === fId) || null;

  const initSects = () => {
    const storedSecOrder = modMeta._sections;
    const base = reg.sections.map(sec => {
      const storedSec = (storedSecOrder || []).find(s => s.id === sec.id);
      const baseFields = sec.fields.map((f, i) => {
        const m = getMeta(sec.id, f.id);
        return { ...f, label: m?.label ?? f.label, visible: m?.visible !== false, required: m?.required !== undefined ? m.required : !!f.required, fieldWidth: m?.fieldWidth ?? f.fieldWidth, order: m?.order ?? i, options: m?.options ?? f.options, visibleProfiles: m?.visibleProfiles ?? f.visibleProfiles, maxLength: m?.maxLength ?? f.maxLength, phoneFormat: m?.phoneFormat ?? f.phoneFormat, defaultValue: m?.defaultValue ?? f.defaultValue, sortOrder: m?.sortOrder ?? f.sortOrder, numType: m?.numType ?? f.numType, decimalPlaces: m?.decimalPlaces ?? f.decimalPlaces, currencyCode: m?.currencyCode ?? f.currencyCode, autoPrefix: m?.autoPrefix ?? f.autoPrefix, autoDigits: m?.autoDigits ?? f.autoDigits, subformFields: m?.subformFields ?? f.subformFields };
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
    // Load custom sections from stored meta
    const customSections = (storedSecOrder || [])
      .filter(s => s.isCustom)
      .map(s => ({
        id: s.id, label: s.label, icon: s.icon || 'ti-layout-list',
        cols: s.cols || 2, fullWidth: [], isCustom: true,
        visible: s.visible !== false,
        fields: (modMeta[s.id]?.fields || []),
      }));
    const all = [...base, ...customSections];
    if (!storedSecOrder) return all;
    const ordered = storedSecOrder.map(ss => all.find(s => s.id === ss.id)).filter(Boolean);
    const remaining = all.filter(s => !storedSecOrder.find(ss => ss.id === s.id));
    return [...ordered, ...remaining];
  };

  const [sects, setSects] = useState(initSects);
  const [selSec, setSelSec] = useState(null);
  const [selField, setSelField] = useState(null);
  const [selCol, setSelCol] = useState(null);
  const [expanded, setExpanded] = useState(() => Object.fromEntries(initSects().map(s => [s.id, true])));
  const [dragInfo, setDragInfo] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [saved, setSaved] = useState(false);

  const addCustomSection = () => {
    const id = 'cs_' + Date.now();
    const newSec = { id, label: 'אזור חדש', icon: 'ti-layout-list', cols: 2, fullWidth: [], fields: [], visible: true, isCustom: true };
    setSects(p => [...p, newSec]);
    setSelSec(id); setSelField(null); setSelCol(null);
    setExpanded(p => ({ ...p, [id]: true }));
  };

  const removeCustomSection = (secId) => {
    if (!window.confirm('למחוק אזור זה ואת כל השדות בו?')) return;
    setSects(p => p.filter(s => s.id !== secId));
    if (selSec === secId) { setSelSec(null); setSelField(null); }
  };

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
      const typeDefaults =
        ft === 'text'        ? { maxLength: 255 } :
        ft === 'textarea'    ? { maxLength: 2000 } :
        ft === 'phone'       ? { phoneFormat: 'local' } :
        (ft === 'select' || ft === 'multiselect' || ft === 'radio') ? { options: [['אפשרות 1', 'אפשרות 1']], defaultValue: '', sortOrder: 'entry' } :
        ft === 'number'      ? { numType: 'integer', decimalPlaces: 2 } :
        ft === 'currency'    ? { currencyCode: 'ILS' } :
        ft === 'percent'     ? { decimalPlaces: 0 } :
        ft === 'autonumber'  ? { autoPrefix: '', autoDigits: 4 } :
        ft === 'subform'     ? { subformFields: [{ id: 'col_' + Date.now(), label: 'עמודה 1', type: 'text' }] } :
        {};
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
  const handleResetToDefault = async () => {
    if (!window.confirm('האם לאפס את עורך השדות לברירת המחדל?\n\nפעולה זו תמחק את כל ההתאמות האישיות (שמות, סדר, שדות מותאמים) במסך זה בלבד.')) return;
    // Build clean default state from registry (no stored meta)
    const defaultSects = reg.sections.map((sec, si) => ({
      ...sec,
      label: sec.label,
      visible: true,
      fields: sec.fields.map((f, fi) => ({ ...f, label: f.label, visible: true, required: !!f.required, order: fi, fieldWidth: f.fieldWidth })),
      tableCols: sec.tableCols?.map((c, ci) => ({ ...c, enabled: c.enabled !== false, order: ci })),
    }));
    setSects(defaultSects);
    setSelSec(null);
    setSelField(null);
    setSelCol(null);
    // Persist empty meta (= defaults) to both localStorage and DB
    const allMeta = loadFieldMeta();
    saveFieldMeta({ ...allMeta, [moduleId]: {} });
    try {
      await api.put(`/api/screen-meta/${moduleId}`, {});
      if (onSaved) onSaved();
    } catch (e) {
      console.warn('screen-meta: reset failed on server', e);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSave = async () => {
    const meta = {};
    meta._sections = sects.map((s, i) => ({ id: s.id, label: s.label, visible: s.visible !== false, order: i, ...(s.isCustom ? { isCustom: true, icon: s.icon } : {}) }));
    sects.forEach(sec => {
      meta[sec.id] = { fields: sec.fields.map((f, i) => ({ id: f.id, label: f.label, type: f.type, visible: f.visible, required: f.required, fieldWidth: f.fieldWidth, order: i, options: f.options, visibleProfiles: f.visibleProfiles, maxLength: f.maxLength, phoneFormat: f.phoneFormat, defaultValue: f.defaultValue, sortOrder: f.sortOrder, numType: f.numType, decimalPlaces: f.decimalPlaces, currencyCode: f.currencyCode, autoPrefix: f.autoPrefix, autoDigits: f.autoDigits, subformFields: f.subformFields, ...(f.isCustom ? { isCustom: true } : {}) })) };
      if (sec.tableCols) { meta['_tc_' + sec.id] = sec.tableCols.map((c, i) => ({ id: c.id, label: c.label, enabled: c.enabled, order: i })); }
    });
    // Save to localStorage (immediate local effect)
    const allMeta = loadFieldMeta();
    saveFieldMeta({ ...allMeta, [moduleId]: meta });
    // Save to DB (tenant-shared, persists across users/devices)
    try {
      await api.put(`/api/screen-meta/${moduleId}`, meta);
      if (onSaved) onSaved();
    } catch (e) {
      console.warn('screen-meta: failed to save to server', e);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const hiddenFields = useMemo(() => sects.flatMap(s => s.fields.filter(f => f.visible === false).map(f => ({ ...f, secId: s.id, secLabel: s.label }))), [sects]);

  // ── Field preview ───────────────────────────────────────────────────────
  const fieldPreview = (f) => {
    if (f.type === 'textarea') return <textarea disabled rows={2} className="sd-field-preview" />;
    if (f.type === 'select' || f.type === 'multiselect' || f.type === 'custom')
      return <div className="sd-field-preview" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 11 }}>{f.type === 'multiselect' ? '— בחירה מרובה —' : '—'}</span><span style={{ fontSize: 9 }}>▾</span></div>;
    if (f.type === 'radio') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '3px 0' }}>
        {(f.options?.slice(0, 2) || [['', 'אפשרות 1'], ['', 'אפשרות 2']]).map(([, v], i) => (
          <label key={i} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11, color: 'var(--text-3)' }}><input type="radio" disabled />{v || `אפשרות ${i + 1}`}</label>
        ))}
      </div>
    );
    if (f.type === 'checkbox')
      return <div style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" disabled /><span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span></div>;
    if (f.type === 'currency') {
      const sym = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' }[f.currencyCode || 'ILS'] || '₪';
      return <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ fontSize: 11, color: 'var(--text-3)', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-elevated)' }}>{sym}</span><input disabled type="number" className="sd-field-preview" style={{ flex: 1 }} /></div>;
    }
    if (f.type === 'percent') return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input disabled type="number" className="sd-field-preview" style={{ flex: 1 }} /><span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>%</span></div>
    );
    if (f.type === 'bigint') return <input disabled type="number" className="sd-field-preview" />;
    if (f.type === 'datetime') return <input disabled type="datetime-local" className="sd-field-preview" />;
    if (f.type === 'autonumber') return <input disabled type="text" className="sd-field-preview" value={`${f.autoPrefix || ''}${'0'.repeat(Math.max(0, (f.autoDigits || 4) - 1))}1`} readOnly />;
    if (f.type === 'user') return (
      <div className="sd-field-preview" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}><i className="ti ti-user" style={{ fontSize: 13 }} />— בחר משתמש —</span>
        <span style={{ fontSize: 9 }}>▾</span>
      </div>
    );
    if (f.type === 'file') return (
      <div style={{ padding: '7px 10px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-elevated)' }}>
        <i className="ti ti-paperclip" style={{ marginLeft: 4 }} />בחר קובץ
      </div>
    );
    if (f.type === 'image') return (
      <div style={{ padding: '7px 10px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-elevated)' }}>
        <i className="ti ti-photo" style={{ marginLeft: 4 }} />העלה תמונה
      </div>
    );
    if (f.type === 'address') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <input disabled className="sd-field-preview" placeholder="רחוב ומספר" style={{ fontSize: 11 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <input disabled className="sd-field-preview" placeholder="עיר" style={{ fontSize: 11 }} />
          <input disabled className="sd-field-preview" placeholder="מיקוד" style={{ fontSize: 11 }} />
        </div>
      </div>
    );
    if (f.type === 'subform') {
      const cols = f.subformFields || [{ label: 'עמודה' }];
      const visibleCols = cols.slice(0, 3);
      return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', fontSize: 11 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleCols.length}, 1fr)`, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            {visibleCols.map((col, i) => (
              <div key={i} style={{ padding: '3px 6px', fontWeight: 600, color: 'var(--text-2)', borderRight: i > 0 ? '1px solid var(--border)' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.label}</div>
            ))}
          </div>
          <div style={{ padding: '4px 6px', color: 'var(--text-3)', textAlign: 'center', fontStyle: 'italic' }}>+ הוסף שורה</div>
        </div>
      );
    }
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
          <span className="sd-section-icon-wrap">{sec.icon?.startsWith('ti-') ? <i className={`ti ${sec.icon}`} aria-hidden="true" /> : sec.icon}</span>
          <span className="sd-section-label">{sec.label}</span>
          {sec.visible === false && <span className="badge badge-warning" style={{ fontSize: 10 }}>מוסתר</span>}
          <button className="sd-vis-btn" onClick={e => { e.stopPropagation(); updSec(sec.id, { visible: sec.visible === false }); }}
            title={sec.visible === false ? 'הצג חלק' : 'הסתר חלק'}>
            {sec.visible === false ? <i className="ti ti-eye-off" aria-hidden="true" /> : <i className="ti ti-eye" aria-hidden="true" />}
          </button>
          {sec.isCustom && (
            <button className="sd-delete-section-btn" onClick={e => { e.stopPropagation(); removeCustomSection(sec.id); }} title="מחק אזור">
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          )}
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
          <div className="sd-sidebar-title"><i className="ti ti-adjustments-horizontal" aria-hidden="true" /> עריכת שדה</div>
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
          {curField.type === 'percent' && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-field">
                <label>ספרות אחרי הנקודה</label>
                <input type="number" min={0} max={4} value={curField.decimalPlaces ?? 0} onChange={e => updF(selField.secId, selField.fieldId, { decimalPlaces: +e.target.value })} />
              </div>
            </div>
          )}
          {curField.type === 'currency' && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-field">
                <label>סוג מטבע</label>
                <select value={curField.currencyCode || 'ILS'} onChange={e => updF(selField.secId, selField.fieldId, { currencyCode: e.target.value })}>
                  <option value="ILS">₪ שקל ישראלי (ILS)</option>
                  <option value="USD">$ דולר אמריקאי (USD)</option>
                  <option value="EUR">€ יורו (EUR)</option>
                  <option value="GBP">£ לירה שטרלינג (GBP)</option>
                </select>
              </div>
            </div>
          )}
          {curField.type === 'autonumber' && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-field">
                <label>קידומת (אופציונלי)</label>
                <input type="text" value={curField.autoPrefix || ''} placeholder="למשל: DEAL-" onChange={e => updF(selField.secId, selField.fieldId, { autoPrefix: e.target.value })} />
              </div>
              <div className="sd-sidebar-field">
                <label>מספר ספרות</label>
                <input type="number" min={1} max={10} value={curField.autoDigits || 4} onChange={e => updF(selField.secId, selField.fieldId, { autoDigits: Math.min(10, Math.max(1, +e.target.value || 4)) })} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '4px 2px' }}>
                תצוגה לדוגמה: {curField.autoPrefix || ''}{String(1).padStart(curField.autoDigits || 4, '0')}
              </div>
            </div>
          )}
          {curField.type === 'subform' && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-subtitle">עמודות תת הטופס</div>
              {(curField.subformFields || []).map((col, ci) => (
                <div key={col.id || ci} className="sd-option-row" style={{ gap: 4 }}>
                  <input type="text" value={col.label} style={{ flex: 1, minWidth: 0 }}
                    onChange={e => {
                      const cols = [...(curField.subformFields || [])];
                      cols[ci] = { ...cols[ci], label: e.target.value };
                      updF(selField.secId, selField.fieldId, { subformFields: cols });
                    }} />
                  <select value={col.type || 'text'} style={{ width: 80, fontSize: 11 }}
                    onChange={e => {
                      const cols = [...(curField.subformFields || [])];
                      cols[ci] = { ...cols[ci], type: e.target.value };
                      updF(selField.secId, selField.fieldId, { subformFields: cols });
                    }}>
                    <option value="text">טקסט</option>
                    <option value="number">מספר</option>
                    <option value="date">תאריך</option>
                    <option value="select">רשימה</option>
                    <option value="checkbox">תיבה</option>
                    <option value="currency">מטבע</option>
                    <option value="percent">אחוז</option>
                  </select>
                  <button className="sd-remove-btn" onClick={() => updF(selField.secId, selField.fieldId, { subformFields: (curField.subformFields || []).filter((_, i) => i !== ci) })} aria-label="הסר עמודה">
                    <i className="ti ti-x" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button className="sd-add-option-btn"
                onClick={() => updF(selField.secId, selField.fieldId, { subformFields: [...(curField.subformFields || []), { id: 'col_' + Date.now(), label: 'עמודה חדשה', type: 'text' }] })}>
                + הוסף עמודה
              </button>
            </div>
          )}
          {(curField.type === 'select' || curField.type === 'multiselect' || curField.type === 'radio') && (
            <div className="sd-sidebar-divider">
              <div className="sd-sidebar-subtitle">ערכי הרשימה</div>
              {curField.showProbability && (
                <div className="sd-option-row sd-option-header">
                  <span style={{ flex: 1, fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>ערך</span>
                  <span className="sd-prob-input" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textAlign: 'center' }}>%</span>
                </div>
              )}
              {(curField.options || []).map(([k, v, prob], oi) => (
                <div key={oi} className="sd-option-row">
                  <input type="text" value={v} placeholder="שם הערך" style={{ flex: 1 }}
                    onChange={e => {
                      const o = [...(curField.options || [])];
                      const lbl = e.target.value;
                      o[oi] = curField.showProbability ? [lbl, lbl, prob ?? 0] : [lbl, lbl];
                      updF(selField.secId, selField.fieldId, { options: o });
                    }} />
                  {curField.showProbability && (
                    <input type="number" className="sd-prob-input" value={prob ?? ''} placeholder="%" min={0} max={100}
                      onChange={e => { const o = [...(curField.options || [])]; o[oi] = [k, v, Math.min(100, Math.max(0, +e.target.value || 0))]; updF(selField.secId, selField.fieldId, { options: o }); }} />
                  )}
                  <button className="sd-remove-btn" onClick={() => updF(selField.secId, selField.fieldId, { options: (curField.options || []).filter((_, i) => i !== oi) })} aria-label="הסר ערך"><i className="ti ti-x" aria-hidden="true" /></button>
                </div>
              ))}
              <button className="sd-add-option-btn"
                onClick={() => updF(selField.secId, selField.fieldId, { options: [...(curField.options || []), curField.showProbability ? ['', '', 0] : ['', '']] })}>
                + הוסף ערך
              </button>
              {(curField.options || []).length > 0 && !curField.showProbability && (
                <div className="sd-sidebar-field">
                  <label>ברירת מחדל</label>
                  <select value={curField.defaultValue || ''} onChange={e => updF(selField.secId, selField.fieldId, { defaultValue: e.target.value })}>
                    <option value="">— ללא —</option>
                    {(curField.options || []).map(([kk, vv]) => <option key={kk} value={kk}>{vv}</option>)}
                  </select>
                </div>
              )}
              {!curField.showProbability && (
                <div className="sd-sidebar-field">
                  <label>סדר הצגה</label>
                  <select value={curField.sortOrder || 'entry'} onChange={e => updF(selField.secId, selField.fieldId, { sortOrder: e.target.value })}>
                    <option value="entry">לפי סדר הזנה</option>
                    <option value="alpha">לפי א-ב</option>
                  </select>
                </div>
              )}
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
          <div className="sd-sidebar-title"><i className="ti ti-columns" aria-hidden="true" /> עריכת עמודה</div>
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
          <div className="sd-sidebar-title"><i className="ti ti-layout-list" aria-hidden="true" /> עריכת חלק</div>
          <div className="sd-sidebar-field">
            <label>שם החלק</label>
            <input type="text" value={curSec.label} onChange={e => updSec(curSec.id, { label: e.target.value })} />
          </div>
          <label className="sd-sidebar-check">
            <input type="checkbox" checked={curSec.visible !== false} onChange={e => updSec(curSec.id, { visible: e.target.checked })} /> הצג חלק זה
          </label>
          {curSec.isCustom && (
            <button className="sd-delete-field-btn" style={{ marginTop: 12 }} onClick={() => removeCustomSection(curSec.id)}>
              <i className="ti ti-trash" aria-hidden="true" style={{ marginLeft: 4 }} /> מחק אזור זה
            </button>
          )}
        </div>
      ) : (
        <div className="sd-sidebar-card sd-sidebar-empty">
          <div className="sd-sidebar-empty-icon"><i className="ti ti-adjustments" style={{ fontSize: 32, color: 'var(--accent)' }} aria-hidden="true" /></div>
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>לחץ לעריכה</div>
          <div>בחר שדה, עמודה או חלק</div>
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
        <button className="sd-add-section-btn" onClick={addCustomSection} style={{ marginBottom: 12 }}>
          <i className="ti ti-layout-list" aria-hidden="true" /> הוסף אזור חדש
        </button>
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
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 1100, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header sd-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="sd-module-icon-wrap">
              <i className={`ti ${reg.icon}`} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: 17 }}>עורך שדות</h2>
              <div className="sd-module-subtitle">{reg.label}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>
          <div className="sd-hints">
            <span className="sd-hint">גרור שדות לשינוי מיקום</span>
            <span className="sd-hint">גרור עמודות טבלה לשינוי סדר</span>
            <span className="sd-hint">לחץ על שדה / חלק לעריכה</span>
          </div>

          <div className="sd-layout">
            <div className="sd-canvas">{renderCanvas()}</div>
            {renderSidebar()}
          </div>

          <div className="modal-footer" style={{ alignItems: 'center' }}>
            {saved && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', flex: 1 }}>
              <i className="ti ti-circle-check" aria-hidden="true" style={{ marginLeft: 5, verticalAlign: '-2px' }} />
              ההגדרות נשמרו בהצלחה
            </span>}
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <i className="ti ti-device-floppy" aria-hidden="true" />
              שמור הגדרות
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setSects(initSects()); setSelSec(null); setSelField(null); setSelCol(null); }}>בטל שינויים</button>
            <button type="button" className="btn btn-danger" onClick={handleResetToDefault} title="מחזיר את כל השדות במסך זה לברירת המחדל של המערכת">
              <i className="ti ti-refresh" aria-hidden="true" />
              ברירת מחדל
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>סגור</button>
          </div>
        </div>
      </div>
    </div>
  );
}
