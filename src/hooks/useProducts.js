import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useProducts({ page = 1, limit = 50, search = '', familyId = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (familyId) params.set('familyId', familyId);

  return useQuery({
    queryKey: ['products', page, limit, search, familyId],
    queryFn: () => api.get(`/api/products?${params}`),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useBulkDeleteProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => api.post('/api/products/bulk-delete', { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// Supporting data
export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: () => api.get('/api/families?limit=5000'),
    staleTime: 1000 * 60 * 5, retry: 3, retryDelay: 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories?limit=5000'),
    staleTime: 1000 * 60 * 5, retry: 3, retryDelay: 1000,
  });
}

export function useManufacturers() {
  return useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => api.get('/api/manufacturers?limit=5000'),
    staleTime: 1000 * 60 * 5, retry: 3, retryDelay: 1000,
  });
}
