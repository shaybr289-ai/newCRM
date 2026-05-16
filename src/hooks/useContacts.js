import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useContacts({ page = 1, limit = 50, search = '', customerId = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (customerId) params.set('customerId', customerId);

  return useQuery({
    queryKey: ['contacts', page, limit, search, customerId],
    queryFn: () => api.get(`/api/contacts?${params}`),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/contacts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/contacts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}
