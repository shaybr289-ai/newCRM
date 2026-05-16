import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useTasks(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.customerId) params.set('customerId', filters.customerId);
  if (filters.dueFrom) params.set('dueFrom', filters.dueFrom);
  if (filters.dueTo) params.set('dueTo', filters.dueTo);
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', filters.limit);

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.get(`/api/tasks?${params.toString()}`),
    staleTime: 30000,
  });
}

export function useTask(id) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get(`/api/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/tasks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/tasks/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', vars.id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useTaskActivities(taskId) {
  return useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: () => api.get(`/api/tasks/${taskId}/activities`),
    enabled: !!taskId,
  });
}

export function useSaveTaskActivities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, items }) => api.post(`/api/tasks/${taskId}/activities`, { items }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task-activities', vars.taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useActivityTemplates() {
  return useQuery({
    queryKey: ['task-activity-templates'],
    queryFn: () => api.get('/api/task-activity-templates'),
    staleTime: 60000,
  });
}

export function useCreateActivityTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/task-activity-templates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-activity-templates'] }),
  });
}

export function useUpdateActivityTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/task-activity-templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-activity-templates'] }),
  });
}

export function useDeleteActivityTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/task-activity-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-activity-templates'] }),
  });
}
