import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useUsers({ limit = 200 } = {}) {
  return useQuery({
    queryKey: ['users', limit],
    queryFn: () => api.get(`/api/users?limit=${limit}`),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserName(users, userId) {
  if (!userId || !users?.length) return '—';
  const u = users.find(u => u.id === userId);
  return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '—' : '—';
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
