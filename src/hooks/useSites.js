import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useSites({ page = 1, limit = 50, search = '', customerId = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (customerId) params.set('customerId', customerId);

  return useQuery({
    queryKey: ['sites', page, limit, search, customerId],
    queryFn: () => api.get(`/api/sites?${params}`),
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/sites', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/sites/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/sites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}
