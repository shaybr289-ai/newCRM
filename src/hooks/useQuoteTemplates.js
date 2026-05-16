import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useQuoteTemplates() {
  return useQuery({
    queryKey: ['quote-templates'],
    queryFn: () => api.get('/api/store/biz_quote_templates_v1').then(r => {
      // Templates stored as JSON string in legacy store
      if (r.value) {
        try { return JSON.parse(r.value); } catch { return []; }
      }
      return [];
    }),
    staleTime: 60000,
  });
}

export function useSaveQuoteTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templates) => api.post('/api/store/biz_quote_templates_v1', { value: JSON.stringify(templates) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote-templates'] }),
  });
}

// ── Default structures ────────────────────────────────────────────────────────

export const DEFAULT_SECTIONS = [
  { id: 'ts_intro', type: 'intro', title: 'הקדמה', content: '', enabled: true },
  { id: 'ts_prod', type: 'product_desc', title: 'הסבר על המוצר / שירות', content: '', enabled: true },
  { id: 'ts_costs_ot', type: 'costs', costType: 'onetime', title: 'עלויות חד פעמיות', content: '', enabled: true },
  { id: 'ts_costs_rc', type: 'costs', costType: 'recurring', title: 'עלויות שוטפות', content: '', enabled: true },
  { id: 'ts_cond', type: 'conditions', title: 'תנאים כלליים', content: '', enabled: true },
  { id: 'ts_images', type: 'images', title: 'תמונות', content: '', enabled: true },
  { id: 'ts_sig', type: 'signature', title: 'אישור וחתימה', content: '', enabled: true },
];

export const DEFAULT_COSTS_COLS = [
  { id: 'num', label: '#', enabled: true },
  { id: 'productName', label: 'שם מוצר / שירות', enabled: true },
  { id: 'sku', label: 'מק"ט', enabled: false },
  { id: 'description', label: 'תיאור', enabled: false },
  { id: 'qty', label: 'כמות', enabled: true },
  { id: 'unit', label: 'יחידה', enabled: true },
  { id: 'unitPrice', label: 'מחיר ליחידה', enabled: true },
  { id: 'discount', label: 'הנחה %', enabled: true },
  { id: 'total', label: 'סה"כ', enabled: true },
];

export function mkEmptyTemplate() {
  return {
    id: 'qt' + Date.now(),
    name: '',
    internalNotes: '',
    layout: 'standard',
    images: [],
    header: {
      showLogo: false, logoData: '', logoAlign: 'right',
      companyName: '', tagline: '', extraText: '',
      social: { useCompanyInfo: true, email: '', phone: '', facebook: '', linkedin: '', website: '' },
    },
    footer: { text: '', showPageNum: false },
    sections: DEFAULT_SECTIONS.map(s => ({ ...s, id: 'ts' + Date.now() + Math.random().toString(36).slice(2) })),
    costsTable: {
      columns: DEFAULT_COSTS_COLS.map(c => ({ ...c })),
      showSubtotal: true, showVat: true, showGrandTotal: true,
    },
    createdAt: new Date().toISOString().split('T')[0],
  };
}
