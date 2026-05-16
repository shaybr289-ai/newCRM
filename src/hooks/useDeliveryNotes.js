import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useDeliveryNotes(params = {}) {
  const { page = 1, limit = 50, search = '', customerId = '', orderId = '' } = params;
  const qs = new URLSearchParams({
    page, limit,
    ...(search && { search }),
    ...(customerId && { customerId }),
    ...(orderId && { orderId }),
  }).toString();
  return useQuery({ queryKey: ['delivery-notes', page, limit, search, customerId, orderId], queryFn: () => api.get(`/api/delivery-notes?${qs}`), staleTime: 60000, retry: 3 });
}

export function useDeliveryNote(id) {
  return useQuery({ queryKey: ['delivery-note', id], queryFn: () => api.get(`/api/delivery-notes/${id}`), enabled: !!id, staleTime: 60000 });
}

export function useDeliveryNoteItems(noteId) {
  return useQuery({ queryKey: ['delivery-note-items', noteId], queryFn: () => api.get(`/api/delivery-notes/${noteId}/items`), enabled: !!noteId });
}

export function useCreateDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post('/api/delivery-notes', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-notes'] }) });
}

export function useUpdateDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/api/delivery-notes/${id}`, d),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['delivery-notes'] });
      qc.invalidateQueries({ queryKey: ['delivery-note', vars.id] });
    },
  });
}

export function useDeleteDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/api/delivery-notes/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-notes'] }) });
}

export function useSaveDeliveryNoteItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, items }) => api.post(`/api/delivery-notes/${noteId}/items`, { items }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['delivery-note-items', vars.noteId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCreateDeliveryNoteFromOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId) => api.post(`/api/orders/${orderId}/create-delivery-note`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery-notes'] }); qc.invalidateQueries({ queryKey: ['orders'] }); },
  });
}
