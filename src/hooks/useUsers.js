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

export function useLoginHistory({ page = 1, limit = 50, userId = '', dateFrom = '', dateTo = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (userId) params.set('userId', userId);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  return useQuery({
    queryKey: ['login-history', page, limit, userId, dateFrom, dateTo],
    queryFn: () => api.get(`/api/auth/login-history?${params}`),
    staleTime: 30000,
  });
}

export function useMfaRequireAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (required) => api.post('/api/users/mfa-require-all', { required }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
