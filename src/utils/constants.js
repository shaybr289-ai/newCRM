export const CLIENT_TYPES = [
  ['ltd', 'חברה בע"מ'],
  ['public_co', 'חברה ציבורית'],
  ['osek_murshe', 'עוסק מורשה'],
  ['osek_patur', 'עוסק פטור'],
  ['municipal', 'רשות מקומית'],
  ['amuta', 'עמותה'],
  ['aguda', 'אגודה שיתופית'],
  ['chalatz', 'חל"צ — חברה לתועלת הציבור'],
  ['vaad_bait', 'ועד בית / בניין'],
  ['private', 'פרטי'],
];

export const CURRENCIES = [
  ['ILS', '₪ שקל'],
  ['USD', '$ דולר'],
  ['EUR', '€ יורו'],
  ['GBP', '£ פאונד'],
];

export const PAYMENT_TERMS = [
  ['net30', 'שוטף + 30'],
  ['net60', 'שוטף + 60'],
  ['net0', 'מזומן'],
  ['custom', 'אחר'],
];

export const STATUS_OPTIONS = [
  ['active', 'פעיל'],
  ['inactive', 'לא פעיל'],
];

export const EMPTY_CUSTOMER = {
  company_name: '',
  client_type: 'ltd',
  reg_num: '',
  street: '',
  city: '',
  zip: '',
  country: 'ישראל',
  mail_same_as_main: true,
  mail_street: '',
  mail_city: '',
  mail_zip: '',
  mail_country: 'ישראל',
  phone: '',
  mobile: '',
  email: '',
  website: '',
  payment_terms: 'net30',
  credit_limit: '',
  currency: 'ILS',
  notes: '',
  status: 'active',
};

export const CUSTOMERS_COLUMNS = [
  { key: 'cust_num', label: "מס' לקוח", section: 'כללי', defaultVisible: true },
  { key: 'company_name', label: 'שם חברה', section: 'כללי', defaultVisible: true },
  { key: 'client_type', label: 'סוג', section: 'כללי', defaultVisible: true },
  { key: 'reg_num', label: 'ח.פ / ע.מ', section: 'כללי', defaultVisible: true },
  { key: 'city', label: 'עיר', section: 'כללי', defaultVisible: true },
  { key: 'phone', label: 'טלפון', section: 'כללי', defaultVisible: true },
  { key: 'mobile', label: 'נייד', section: 'כללי', defaultVisible: true },
  { key: 'email', label: 'אי-מייל', section: 'כללי', defaultVisible: true },
  { key: 'status', label: 'סטטוס', section: 'כללי', defaultVisible: true },
  { key: 'owner_id', label: 'בעלים', section: 'כללי', defaultVisible: true },
  { key: 'street', label: 'רחוב', section: 'כתובת', defaultVisible: false },
  { key: 'zip', label: 'מיקוד', section: 'כתובת', defaultVisible: false },
  { key: 'country', label: 'מדינה', section: 'כתובת', defaultVisible: false },
  { key: 'price_list', label: 'מחירון', section: 'פרטים נוספים', defaultVisible: false },
  { key: 'currency', label: 'מטבע', section: 'פרטים נוספים', defaultVisible: false },
  { key: 'website', label: 'אתר אינטרנט', section: 'פרטים נוספים', defaultVisible: false },
  { key: 'created_at', label: 'תאריך יצירה', section: 'פרטים נוספים', defaultVisible: false },
];

export const getClientTypeLabel = (type) => {
  const found = CLIENT_TYPES.find(([v]) => v === type);
  return found ? found[1] : type || '—';
};

// ── CONTACTS ──────────────────────────────────────────────────────────────────

export const CONTACTS_COLUMNS = [
  { key: 'first_name', label: 'שם פרטי', section: 'כללי', defaultVisible: true },
  { key: 'last_name', label: 'שם משפחה', section: 'כללי', defaultVisible: true },
  { key: 'customer_id', label: 'לקוח', section: 'כללי', defaultVisible: true },
  { key: 'role', label: 'תפקיד', section: 'כללי', defaultVisible: true },
  { key: 'department', label: 'מחלקה', section: 'כללי', defaultVisible: true },
  { key: 'email', label: 'אי-מייל', section: 'כללי', defaultVisible: true },
  { key: 'mobile', label: 'נייד', section: 'כללי', defaultVisible: true },
  { key: 'birth_date', label: 'ת. לידה', section: 'כללי', defaultVisible: false },
  { key: 'status', label: 'סטטוס', section: 'כללי', defaultVisible: true },
  { key: 'is_primary', label: 'ראשי', section: 'כללי', defaultVisible: true },
  { key: 'is_vip', label: 'VIP', section: 'כללי', defaultVisible: false },
  { key: 'created_at', label: 'תאריך יצירה', section: 'כללי', defaultVisible: false },
];

export const EMPTY_CONTACT = {
  customer_id: '',
  first_name: '',
  last_name: '',
  role: '',
  department: '',
  email: '',
  mobile: '',
  birth_date: '',
  status: 'active',
  is_primary: false,
  is_vip: false,
  notes: '',
};

// ── SITES ─────────────────────────────────────────────────────────────────────

export const SITES_COLUMNS = [
  { key: 'site_name', label: 'שם אתר', section: 'כללי', defaultVisible: true },
  { key: 'customer_id', label: 'לקוח', section: 'כללי', defaultVisible: true },
  { key: 'city', label: 'עיר', section: 'כללי', defaultVisible: true },
  { key: 'street', label: 'כתובת', section: 'כללי', defaultVisible: true },
  { key: 'contact_id', label: 'איש קשר', section: 'כללי', defaultVisible: true },
  { key: 'status', label: 'סטטוס', section: 'כללי', defaultVisible: true },
  { key: 'longitude', label: 'קו אורך', section: 'פרטים נוספים', defaultVisible: false },
  { key: 'latitude', label: 'קו רוחב', section: 'פרטים נוספים', defaultVisible: false },
  { key: 'created_at', label: 'תאריך יצירה', section: 'פרטים נוספים', defaultVisible: false },
];

export const EMPTY_SITE = {
  site_name: '',
  customer_id: '',
  contact_id: '',
  street: '',
  city: '',
  longitude: '',
  latitude: '',
  status: 'active',
};

// ── DEALS ─────────────────────────────────────────────────────────────────────

export const DEAL_STAGES = [
  ['תחילת תהליך', 'תחילת תהליך', 10],
  ['צרכים', 'הבנת צרכים', 20],
  ['גיבוש', 'גיבוש הצעה', 30],
  ['נשלחה', 'הצעה נשלחה ללקוח', 40],
  ['משא ומתן', 'משא ומתן', 50],
  ['אפיון', 'אפיון', 60],
  ['פיילוט', 'פיילוט', 70],
  ['סגירה', 'לקראת סגירה', 90],
  ['חתומה', 'עסקה חתומה', 100],
  ['הפסד', 'סגירה-הפסד', 0],
];

export const DEAL_TYPES = [
  ['חדשה', 'חדשה'],
  ['חידוש', 'חידוש'],
  ['הוספה', 'הוספה'],
];

export const DEAL_PRIORITIES = [
  ['1', '1 — נמוכה'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5', '5 — גבוהה'],
];

export const DEAL_STAGE_COLORS = {
  'תחילת תהליך': '#94A3B8',
  'צרכים': '#60A5FA',
  'גיבוש': '#F59E0B',
  'נשלחה': '#3B82F6',
  'משא ומתן': '#7C3AED',
  'אפיון': '#EC4899',
  'פיילוט': '#14B8A6',
  'סגירה': '#F97316',
  'חתומה': '#10B981',
  'הפסד': '#EF4444',
};

export const DEALS_COLUMNS = [
  { key: 'deal_num', label: "מס' עסקה", section: 'כללי', defaultVisible: true },
  { key: 'deal_name', label: 'שם עסקה', section: 'כללי', defaultVisible: true },
  { key: 'customer_id', label: 'לקוח', section: 'כללי', defaultVisible: true },
  { key: 'contact_id', label: 'איש קשר', section: 'כללי', defaultVisible: false },
  { key: 'stage', label: 'שלב', section: 'כללי', defaultVisible: true },
  { key: 'deal_type', label: 'סוג', section: 'כללי', defaultVisible: true },
  { key: 'priority', label: 'עדיפות', section: 'כללי', defaultVisible: true },
  { key: 'expected_one_time', label: 'חד"פ צפוי', section: 'סכומים', defaultVisible: true },
  { key: 'expected_recurring', label: 'שוטף צפוי', section: 'סכומים', defaultVisible: true },
  { key: 'expected_close_date', label: 'סגירה צפויה', section: 'תאריכים', defaultVisible: true },
  { key: 'actual_close_date', label: 'סגירה בפועל', section: 'תאריכים', defaultVisible: false },
  { key: 'owner', label: 'בעל עסקה', section: 'כללי', defaultVisible: true },
  { key: 'created_at', label: 'תאריך יצירה', section: 'תאריכים', defaultVisible: false },
];

export const EMPTY_DEAL = {
  deal_name: '',
  deal_type: 'חדשה',
  stage: 'תחילת תהליך',
  customer_id: '',
  contact_id: '',
  expected_one_time: '',
  expected_recurring: '',
  priority: '3',
  expected_close_date: '',
  actual_close_date: '',
  loss_reason: '',
  solutions: [],
  notes: '',
  owner: '',
};

// ── QUOTES ────────────────────────────────────────────────────────────────────

export const QUOTE_STAGES = [
  ['draft', 'טיוטא'],
  ['sent', 'נשלחה'],
  ['waiting', 'בהמתנה'],
  ['negotiation', 'משא ומתן'],
  ['signed', 'חתומה'],
  ['converted', 'הומרה להזמנה'],
];

export const QUOTE_STATUSES = [
  ['active', 'פעיל'],
  ['cancelled', 'מבוטל'],
  ['expired', 'פג תוקף'],
  ['closed', 'סגורה'],
];

export const QUOTE_TYPES = [
  ['recurring', 'שוטף'],
  ['onetime', 'חד"פ'],
  ['combined', 'משולבת'],
];

export const STAGE_COLORS = {
  draft: '#94A3B8',
  sent: '#3B82F6',
  waiting: '#F59E0B',
  negotiation: '#7C3AED',
  signed: '#10B981',
  converted: '#6366F1',
};

export const QUOTES_COLUMNS = [
  { key: 'quote_num', label: 'מספר', section: 'כללי', defaultVisible: true },
  { key: 'quote_name', label: 'שם הצעה', section: 'כללי', defaultVisible: true },
  { key: 'customer_id', label: 'לקוח', section: 'כללי', defaultVisible: true },
  { key: 'quote_type', label: 'סוג', section: 'כללי', defaultVisible: true },
  { key: 'stage', label: 'שלב', section: 'כללי', defaultVisible: true },
  { key: 'status', label: 'סטטוס', section: 'כללי', defaultVisible: true },
  { key: 'quote_date', label: 'תאריך', section: 'כללי', defaultVisible: true },
  { key: 'overall_discount', label: 'הנחה %', section: 'כללי', defaultVisible: false },
  { key: 'deal_name', label: 'שם עסקה', section: 'פרטים נוספים', defaultVisible: false },
  { key: 'valid_until', label: 'תוקף עד', section: 'פרטים נוספים', defaultVisible: false },
  { key: 'created_at', label: 'תאריך יצירה', section: 'פרטים נוספים', defaultVisible: false },
];

export const EMPTY_QUOTE = {
  quote_name: '',
  deal_name: '',
  deal_id: '',
  stage: 'draft',
  customer_id: '',
  contact_id: '',
  status: 'active',
  quote_date: new Date().toISOString().split('T')[0],
  quote_type: '',
  intro_text: '',
  conditions: '',
  overall_discount: 0,
  valid_until: '',
  delivery_type: '',
  delivery_address: '',
  delivery_contact_id: '',
  delivery_date: '',
  currency: 'ILS',
};

export const QUOTE_CURRENCIES = [
  ['ILS', "ש\"ח"],
  ['USD', '$'],
  ['EUR', 'יורו'],
  ['GBP', "ליש\"ט"],
];

export const DELIVERY_TYPES = [
  ['pickup', 'איסוף עצמי'],
  ['standard', 'משלוח רגיל'],
  ['express', 'משלוח מהיר'],
  ['courier', 'שליחות'],
  ['installation', 'התקנה באתר'],
  ['shipping', 'הובלה'],
];

// ── Orders ───────────────────────────────────────────────────────────────────
export const ORDER_STATUSES = [
  ['new', 'חדשה'],
  ['in_process', 'בתהליך'],
  ['partially_delivered', 'סופקה חלקית'],
  ['delivered', 'סופקה'],
  ['invoiced', 'הופקה חשבונית'],
  ['cancelled', 'בוטלה'],
];

export const ORDER_STATUS_COLORS = {
  new: '#3B82F6',
  in_process: '#F59E0B',
  partially_delivered: '#F97316',
  delivered: '#10B981',
  invoiced: '#7C3AED',
  cancelled: '#EF4444',
};

export const ORDERS_COLUMNS = [
  { key: 'order_num', label: 'מספר הזמנה', defaultVisible: true },
  { key: 'order_name', label: 'שם הזמנה', defaultVisible: true },
  { key: 'customer_id', label: 'לקוח', defaultVisible: true },
  { key: 'order_date', label: 'תאריך הזמנה', defaultVisible: true },
  { key: 'status', label: 'סטטוס', defaultVisible: true },
  { key: 'delivery_type', label: 'סוג משלוח', defaultVisible: false },
  { key: 'delivery_date', label: 'תאריך אספקה', defaultVisible: true },
  { key: 'created_at', label: 'תאריך יצירה', defaultVisible: false },
];

// ── Delivery Notes ───────────────────────────────────────────────────────────
export const DELIVERY_NOTE_TYPES = [
  ['delivery', 'תעודת משלוח'],
  ['return', 'תעודת החזרה'],
];

export const DELIVERY_NOTE_STATUSES = [
  ['draft', 'טיוטה'],
  ['sent', 'נשלחה'],
  ['delivered', 'סופקה ונחתמה'],
  ['returned', 'הוחזר ונחתם'],
  ['cancelled', 'בוטלה'],
];

export const DELIVERY_NOTE_STATUS_COLORS = {
  draft: '#94A3B8',
  sent: '#3B82F6',
  delivered: '#10B981',
  returned: '#F59E0B',
  cancelled: '#EF4444',
};

export const DELIVERY_NOTES_COLUMNS = [
  { key: 'note_num', label: 'מס\' תעודה', defaultVisible: true },
  { key: 'note_type', label: 'סוג', defaultVisible: true },
  { key: 'customer_id', label: 'לקוח', defaultVisible: true },
  { key: 'order_id', label: 'הזמנה', defaultVisible: true },
  { key: 'delivery_date', label: 'תאריך אספקה', defaultVisible: true },
  { key: 'driver_name', label: 'שם נהג', defaultVisible: false },
  { key: 'vehicle_num', label: 'מס\' רכב', defaultVisible: false },
  { key: 'status', label: 'סטטוס', defaultVisible: true },
  { key: 'signed_by', label: 'נחתם על ידי', defaultVisible: true },
  { key: 'created_at', label: 'תאריך יצירה', defaultVisible: false },
];

export const EMPTY_DELIVERY_NOTE = {
  note_type: 'delivery',
  order_id: '',
  customer_id: '',
  delivery_date: new Date().toISOString().split('T')[0],
  expected_delivery_date: '',
  delivery_type: '',
  delivery_address: '',
  source_address: '',
  delivery_contact_id: '',
  driver_name: '',
  vehicle_num: '',
  tracking_num: '',
  status: 'draft',
  signed_by: '',
  signature_data: '',
  signed_at: null,
  notes: '',
};

export const EMPTY_ORDER = {
  order_name: '',
  customer_id: '',
  contact_id: '',
  order_date: new Date().toISOString().split('T')[0],
  status: 'new',
  order_type: '',
  intro_text: '',
  conditions: '',
  overall_discount: 0,
  delivery_type: '',
  delivery_address: '',
  delivery_contact_id: '',
  delivery_date: '',
  notes: '',
};

export const mkEmptyItem = () => ({
  id: 'qi' + Date.now() + Math.random().toString(36).slice(2),
  productName: '',
  sku: '',
  cost: '',
  quantity: 1,
  unitPrice: '',
  discount: 0,
  costType: 'onetime',
  description: '',
  groupHeader: '',
  mfrSku: '',
  unit: '',
});

export const calcItemTotal = (it) =>
  (parseFloat(it.unitPrice) || 0) * (parseFloat(it.quantity) || 0) * (1 - (parseFloat(it.discount) || 0) / 100);

// ── PRODUCTS ──────────────────────────────────────────────────────────────────

export const PRODUCTS_COLUMNS = [
  { key: 'sku', label: "מק'ט", section: 'כללי', defaultVisible: true },
  { key: 'name', label: 'שם מוצר', section: 'כללי', defaultVisible: true },
  { key: 'family_id', label: 'משפחה', section: 'כללי', defaultVisible: true },
  { key: 'parent_cat', label: 'קטגוריה', section: 'כללי', defaultVisible: true },
  { key: 'product_type', label: 'סוג', section: 'כללי', defaultVisible: true },
  { key: 'unit_price', label: 'מחיר קנייה', section: 'כללי', defaultVisible: true },
  { key: 'status', label: 'סטטוס', section: 'כללי', defaultVisible: true },
  { key: 'sale_price', label: 'מחיר מכירה', section: 'תמחור', defaultVisible: false },
  { key: 'cost_currency', label: 'מטבע קנייה', section: 'תמחור', defaultVisible: false },
  { key: 'sale_currency', label: 'מטבע מכירה', section: 'תמחור', defaultVisible: false },
  { key: 'stock_qty', label: 'כמות במלאי', section: 'תמחור', defaultVisible: false },
  { key: 'last_purchase_date', label: 'ת. קנייה אחרון', section: 'תמחור', defaultVisible: false },
  { key: 'mfr_name', label: 'שם יצרן', section: 'זיהוי', defaultVisible: false },
  { key: 'mfr_sku', label: "מק'ט יצרן", section: 'זיהוי', defaultVisible: false },
  { key: 'supplier_name', label: 'שם ספק', section: 'זיהוי', defaultVisible: false },
  { key: 'supplier_sku', label: "מק'ט ספק", section: 'זיהוי', defaultVisible: false },
  { key: 'unit_of_use', label: 'יחידת שימוש', section: 'זיהוי', defaultVisible: false },
  { key: 'created_at', label: 'תאריך יצירה', section: 'זיהוי', defaultVisible: false },
];

export const EMPTY_PRODUCT = {
  name: '',
  sku: '',
  product_type: 'onetime',
  family_id: '',
  parent_cat: '',
  status: 'active',
  mfr_sku: '',
  supplier_sku: '',
  mfr_name: '',
  supplier_name: '',
  description: '',
  unit_price: '',
  cost_currency: 'ILS',
  sale_price: '',
  sale_currency: 'ILS',
  last_purchase_date: '',
  unit_of_use: '',
  stock_qty: '',
};

// ── CUSTOMER ITEMS ────────────────────────────────────────────────────────────

export const CUST_ITEMS_COLUMNS = [
  { key: 'item_name', label: 'שם פריט', section: 'מידע כללי', defaultVisible: true },
  { key: 'sku', label: "מק'ט", section: 'מידע כללי', defaultVisible: true },
  { key: 'customer_id', label: 'לקוח', section: 'מידע כללי', defaultVisible: true },
  { key: 'site_id', label: 'אתר', section: 'מידע כללי', defaultVisible: true },
  { key: 'product_family_id', label: 'משפחת מוצר', section: 'מידע כללי', defaultVisible: true },
  { key: 'agreement_id', label: 'הסכם שירות', section: 'מידע כללי', defaultVisible: false },
  { key: 'quantity', label: 'כמות', section: 'מידע כללי', defaultVisible: true },
  { key: 'item_type', label: 'סוג', section: 'מידע כללי', defaultVisible: true },
  { key: 'status', label: 'סטטוס', section: 'מידע כללי', defaultVisible: true },
  { key: 'status_changed_at', label: 'שינוי סטטוס', section: 'מידע כללי', defaultVisible: false },
  { key: 'ff_data_line_num', label: 'מספר קו DATA', section: '900 — קו DATA', defaultVisible: false },
  { key: 'ff_data_line_type', label: 'סוג קו DATA', section: '900 — קו DATA', defaultVisible: false },
  { key: 'ff_bandwidth', label: 'רוחב פס', section: '900 — קו DATA', defaultVisible: false },
  { key: 'ff_infra_provider', label: 'ספק תשתית', section: '900 — קו DATA', defaultVisible: false },
  { key: 'ff_line_ownership', label: 'בעלות קו', section: '900 — קו DATA', defaultVisible: false },
  { key: 'ff_isp_provider', label: 'ספק ISP', section: '900 — קו DATA', defaultVisible: false },
  { key: 'ff_active_equip_owner', label: 'ציוד אקטיבי', section: '900 — ציוד', defaultVisible: false },
  { key: 'ff_equip_type', label: 'סוג ציוד', section: '900 — ציוד', defaultVisible: false },
  { key: 'ff_serial_firewall', label: "מ'ס Firewall/Router", section: '900 — ציוד', defaultVisible: false },
  { key: 'ff_serial_bridge', label: "מ'ס Bridge Xfiber", section: '900 — ציוד', defaultVisible: false },
  { key: 'ff_serial_gpon', label: "מ'ס GPON Xfiber", section: '900 — ציוד', defaultVisible: false },
  { key: 'ff_xfiber_conn_type', label: 'סוג חיבור XFIBER', section: '900 — ציוד', defaultVisible: false },
  { key: 'ff_static_ip', label: 'IP קבועה', section: '900 — רשת', defaultVisible: false },
  { key: 'ff_vlan', label: 'VLAN', section: '900 — רשת', defaultVisible: false },
];

// ── Service Agreements ───────────────────────────────────────────────────────
export const AGREEMENT_TYPES = [
  ['sla', 'SLA'],
  ['maintenance', 'תחזוקה'],
  ['support', 'תמיכה'],
  ['consulting', 'ייעוץ'],
  ['managed', 'שירות מנוהל'],
  ['warranty', 'אחריות'],
];

export const SERVICE_TYPES = [
  ['remote', 'תמיכה מרחוק'],
  ['onsite', 'עבודות שטח'],
  ['phone', 'תמיכה טלפונית'],
  ['installation', 'התקנה'],
  ['training', 'הדרכה'],
  ['monitoring', 'ניטור'],
];

export const SERVICE_SCOPES = [
  ['monthly', 'חודשי'],
  ['quarterly', 'רבעוני'],
  ['semi_annual', 'חצי שנתי'],
  ['annual', 'שנתי'],
  ['biennial', 'דו שנתי'],
  ['multi_year', 'רב שנתי'],
];

export const AUTO_RENEW_OPTIONS = [
  ['no', 'לא'],
  ['yes', 'כן'],
];

export const SA_COLUMNS = [
  { key: 'agreement_num', label: 'מספר', defaultVisible: true },
  { key: 'agreement_name', label: 'שם הסכם', defaultVisible: true },
  { key: 'customer_id', label: 'לקוח', defaultVisible: true },
  { key: 'agreement_type', label: 'סוג הסכם', defaultVisible: true },
  { key: 'service_type', label: 'מודל שירות', defaultVisible: false },
  { key: 'service_scope', label: 'היקף שירות', defaultVisible: false },
  { key: 'start_date', label: 'תאריך התחלה', defaultVisible: true },
  { key: 'period_months', label: 'תקופה (חודשים)', defaultVisible: false },
  { key: 'end_date', label: 'תאריך סיום', defaultVisible: true },
  { key: 'status', label: 'סטטוס', defaultVisible: true },
  { key: 'auto_renew', label: 'חידוש אוטומטי', defaultVisible: true },
  { key: 'contact_id', label: 'איש קשר', defaultVisible: false },
  { key: 'owner_id', label: 'בעל הסכם', defaultVisible: true },
  { key: 'crm_customer_num', label: 'מספר CRM', defaultVisible: false },
  { key: 'created_at', label: 'תאריך יצירה', defaultVisible: false },
];

export const EMPTY_AGREEMENT = {
  agreement_name: '', customer_id: '', contact_id: '', agreement_type: '',
  service_type: '', service_scope: '', start_date: '', period_months: '',
  end_date: '', status: 'active', auto_renew: 'no', description: '',
  owner_id: '', crm_customer_num: '', site_ids: [],
};

export const ITEM_TYPES = [
  ['connectivity', 'תקשורת'],
  ['hardware', 'חומרה'],
  ['software', 'תוכנה'],
  ['license', 'רישיון'],
  ['service', 'שירות'],
  ['other', 'אחר'],
];

export const EMPTY_CUST_ITEM = {
  customer_id: '', site_id: '', product_family_id: '', agreement_id: '',
  product_id: '', sku: '', item_name: '', quantity: 1, item_type: '',
  status: 'active', status_changed_at: '',
  ff_data_line_num: '', ff_data_line_type: '', ff_bandwidth: '',
  ff_infra_provider: '', ff_line_ownership: '', ff_isp_provider: '',
  ff_active_equip_owner: '', ff_equip_type: '', ff_serial_firewall: '',
  ff_serial_bridge: '', ff_serial_gpon: '', ff_xfiber_conn_type: '',
  ff_static_ip: '', ff_vlan: '',
};

// ── Reports ──────────────────────────────────────────────────────────────────
export const REPORT_MODULES = {
  customers: {
    label: 'לקוחות',
    fields: [
      { id: 'cust_num', label: 'מספר לקוח', type: 'text' },
      { id: 'company_name', label: 'שם חברה', type: 'text' },
      { id: 'client_type', label: 'סוג לקוח', type: 'enum', options: CLIENT_TYPES },
      { id: 'reg_num', label: 'ח.פ / ת.ז', type: 'text' },
      { id: 'city', label: 'עיר', type: 'text' },
      { id: 'phone', label: 'טלפון', type: 'text' },
      { id: 'mobile', label: 'נייד', type: 'text' },
      { id: 'email', label: 'אי-מייל', type: 'text' },
      { id: 'payment_terms', label: 'תנאי תשלום', type: 'enum', options: PAYMENT_TERMS },
      { id: 'credit_limit', label: 'מסגרת אשראי', type: 'number' },
      { id: 'status', label: 'סטטוס', type: 'enum', options: STATUS_OPTIONS },
      { id: 'created_at', label: 'תאריך יצירה', type: 'date' },
    ],
  },
  contacts: {
    label: 'אנשי קשר',
    fields: [
      { id: 'first_name', label: 'שם פרטי', type: 'text' },
      { id: 'last_name', label: 'שם משפחה', type: 'text' },
      { id: 'role', label: 'תפקיד', type: 'text' },
      { id: 'department', label: 'מחלקה', type: 'text' },
      { id: 'email', label: 'אי-מייל', type: 'text' },
      { id: 'mobile', label: 'נייד', type: 'text' },
      { id: 'is_primary', label: 'איש קשר ראשי', type: 'boolean' },
      { id: 'is_vip', label: 'VIP', type: 'boolean' },
      { id: 'company_name', label: 'שם חברה', type: 'lookup' },
      { id: 'status', label: 'סטטוס', type: 'enum', options: STATUS_OPTIONS },
    ],
  },
  products: {
    label: 'מוצרים / מק"טים',
    fields: [
      { id: 'sku', label: 'מק"ט', type: 'text' },
      { id: 'name', label: 'שם מוצר', type: 'text' },
      { id: 'product_type', label: 'סוג מוצר', type: 'text' },
      { id: 'sale_price', label: 'מחיר מכירה', type: 'number' },
      { id: 'unit_price', label: 'מחיר קנייה', type: 'number' },
      { id: 'status', label: 'סטטוס', type: 'enum', options: STATUS_OPTIONS },
      { id: 'mfr_name', label: 'יצרן', type: 'text' },
    ],
  },
  deals: {
    label: 'עסקאות',
    fields: [
      { id: 'deal_num', label: 'מספר', type: 'text' },
      { id: 'deal_name', label: 'שם עסקה', type: 'text' },
      { id: 'deal_type', label: 'סוג עסקה', type: 'text' },
      { id: 'stage', label: 'שלב', type: 'text' },
      { id: 'priority', label: 'עדיפות', type: 'number' },
      { id: 'expected_one_time', label: 'חד"פ צפוי', type: 'number' },
      { id: 'expected_recurring', label: 'שוטף צפוי', type: 'number' },
      { id: 'expected_close_date', label: 'סגירה צפויה', type: 'date' },
      { id: 'created_at', label: 'תאריך יצירה', type: 'date' },
    ],
  },
  quotes: {
    label: 'הצעות מחיר',
    fields: [
      { id: 'quote_num', label: 'מספר', type: 'text' },
      { id: 'quote_name', label: 'שם הצעה', type: 'text' },
      { id: 'stage', label: 'שלב', type: 'text' },
      { id: 'quote_type', label: 'סוג', type: 'text' },
      { id: 'quote_date', label: 'תאריך הצעה', type: 'date' },
      { id: 'overall_discount', label: 'הנחה %', type: 'number' },
      { id: 'status', label: 'סטטוס', type: 'enum', options: STATUS_OPTIONS },
      { id: 'created_at', label: 'תאריך יצירה', type: 'date' },
    ],
  },
  'service-agreements': {
    label: 'הסכמי שירות',
    fields: [
      { id: 'agreement_num', label: 'מספר', type: 'text' },
      { id: 'agreement_name', label: 'שם הסכם', type: 'text' },
      { id: 'agreement_type', label: 'סוג הסכם', type: 'enum', options: AGREEMENT_TYPES },
      { id: 'service_type', label: 'מודל שירות', type: 'enum', options: SERVICE_TYPES },
      { id: 'start_date', label: 'תאריך התחלה', type: 'date' },
      { id: 'end_date', label: 'תאריך סיום', type: 'date' },
      { id: 'auto_renew', label: 'חידוש אוטומטי', type: 'enum', options: AUTO_RENEW_OPTIONS },
      { id: 'status', label: 'סטטוס', type: 'enum', options: STATUS_OPTIONS },
    ],
  },
  'cust-items': {
    label: 'פריטי לקוח',
    fields: [
      { id: 'item_name', label: 'שם פריט', type: 'text' },
      { id: 'sku', label: 'מק"ט', type: 'text' },
      { id: 'quantity', label: 'כמות', type: 'number' },
      { id: 'item_type', label: 'סוג פריט', type: 'enum', options: ITEM_TYPES },
      { id: 'status', label: 'סטטוס', type: 'enum', options: STATUS_OPTIONS },
    ],
  },
  sites: {
    label: 'אתרי לקוח',
    fields: [
      { id: 'site_name', label: 'שם אתר', type: 'text' },
      { id: 'city', label: 'עיר', type: 'text' },
      { id: 'street', label: 'כתובת', type: 'text' },
      { id: 'status', label: 'סטטוס', type: 'enum', options: STATUS_OPTIONS },
    ],
  },
  orders: {
    label: 'הזמנות',
    fields: [
      { id: 'order_num', label: 'מספר הזמנה', type: 'text' },
      { id: 'order_name', label: 'שם הזמנה', type: 'text' },
      { id: 'status', label: 'סטטוס', type: 'enum', options: ORDER_STATUSES },
      { id: 'order_date', label: 'תאריך הזמנה', type: 'date' },
      { id: 'delivery_date', label: 'תאריך אספקה', type: 'date' },
      { id: 'delivery_type', label: 'סוג משלוח', type: 'enum', options: DELIVERY_TYPES },
      { id: 'delivery_address', label: 'כתובת אספקה', type: 'text' },
      { id: 'total', label: 'סכום כולל', type: 'number' },
      { id: 'overall_discount', label: 'הנחה %', type: 'number' },
      { id: 'created_at', label: 'תאריך יצירה', type: 'date' },
    ],
  },
  'delivery-notes': {
    label: 'תעודות משלוח',
    fields: [
      { id: 'note_num', label: 'מספר תעודה', type: 'text' },
      { id: 'note_type', label: 'סוג תעודה', type: 'enum', options: DELIVERY_NOTE_TYPES },
      { id: 'status', label: 'סטטוס', type: 'enum', options: DELIVERY_NOTE_STATUSES },
      { id: 'delivery_date', label: 'תאריך אספקה', type: 'date' },
      { id: 'expected_delivery_date', label: 'תאריך משוער', type: 'date' },
      { id: 'delivery_type', label: 'סוג משלוח', type: 'enum', options: DELIVERY_TYPES },
      { id: 'delivery_address', label: 'כתובת אספקה', type: 'text' },
      { id: 'source_address', label: 'כתובת מקור', type: 'text' },
      { id: 'driver_name', label: 'שם נהג', type: 'text' },
      { id: 'vehicle_num', label: 'מספר רכב', type: 'text' },
      { id: 'tracking_num', label: 'מספר מעקב', type: 'text' },
      { id: 'signed_by', label: 'נחתם ע"י', type: 'text' },
      { id: 'signed_at', label: 'תאריך חתימה', type: 'date' },
      { id: 'created_at', label: 'תאריך יצירה', type: 'date' },
    ],
  },
};

// Relationships: which modules can be joined, and through which foreign key
export const REPORT_JOINS = {
  customers: [
    { module: 'contacts', label: 'אנשי קשר', fk: 'customer_id' },
    { module: 'sites', label: 'אתרי לקוח', fk: 'customer_id' },
    { module: 'service-agreements', label: 'הסכמי שירות', fk: 'customer_id' },
    { module: 'cust-items', label: 'פריטי לקוח', fk: 'customer_id' },
    { module: 'quotes', label: 'הצעות מחיר', fk: 'customer_id' },
    { module: 'deals', label: 'עסקאות', fk: 'customer_id' },
    { module: 'orders', label: 'הזמנות', fk: 'customer_id' },
    { module: 'delivery-notes', label: 'תעודות משלוח', fk: 'customer_id' },
  ],
  contacts: [
    { module: 'customers', label: 'לקוחות', fk: 'customer_id', reverse: true },
    // siblingFk: join where secondary[fk] === primary[siblingFk]
    { module: 'sites', label: 'אתרי לקוח', fk: 'customer_id', siblingFk: 'customer_id' },
  ],
  'service-agreements': [
    { module: 'customers', label: 'לקוחות', fk: 'customer_id', reverse: true },
    { module: 'cust-items', label: 'פריטי לקוח', fk: 'agreement_id' },
    { module: 'sites', label: 'אתרי לקוח', fk: 'customer_id', siblingFk: 'customer_id' },
    { module: 'deals', label: 'עסקאות', fk: 'customer_id', siblingFk: 'customer_id' },
    { module: 'quotes', label: 'הצעות מחיר', fk: 'customer_id', siblingFk: 'customer_id' },
    { module: 'orders', label: 'הזמנות', fk: 'customer_id', siblingFk: 'customer_id' },
  ],
  'cust-items': [
    { module: 'customers', label: 'לקוחות', fk: 'customer_id', reverse: true },
    { module: 'service-agreements', label: 'הסכמי שירות', fk: 'agreement_id', reverse: true },
    { module: 'sites', label: 'אתרי לקוח', fk: 'customer_id', siblingFk: 'customer_id' },
    { module: 'deals', label: 'עסקאות', fk: 'customer_id', siblingFk: 'customer_id' },
    { module: 'quotes', label: 'הצעות מחיר', fk: 'customer_id', siblingFk: 'customer_id' },
  ],
  deals: [
    { module: 'customers', label: 'לקוחות', fk: 'customer_id', reverse: true },
    { module: 'quotes', label: 'הצעות מחיר', fk: 'deal_id' },
  ],
  quotes: [
    { module: 'customers', label: 'לקוחות', fk: 'customer_id', reverse: true },
    { module: 'deals', label: 'עסקאות', fk: 'deal_id', reverse: true },
    { module: 'orders', label: 'הזמנות', fk: 'quote_id' },
    { module: 'delivery-notes', label: 'תעודות משלוח', fk: 'quote_id' },
  ],
  products: [],
  sites: [
    { module: 'customers', label: 'לקוחות', fk: 'customer_id', reverse: true },
  ],
  orders: [
    { module: 'customers', label: 'לקוחות', fk: 'customer_id', reverse: true },
    { module: 'quotes', label: 'הצעות מחיר', fk: 'quote_id', reverse: true },
    { module: 'delivery-notes', label: 'תעודות משלוח', fk: 'order_id' },
    { module: 'deals', label: 'עסקאות', fk: 'customer_id', siblingFk: 'customer_id' },
  ],
  'delivery-notes': [
    { module: 'customers', label: 'לקוחות', fk: 'customer_id', reverse: true },
    { module: 'orders', label: 'הזמנות', fk: 'order_id', reverse: true },
  ],
};

export const REPORT_FILTER_OPS = [
  ['contains', 'מכיל'],
  ['not_contains', 'לא מכיל'],
  ['eq', 'שווה ל'],
  ['neq', 'לא שווה ל'],
  ['starts', 'מתחיל ב'],
  ['gt', 'גדול מ'],
  ['lt', 'קטן מ'],
  ['empty', 'ריק'],
  ['not_empty', 'לא ריק'],
];
