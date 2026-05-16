import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

// ── Forms list ──────────────────────────────────────────────────────────
export function useForms({ page = 1, limit = 100, search = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  return useQuery({
    queryKey: ['forms', page, limit, search],
    queryFn: () => api.get(`/api/forms?${params}`),
  });
}

// ── Single form (full payload — sections + fields + rules) ──────────────
export function useFormFull(id) {
  return useQuery({
    queryKey: ['form-full', id],
    queryFn: () => api.get(`/api/forms/${id}/full`),
    enabled: !!id,
  });
}

// ── Lifecycle ───────────────────────────────────────────────────────────
export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/forms', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function useUpdateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/forms/${id}`, data),
    // Only invalidate the LIST query — not form-full — so the Builder's
    // local state (with in-flight position/field edits) isn't reset.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/forms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function useDuplicateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/api/forms/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function usePublishForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/api/forms/${id}/publish`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      qc.invalidateQueries({ queryKey: ['form-full', id] });
    },
  });
}

export function useArchiveForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/api/forms/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

// ── Sections ────────────────────────────────────────────────────────────
// IMPORTANT: do NOT invalidate ['form-full', formId] from these mutations.
// The Builder's local state IS the source of truth while editing — refetching
// would race with in-flight position/property updates and reset fields to
// older positions.

export function useCreateSection() {
  return useMutation({
    mutationFn: ({ formId, ...data }) => api.post(`/api/forms/${formId}/sections`, data),
  });
}

export function useUpdateSection() {
  return useMutation({
    mutationFn: ({ formId, id, ...data }) => api.put(`/api/forms/${formId}/sections/${id}`, data),
  });
}

export function useDeleteSection() {
  return useMutation({
    mutationFn: ({ formId, id }) => api.delete(`/api/forms/${formId}/sections/${id}`),
  });
}

// ── Fields ──────────────────────────────────────────────────────────────
export function useCreateField() {
  return useMutation({
    mutationFn: ({ formId, ...data }) => api.post(`/api/forms/${formId}/fields`, data),
  });
}

export function useUpdateField() {
  return useMutation({
    mutationFn: ({ formId, id, ...data }) => api.put(`/api/forms/${formId}/fields/${id}`, data),
  });
}

export function useDeleteField() {
  return useMutation({
    mutationFn: ({ formId, id }) => api.delete(`/api/forms/${formId}/fields/${id}`),
  });
}

export function useBulkPositionFields() {
  // No optimistic invalidate — UI tracks positions locally during drag.
  return useMutation({
    mutationFn: ({ formId, positions }) =>
      api.post(`/api/forms/${formId}/fields/bulk-position`, { positions }),
  });
}

// ── Rules ───────────────────────────────────────────────────────────────
export function useCreateRule() {
  return useMutation({
    mutationFn: ({ formId, ...data }) => api.post(`/api/forms/${formId}/rules`, data),
  });
}

export function useUpdateRule() {
  return useMutation({
    mutationFn: ({ formId, id, ...data }) => api.put(`/api/forms/${formId}/rules/${id}`, data),
  });
}

export function useDeleteRule() {
  return useMutation({
    mutationFn: ({ formId, id }) => api.delete(`/api/forms/${formId}/rules/${id}`),
  });
}

// ── Submissions (for review screens later) ─────────────────────────────
export function useFormSubmissions(formId, { page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return useQuery({
    queryKey: ['form-submissions', formId, page, limit],
    queryFn: () => api.get(`/api/forms/${formId}/submissions?${params}`),
    enabled: !!formId,
  });
}
