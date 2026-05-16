import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useServiceAgreements(params = {}) {
  const { page = 1, limit = 50, search = '', customerId = '' } = params;
  const qs = new URLSearchParams({ page, limit, ...(search && { search }), ...(customerId && { customerId }) }).toString();
  return useQuery({ queryKey: ['service-agreements', page, limit, search, customerId], queryFn: () => api.get(`/api/service-agreements?${qs}`), staleTime: 120000, retry: 3 });
}

export function useCreateAgreement() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post('/api/service-agreements', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['service-agreements'] }) });
}

export function useUpdateAgreement() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/api/service-agreements/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['service-agreements'] }) });
}

export function useDeleteAgreement() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/api/service-agreements/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['service-agreements'] }) });
}

export function useBulkDeleteAgreements() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids) => api.post('/api/service-agreements/bulk-delete', { ids }), onSuccess: () => qc.invalidateQueries({ queryKey: ['service-agreements'] }) });
}
