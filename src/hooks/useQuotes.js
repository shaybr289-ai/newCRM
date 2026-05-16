import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useQuotes({ page = 1, limit = 50, search = '', customerId = '', stage = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (customerId) params.set('customerId', customerId);
  if (stage) params.set('status', stage); // filter by stage via status param

  return useQuery({
    queryKey: ['quotes', page, limit, search, customerId, stage],
    queryFn: () => api.get(`/api/quotes?${params}`),
  });
}

export function useQuote(id) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: () => api.get(`/api/quotes/${id}`),
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/quotes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/quotes/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['quote', vars.id] });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/quotes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

// Save quote items (replace all)
export function useSaveQuoteItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, items }) => api.post(`/api/quotes/${quoteId}/items`, { items }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['quote', vars.quoteId] }),
  });
}
