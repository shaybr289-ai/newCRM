/**
 * Catalog of field types available in the Builder palette.
 * `defaults` are applied when a new field is added.
 */
export const FIELD_TYPES = [
  // ─── Text ─────────────────────────────────────────────
  { type: 'text',     label: 'טקסט',      icon: 'Aa', category: 'טקסט', defaults: { width: 240, height: 78 } },
  { type: 'textarea', label: 'טקסט ארוך', icon: '≡',  category: 'טקסט', defaults: { width: 360, height: 140 } },
  { type: 'email',    label: 'אי-מייל',   icon: 'ti-mail',  category: 'טקסט', defaults: { width: 240, height: 78 } },
  { type: 'phone',    label: 'טלפון',     icon: 'ti-phone',  category: 'טקסט', defaults: { width: 220, height: 78 } },
  { type: 'url',      label: 'קישור',     icon: 'ti-link', category: 'טקסט', defaults: { width: 240, height: 78 } },

  // ─── Numbers ──────────────────────────────────────────
  { type: 'number',     label: 'מספר',     icon: '#', category: 'מספרים', defaults: { width: 180, height: 78 } },
  { type: 'currency',   label: 'מטבע (₪)', icon: '₪', category: 'מספרים', defaults: { width: 200, height: 78 } },
  { type: 'percentage', label: 'אחוז',     icon: '%', category: 'מספרים', defaults: { width: 160, height: 78 } },
  { type: 'slider',     label: 'סליידר',   icon: '⇔', category: 'מספרים',
    defaults: { width: 280, height: 78, validation: { min: 0, max: 100, step: 1 } } },

  // ─── Dates ────────────────────────────────────────────
  { type: 'date',     label: 'תאריך',       icon: 'ti-calendar', category: 'תאריכים', defaults: { width: 200, height: 78 } },
  { type: 'time',     label: 'שעה',         icon: 'ti-clock', category: 'תאריכים', defaults: { width: 160, height: 78 } },
  { type: 'datetime', label: 'תאריך + שעה', icon: 'ti-calendar-time', category: 'תאריכים', defaults: { width: 240, height: 78 } },

  // ─── Selection ────────────────────────────────────────
  { type: 'select', label: 'רשימה נפתחת', icon: '▾', category: 'בחירה',
    defaults: { width: 240, height: 78,
      options: [{ label: 'אופציה 1', value: '1' }, { label: 'אופציה 2', value: '2' }] } },
  { type: 'multi_select', label: 'בחירה מרובה', icon: 'ti-checkbox', category: 'בחירה',
    defaults: { width: 280, height: 140,
      options: [{ label: 'אופציה 1', value: '1' }, { label: 'אופציה 2', value: '2' }] } },
  { type: 'radio',  label: 'כפתורי רדיו', icon: '⊙', category: 'בחירה',
    defaults: { width: 280, height: 140,
      options: [{ label: 'אופציה 1', value: '1' }, { label: 'אופציה 2', value: '2' }] } },
  { type: 'checkbox', label: 'תיבות סימון', icon: '☐', category: 'בחירה',
    defaults: { width: 280, height: 140,
      options: [{ label: 'אופציה 1', value: '1' }, { label: 'אופציה 2', value: '2' }] } },
  { type: 'toggle', label: 'מתג כן/לא', icon: '⇄', category: 'בחירה', defaults: { width: 220, height: 78 } },
  { type: 'rating', label: 'דירוג כוכבים', icon: '★', category: 'בחירה',
    defaults: { width: 240, height: 78, validation: { max: 5 } } },

  // ─── Media ────────────────────────────────────────────
  { type: 'file',      label: 'העלאת קובץ',  icon: 'ti-file-upload', category: 'מדיה',
    defaults: { width: 280, height: 88 } },
  { type: 'image',     label: 'תמונה/צילום',  icon: 'ti-camera', category: 'מדיה',
    defaults: { width: 280, height: 200 } },
  { type: 'signature', label: 'חתימה דיגיטלית', icon: 'ti-signature', category: 'מדיה',
    defaults: { width: 400, height: 180, style_overrides: { full_width: true } } },

  // ─── Module ───────────────────────────────────────────
  { type: 'module_lookup', label: 'חיפוש ברשומות', icon: 'ti-search', category: 'קישורים',
    defaults: { width: 300, height: 78, module_link: { module: 'customers', displayField: 'company_name', valueField: 'id' } } },

  // ─── Layout ───────────────────────────────────────────
  { type: 'heading',   label: 'כותרת',     icon: 'H', category: 'פריסה',
    defaults: { width: 480, height: 56, label: 'כותרת חדשה', style_overrides: { full_width: true } } },
  { type: 'paragraph', label: 'פסקה',      icon: '¶', category: 'פריסה',
    defaults: { width: 480, height: 80, label: 'הוסף טקסט כאן...', style_overrides: { full_width: true } } },
  { type: 'divider',   label: 'קו מפריד',  icon: '─', category: 'פריסה',
    defaults: { width: 480, height: 28, style_overrides: { full_width: true } } },
  { type: 'spacer',    label: 'רווח',      icon: 'ti-space', category: 'פריסה',
    defaults: { width: 480, height: 24, style_overrides: { full_width: true } } },
];

export const FIELD_TYPES_BY_CATEGORY = FIELD_TYPES.reduce((acc, ft) => {
  if (!acc[ft.category]) acc[ft.category] = [];
  acc[ft.category].push(ft);
  return acc;
}, {});

export function getFieldTypeMeta(type) {
  return FIELD_TYPES.find((ft) => ft.type === type) || null;
}

/** Auto-generate a field_key like "field_a3d2" */
export function generateFieldKey(existing = []) {
  const taken = new Set(existing);
  for (let i = 0; i < 100; i++) {
    const key = `field_${Math.random().toString(36).slice(2, 6)}`;
    if (!taken.has(key)) return key;
  }
  return `field_${Date.now()}`;
}
