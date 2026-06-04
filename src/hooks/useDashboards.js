import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useDashboards() {
  return useQuery({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/api/dashboards'),
    staleTime: 30000,
  });
}

export function useDashboard(id) {
  return useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => api.get(`/api/dashboards/${id}`),
    enabled: !!id,
    staleTime: 0,          // always refetch on re-entry so layout changes appear immediately
    gcTime: 5 * 60 * 1000, // keep in cache for 5 min to avoid flicker on tab switch
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/dashboards', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export function useUpdateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/dashboards/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['dashboards'] });
      qc.invalidateQueries({ queryKey: ['dashboard', vars.id] });
    },
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/dashboards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export function useAddWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dashboardId, ...data }) =>
      api.post(`/api/dashboards/${dashboardId}/widgets`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['dashboard', vars.dashboardId] }),
  });
}

export function useUpdateWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dashboardId, widgetId, ...data }) =>
      api.put(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['dashboard', vars.dashboardId] }),
  });
}

export function useDeleteWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dashboardId, widgetId }) =>
      api.delete(`/api/dashboards/${dashboardId}/widgets/${widgetId}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['dashboard', vars.dashboardId] }),
  });
}

export function useSaveLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dashboardId, layouts }) =>
      api.put(`/api/dashboards/${dashboardId}/layout`, { layouts }),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['dashboard', vars.dashboardId] }),
  });
}
