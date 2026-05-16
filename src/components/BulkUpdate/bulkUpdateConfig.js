import { CLIENT_TYPES, STATUS_OPTIONS, PAYMENT_TERMS, CURRENCIES, DEAL_STAGES, DEAL_TYPES, DEAL_PRIORITIES } from '../../utils/constants';

// ── Operator lists per field type ────────────────────────────────────────────

export const TEXT_OPERATORS = [
  { value: 'none',           label: 'ללא' },
  { value: 'equals',         label: 'הוא' },
  { value: 'not_equals',     label: 'לא נמצא' },
  { value: 'contains',       label: 'מכיל' },
  { value: 'not_contains',   label: 'לא מכיל' },
  { value: 'starts_with',    label: 'מתחיל ב' },
  { value: 'ends_with',      label: 'מסתיים ב' },
  { value: 'is_empty',       label: 'הוא ריק' },
  { value: 'is_not_empty',   label: 'הוא לא ריק' },
];

export const SELECT_OPERATORS = [
  { value: 'none',           label: 'ללא' },
  { value: 'equals',         label: 'הוא' },
  { value: 'not_equals',     label: 'לא נמצא' },
  { value: 'contains',       label: 'מכיל' },
  { value: 'not_contains',   label: 'לא מכיל' },
  { value: 'starts_with',    label: 'מתחיל ב' },
  { value: 'ends_with',      label: 'מסתיים ב' },
  { value: 'is_empty',       label: 'הוא ריק' },
  { value: 'is_not_empty',   label: 'הוא לא ריק' },
];

export const NUMBER_OPERATORS = [
  { value: 'equals',                label: '=' },
  { value: 'not_equals',            label: '≠' },
  { value: 'less_than',             label: '<' },
  { value: 'less_than_or_equal',    label: '≤' },
  { value: 'greater_than',          label: '>' },
  { value: 'greater_than_or_equal', label: '≥' },
  { value: 'between',               label: 'בין' },
  { value: 'not_between',           label: 'לא בין' },
  { value: 'is_empty',              label: 'הוא ריק' },
  { value: 'is_not_empty',          label: 'הוא לא ריק' },
];

export const DATE_OPERATORS = [
  { value: 'equals',          label: 'תאריך ספציפי' },
  { value: 'before',          label: 'נמצא לפני' },
  { value: 'after',           label: 'נמצא אחרי' },
  { value: 'between',         label: 'בין' },
  { value: 'not_between',     label: 'לא בין' },
  { value: 'today',           label: 'היום' },
  { value: 'tomorrow',        label: 'מחר' },
  { value: 'from_tomorrow',   label: 'החל ממחר' },
  { value: 'yesterday',       label: 'אתמול' },
  { value: 'until_yesterday', label: 'עד אתמול' },
  { value: 'last_month',      label: 'החודש הקודם' },
  { value: 'this_month',      label: 'חודש נוכחי' },
  { value: 'next_month',      label: 'החודש הבא' },
  { value: 'last_week',       label: 'השבוע הקודם' },
  { value: 'this_week',       label: 'השבוע הנוכחי' },
  { value: 'next_week',       label: 'שבוע הבא' },
  { value: 'this_year',       label: 'השנה' },
  { value: 'year_start',      label: 'מתחיל השנה' },
  { value: 'quarter_start',   label: 'מתחילת הרבעון' },
  { value: 'age_days',        label: 'גיל בימים' },
  { value: 'days_to',         label: 'ימים למועד' },
  { value: 'is_empty',        label: 'הוא ריק' },
  { value: 'is_not_empty',    label: 'הוא לא ריק' },
];

export const DAYS_SUB_OPERATORS = [
  { value: 'equals',                label: '=' },
  { value: 'not_equals',            label: '≠' },
  { value: 'less_than',             label: '<' },
  { value: 'less_than_or_equal',    label: '≤' },
  { value: 'greater_than',          label: '>' },
  { value: 'greater_than_or_equal', label: '≥' },
];

export const CHECKBOX_OPERATORS = [
  { value: 'is_true',  label: 'נבחר' },
  { value: 'is_false', label: 'לא נבחר' },
];

export const LOOKUP_OPERATORS = [
  { value: 'none',         label: 'ללא' },
  { value: 'equals',       label: 'הוא' },
  { value: 'not_equals',   label: 'לא נמצא' },
  { value: 'is_empty',     label: 'הוא ריק' },
  { value: 'is_not_empty', label: 'הוא לא ריק' },
];

const COST_TYPE_OPTIONS = [['onetime', "חד\"פ"], ['recurring', 'שוטף']];

// ── Module definitions ───────────────────────────────────────────────────────
// type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'api_lookup'
// api_lookup fields: { endpoint, labelField, labelField2? }
//   endpoint  → GET /api/{endpoint}?limit=300 → { data: [...] }
//   labelField → which property to display as the option label
//   labelField2 → optional second property joined with a space

export const BULK_UPDATE_MODULES = [
  {
    id: 'customers',
    label: 'לקוחות',
    endpoint: 'customers',
    displayField: 'company_name',
    fields: [
      // ── מזהה ──
      { key: 'cust_num',       label: "מס' לקוח",          type: 'text' },
      // ── פרטים כלליים ──
      { key: 'company_name',   label: 'שם חברה',            type: 'text' },
      { key: 'client_type',    label: 'סוג לקוח',           type: 'select', options: CLIENT_TYPES },
      { key: 'reg_num',        label: 'ח.פ / ע.מ',          type: 'text' },
      { key: 'status',         label: 'סטטוס',              type: 'select', options: STATUS_OPTIONS },
      // ── קשר ──
      { key: 'phone',          label: 'טלפון',              type: 'text' },
      { key: 'mobile',         label: 'נייד',               type: 'text' },
      { key: 'email',          label: 'אי-מייל',            type: 'text' },
      { key: 'website',        label: 'אתר אינטרנט',        type: 'text' },
      // ── כתובת ──
      { key: 'street',         label: 'רחוב',               type: 'text' },
      { key: 'city',           label: 'עיר',                type: 'text' },
      { key: 'zip',            label: 'מיקוד',              type: 'text' },
      { key: 'country',        label: 'מדינה',              type: 'text' },
      { key: 'mail_street',    label: 'רחוב (כת׳ מכתבים)',  type: 'text' },
      { key: 'mail_city',      label: 'עיר (כת׳ מכתבים)',   type: 'text' },
      { key: 'mail_zip',       label: 'מיקוד (כת׳ מכתבים)', type: 'text' },
      // ── כספי ──
      { key: 'payment_terms',  label: 'תנאי תשלום',         type: 'select', options: PAYMENT_TERMS },
      { key: 'credit_limit',   label: 'מסגרת אשראי',        type: 'number' },
      { key: 'currency',       label: 'מטבע',               type: 'select', options: CURRENCIES },
      { key: 'price_list',     label: 'מחירון',             type: 'text' },
      // ── נוספים ──
      { key: 'alert_message',  label: 'הודעת אזהרה',        type: 'text' },
      { key: 'notes',          label: 'הערות',              type: 'text' },
      { key: 'owner_id',       label: 'בעלי רשומה לקוח',   type: 'api_lookup', endpoint: 'users', labelField: 'first_name', labelField2: 'last_name' },
      // ── תאריכים ──
      { key: 'created_at',     label: 'תאריך יצירה',        type: 'date', readOnly: true },
      { key: 'updated_at',     label: 'תאריך עדכון',        type: 'date', readOnly: true },
    ],
  },
  {
    id: 'contacts',
    label: 'אנשי קשר',
    endpoint: 'contacts',
    displayField: 'first_name',
    fields: [
      { key: 'first_name',   label: 'שם פרטי',      type: 'text' },
      { key: 'last_name',    label: 'שם משפחה',     type: 'text' },
      { key: 'customer_id',  label: 'לקוח',          type: 'api_lookup', endpoint: 'customers', labelField: 'company_name' },
      { key: 'role',         label: 'תפקיד',         type: 'text' },
      { key: 'department',   label: 'מחלקה',         type: 'text' },
      { key: 'email',        label: 'אי-מייל',      type: 'text' },
      { key: 'mobile',       label: 'נייד',           type: 'text' },
      { key: 'status',       label: 'סטטוס',         type: 'select', options: STATUS_OPTIONS },
      { key: 'is_primary',   label: 'ראשי',          type: 'checkbox' },
      { key: 'is_vip',       label: 'VIP',           type: 'checkbox' },
      { key: 'birth_date',   label: 'ת. לידה',       type: 'date' },
      { key: 'site_id',      label: 'אתר',           type: 'api_lookup', endpoint: 'sites', labelField: 'site_name' },
      { key: 'notes',        label: 'הערות',         type: 'text' },
      { key: 'created_by',   label: 'בעלי רשומה איש קשר', type: 'api_lookup', endpoint: 'users', labelField: 'first_name', labelField2: 'last_name' },
      { key: 'created_at',   label: 'תאריך יצירה',  type: 'date', readOnly: true },
      { key: 'updated_at',   label: 'תאריך עדכון',  type: 'date', readOnly: true },
    ],
  },
  {
    id: 'sites',
    label: 'אתרי לקוח',
    endpoint: 'sites',
    displayField: 'site_name',
    fields: [
      { key: 'site_name',     label: 'שם אתר',       type: 'text' },
      { key: 'customer_id',   label: 'לקוח',          type: 'api_lookup', endpoint: 'customers', labelField: 'company_name' },
      { key: 'contact_id',    label: 'איש קשר',       type: 'api_lookup', endpoint: 'contacts', labelField: 'first_name', labelField2: 'last_name' },
      { key: 'street',        label: 'כתובת',         type: 'text' },
      { key: 'city',          label: 'עיר',           type: 'text' },
      { key: 'contact_name',  label: 'שם איש קשר',   type: 'text' },
      { key: 'status',          label: 'סטטוס',              type: 'select', options: STATUS_OPTIONS },
      { key: 'agreement_id',    label: 'הסכם שירות',         type: 'api_lookup', endpoint: 'service-agreements', labelField: 'agreement_name' },
      { key: 'site_owner_id',   label: 'בעלי רשומה אתר',    type: 'api_lookup', endpoint: 'users', labelField: 'first_name', labelField2: 'last_name' },
      { key: 'created_at',      label: 'תאריך יצירה',        type: 'date', readOnly: true },
      { key: 'updated_at',      label: 'תאריך עדכון',        type: 'date', readOnly: true },
    ],
  },
  {
    id: 'deals',
    label: 'עסקאות',
    endpoint: 'deals',
    displayField: 'deal_name',
    fields: [
      { key: 'deal_num',            label: "מס' עסקה",     type: 'text' },
      { key: 'deal_name',           label: 'שם עסקה',      type: 'text' },
      { key: 'customer_id',         label: 'לקוח',          type: 'api_lookup', endpoint: 'customers', labelField: 'company_name' },
      { key: 'contact_id',          label: 'איש קשר',       type: 'api_lookup', endpoint: 'contacts', labelField: 'first_name', labelField2: 'last_name' },
      { key: 'stage',               label: 'שלב',           type: 'select', options: DEAL_STAGES.map(([v, l]) => [v, l]) },
      { key: 'deal_type',           label: 'סוג',           type: 'select', options: DEAL_TYPES },
      { key: 'priority',            label: 'עדיפות',        type: 'select', options: DEAL_PRIORITIES },
      { key: 'expected_close_date', label: 'סגירה צפויה',  type: 'date' },
      { key: 'actual_close_date',   label: 'סגירה בפועל',  type: 'date' },
      { key: 'expected_one_time',   label: "חד\"פ צפוי",   type: 'number' },
      { key: 'expected_recurring',  label: 'שוטף צפוי',    type: 'number' },
      { key: 'owner',               label: 'בעלי רשומה עסקה', type: 'api_lookup', endpoint: 'users', labelField: 'first_name', labelField2: 'last_name' },
      { key: 'loss_reason',         label: 'סיבת הפסד',    type: 'text' },
      { key: 'notes',               label: 'הערות',         type: 'text' },
      { key: 'created_at',          label: 'תאריך יצירה',  type: 'date', readOnly: true },
      { key: 'updated_at',          label: 'תאריך עדכון',  type: 'date', readOnly: true },
    ],
  },
  {
    id: 'products',
    label: 'מוצרים',
    endpoint: 'products',
    displayField: 'name',
    fields: [
      // ── זיהוי ──
      { key: 'name',               label: 'שם מוצר',          type: 'text' },
      { key: 'sku',                label: 'מק"ט',              type: 'text' },
      { key: 'status',             label: 'סטטוס',             type: 'select', options: STATUS_OPTIONS },
      { key: 'product_type',       label: 'סוג',               type: 'select', options: COST_TYPE_OPTIONS },
      // ── שיוך ──
      { key: 'family_id',          label: 'משפחת מוצר',       type: 'api_lookup', endpoint: 'families', labelField: 'name' },
      { key: 'parent_cat',         label: 'קטגוריה (טקסט)',   type: 'text' },
      // ── ספקים / יצרנים ──
      { key: 'mfr_name',           label: 'שם יצרן',          type: 'text' },
      { key: 'mfr_sku',            label: 'מק"ט יצרן',        type: 'text' },
      { key: 'supplier_name',      label: 'שם ספק',           type: 'text' },
      { key: 'supplier_sku',       label: 'מק"ט ספק',         type: 'text' },
      // ── מחיר ──
      { key: 'unit_price',         label: 'מחיר עלות',        type: 'number' },
      { key: 'cost_currency',      label: 'מטבע עלות',        type: 'select', options: CURRENCIES },
      { key: 'sale_price',         label: 'מחיר מכירה',       type: 'number' },
      { key: 'sale_currency',      label: 'מטבע מכירה',       type: 'select', options: CURRENCIES },
      // ── מלאי ──
      { key: 'stock_qty',          label: 'מלאי',              type: 'number' },
      { key: 'unit_of_use',        label: 'יחידת מידה',       type: 'text' },
      // ── תאריכים ──
      { key: 'last_purchase_date', label: 'תאריך קנייה אחרון', type: 'date' },
      { key: 'sale_start_date',    label: 'תחילת מבצע',       type: 'date' },
      { key: 'sale_end_date',      label: 'סיום מבצע',        type: 'date' },
      { key: 'sale_entry_date',    label: 'תאריך הזנת מבצע',  type: 'date' },
      // ── תיאור ──
      { key: 'description',        label: 'תיאור',             type: 'text' },
      { key: 'created_at',         label: 'תאריך יצירה',       type: 'date', readOnly: true },
      { key: 'updated_at',         label: 'תאריך עדכון',       type: 'date', readOnly: true },
    ],
  },
];

export function getOperatorsForType(fieldType) {
  switch (fieldType) {
    case 'select':     return SELECT_OPERATORS;
    case 'number':     return NUMBER_OPERATORS;
    case 'date':       return DATE_OPERATORS;
    case 'checkbox':   return CHECKBOX_OPERATORS;
    case 'lookup':
    case 'api_lookup': return LOOKUP_OPERATORS;
    default:           return TEXT_OPERATORS;
  }
}

export function operatorNeedsValue(operator) {
  return !['none', 'is_empty', 'is_not_empty', 'today', 'tomorrow', 'from_tomorrow',
    'yesterday', 'until_yesterday', 'this_month', 'last_month', 'next_month',
    'this_week', 'last_week', 'next_week', 'this_year', 'year_start', 'quarter_start',
    'is_true', 'is_false'].includes(operator);
}

export function operatorNeedsTwoValues(operator) {
  return ['between', 'not_between'].includes(operator);
}

export function operatorIsDaysRelative(operator) {
  return operator === 'age_days' || operator === 'days_to';
}
