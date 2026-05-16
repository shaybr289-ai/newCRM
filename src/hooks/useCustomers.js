import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useCustomers({ page = 1, limit = 50, search = '', status = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  return useQuery({
    queryKey: ['customers', page, limit, search, status],
    queryFn: () => api.get(`/api/customers?${params}`),
  });
}

export function useCustomer(id) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/api/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/customers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/customers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
