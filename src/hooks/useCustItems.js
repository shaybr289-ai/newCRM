import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useCustItems({ page = 1, limit = 50, search = '', customerId = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (customerId) params.set('customerId', customerId);

  return useQuery({
    queryKey: ['cust-items', page, limit, search, customerId],
    queryFn: () => api.get(`/api/cust-items?${params}`),
  });
}

export function useCreateCustItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/cust-items', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cust-items'] }),
  });
}

export function useUpdateCustItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/cust-items/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cust-items'] }),
  });
}

export function useDeleteCustItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/cust-items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cust-items'] }),
  });
}
