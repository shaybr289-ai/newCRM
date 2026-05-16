import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useDeals({ page = 1, limit = 50, search = '', customerId = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (customerId) params.set('customerId', customerId);

  return useQuery({
    queryKey: ['deals', page, limit, search, customerId],
    queryFn: () => api.get(`/api/deals?${params}`),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/deals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/deals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/deals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  });
}
