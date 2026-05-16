import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useBulkFilter(entity) {
  return useMutation({
    mutationFn: ({ filters, page = 1, limit = 100 }) =>
      api.post(`/api/${entity}/filter`, { filters, page, limit }),
  });
}

export function useBulkUpdate(entity) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, field, value }) =>
      api.post(`/api/${entity}/bulk-update`, { ids, field, value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] });
    },
  });
}

export function useBulkUpdateUndo(entity) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId }) =>
      api.post(`/api/${entity}/bulk-update/undo`, { sessionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] });
    },
  });
}
