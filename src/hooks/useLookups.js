import { useSettings, useSaveSetting } from './useDataManagement';

export const DEFAULT_CLIENT_TYPES = [
  ['bm', 'בע"מ — חברה בערבון מוגבל'],
  ['osek_morshe', 'עוסק מורשה'],
  ['amuta', 'עמותה / מלכ"ר'],
  ['aguda', 'אגודה שיתופית'],
  ['chalatz', 'חל"צ — חברה לתועלת הציבור'],
  ['vaad_bait', 'ועד בית / בניין'],
  ['private', 'פרטי'],
];

export const DEFAULT_PAYMENT_TERMS = [
  ['net0', 'מזומן'],
  ['net15', 'שוטף+15'],
  ['net30', 'שוטף+30'],
  ['net45', 'שוטף+45'],
  ['net60', 'שוטף+60'],
  ['net90', 'שוטף+90'],
];

export const DEFAULT_CUSTOMER_STATUSES = [
  ['active', 'פעיל'],
  ['inactive', 'לא פעיל'],
  ['potential', 'פוטנציאל'],
  ['warning', 'אזהרה'],
  ['limited', 'מוגבל'],
];

export const DEFAULT_LEAD_STATUSES = [
  ['new', 'ליד חדש'],
  ['contacted', 'נוצר קשר'],
  ['qualified', 'מוכשר'],
  ['proposal', 'הוצעה הצעה'],
  ['negotiation', 'משא ומתן'],
  ['converted', 'הומר'],
  ['lost', 'אבוד'],
];

function parseSetting(settings, key, fallback) {
  try {
    const raw = settings?.[key];
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}

/** Returns dynamic lookup lists fetched from settings table, falling back to defaults. */
export function useLookups() {
  const { data: settings, isLoading } = useSettings();
  return {
    clientTypes:      parseSetting(settings, 'lookup_client_types',      DEFAULT_CLIENT_TYPES),
    paymentTerms:     parseSetting(settings, 'lookup_payment_terms',     DEFAULT_PAYMENT_TERMS),
    customerStatuses: parseSetting(settings, 'lookup_customer_statuses', DEFAULT_CUSTOMER_STATUSES),
    leadStatuses:     parseSetting(settings, 'lookup_lead_statuses',     DEFAULT_LEAD_STATUSES),
    isLoading,
  };
}

/** Convenience: look up a label from a dynamic list by value. */
export function lookupLabel(list, value) {
  return list?.find(([v]) => v === value)?.[1] || value || '—';
}

export function useSaveLookup() {
  const { mutateAsync, isPending } = useSaveSetting();
  return {
    saveClientTypes:      (list) => mutateAsync({ key: 'lookup_client_types',      value: JSON.stringify(list) }),
    savePaymentTerms:     (list) => mutateAsync({ key: 'lookup_payment_terms',     value: JSON.stringify(list) }),
    saveCustomerStatuses: (list) => mutateAsync({ key: 'lookup_customer_statuses', value: JSON.stringify(list) }),
    saveLeadStatuses:     (list) => mutateAsync({ key: 'lookup_lead_statuses',     value: JSON.stringify(list) }),
    isPending,
  };
}
