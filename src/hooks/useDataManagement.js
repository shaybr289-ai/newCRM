import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

// ── Categories ────────────────────────────────────────────────────────────────
export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get('/api/categories?limit=5000'), staleTime: 300000, retry: 3, retryDelay: 1000 });
}
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post('/api/categories', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) });
}
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/api/categories/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) });
}
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/api/categories/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) });
}
export function useBulkDeleteCategories() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids) => api.post('/api/categories/bulk-delete', { ids }), onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) });
}

// ── Families ──────────────────────────────────────────────────────────────────
export function useFamilies() {
  return useQuery({ queryKey: ['families'], queryFn: () => api.get('/api/families?limit=5000'), staleTime: 300000, retry: 3, retryDelay: 1000 });
}
export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post('/api/families', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }) });
}
export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/api/families/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }) });
}
export function useDeleteFamily() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/api/families/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }) });
}
export function useBulkDeleteFamilies() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids) => api.post('/api/families/bulk-delete', { ids }), onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }) });
}
export function useReorderFamilies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates) => api.post('/api/families/reorder', { updates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  });
}

// ── Family Level Definitions (global names per depth) ────────────────────────
export function useFamilyLevels() {
  return useQuery({ queryKey: ['family-levels'], queryFn: () => api.get('/api/family-levels?limit=100'), staleTime: 300000 });
}
export function useCreateFamilyLevel() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post('/api/family-levels', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['family-levels'] }) });
}
export function useUpdateFamilyLevel() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/api/family-levels/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['family-levels'] }) });
}
export function useDeleteFamilyLevel() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/api/family-levels/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['family-levels'] }) });
}

// ── Manufacturers ─────────────────────────────────────────────────────────────
export function useManufacturers() {
  return useQuery({ queryKey: ['manufacturers'], queryFn: () => api.get('/api/manufacturers?limit=500'), staleTime: 300000 });
}
export function useCreateManufacturer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post('/api/manufacturers', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }) });
}
export function useDeleteManufacturer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/api/manufacturers/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }) });
}
export function useBulkDeleteManufacturers() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids) => api.post('/api/manufacturers/bulk-delete', { ids }), onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }) });
}

// ── Conditions ────────────────────────────────────────────────────────────────
export function useConditions() {
  return useQuery({ queryKey: ['conditions'], queryFn: () => api.get('/api/conditions?limit=500'), staleTime: 300000 });
}
export function useCreateCondition() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post('/api/conditions', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['conditions'] }) });
}
export function useUpdateCondition() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/api/conditions/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['conditions'] }) });
}
export function useDeleteCondition() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/api/conditions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['conditions'] }) });
}

// ── Settings ──────────────────────────────────────────────────────────────────
export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => api.get('/api/settings'), staleTime: 300000 });
}
export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }) => api.post(`/api/settings/${key}`, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

// ── Company Info ──────────────────────────────────────────────────────────────
export function useCompanyInfo() {
  return useQuery({ queryKey: ['company'], queryFn: () => api.get('/api/company'), staleTime: 300000 });
}
export function useSaveCompanyInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => api.post('/api/company', d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });
}
