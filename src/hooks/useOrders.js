import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useOrders(params = {}) {
  const { page = 1, limit = 50, search = '', customerId = '' } = params;
  const qs = new URLSearchParams({ page, limit, ...(search && { search }), ...(customerId && { customerId }) }).toString();
  return useQuery({ queryKey: ['orders', page, limit, search, customerId], queryFn: () => api.get(`/api/orders?${qs}`), staleTime: 120000, retry: 3 });
}

export function useOrder(id) {
  return useQuery({ queryKey: ['order', id], queryFn: () => api.get(`/api/orders/${id}`), enabled: !!id, staleTime: 60000 });
}

export function useOrderItems(orderId) {
  return useQuery({ queryKey: ['order-items', orderId], queryFn: () => api.get(`/api/orders/${orderId}/items`), enabled: !!orderId });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post('/api/orders', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/api/orders/${id}`, d),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', vars.id] });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/api/orders/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) });
}

export function useSaveOrderItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, items }) => api.post(`/api/orders/${orderId}/items`, { items }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['order-items', vars.orderId] }),
  });
}

export function useConvertQuoteToOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quoteId) => api.post(`/api/quotes/${quoteId}/convert-to-order`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['quotes'] }); },
  });
}
