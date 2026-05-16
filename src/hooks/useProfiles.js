import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.get('/api/profiles'),
    staleTime: 60000,
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/profiles', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/profiles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/profiles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
