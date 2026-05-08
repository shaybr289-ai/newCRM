import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

// ── Status (current open session) ────────────────────────────────────────────
export function useAttendanceStatus() {
  return useQuery({
    queryKey: ['attendance', 'status'],
    queryFn: () => api.get('/api/attendance/status'),
    refetchInterval: 10000,  // 10 s — so the clock widget reflects mobile sync quickly
  });
}

// ── My attendance (employee) ──────────────────────────────────────────────────
export function useMyAttendance({ month, year } = {}) {
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['attendance', 'my', m, y],
    queryFn: () => api.get(`/api/attendance/my?month=${m}&year=${y}`),
  });
}

// ── Manager list ──────────────────────────────────────────────────────────────
export function useAttendanceSessions({ page = 1, limit = 50, month, year, userId, department, hasAnomaly } = {}) {
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  const params = new URLSearchParams({ page, limit, month: m, year: y });
  if (userId) params.set('userId', userId);
  if (department) params.set('department', department);
  if (hasAnomaly) params.set('hasAnomaly', 'true');
  return useQuery({
    queryKey: ['attendance', 'sessions', page, m, y, userId, department, hasAnomaly],
    queryFn: () => api.get(`/api/attendance?${params}`),
  });
}

export function useAttendanceSession(id) {
  return useQuery({
    queryKey: ['attendance', 'session', id],
    queryFn: () => api.get(`/api/attendance/${id}`),
    enabled: !!id,
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function useAttendanceDashboard() {
  return useQuery({
    queryKey: ['attendance', 'dashboard'],
    queryFn: () => api.get('/api/attendance/dashboard'),
    refetchInterval: 15000,  // 15 s — keeps "workers connected now" near real-time
  });
}

// ── Report ─────────────────────────────────────────────────────────────────────
export function useAttendanceReport({ month, year, userId, department, customerId } = {}) {
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  const params = new URLSearchParams({ month: m, year: y });
  if (userId) params.set('userId', userId);
  if (department) params.set('department', department);
  if (customerId) params.set('customerId', customerId);
  return useQuery({
    queryKey: ['attendance', 'report', m, y, userId, department, customerId],
    queryFn: () => api.get(`/api/attendance/report?${params}`),
    staleTime: 1000 * 60 * 5,
  });
}

// ── Polygon report ────────────────────────────────────────────────────────────
export function usePolygonReport({ zoneId, from, to, userId } = {}) {
  const params = new URLSearchParams();
  if (zoneId) params.set('zoneId', zoneId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (userId) params.set('userId', userId);
  return useQuery({
    queryKey: ['attendance', 'polygon-report', zoneId, from, to, userId],
    queryFn: () => api.get(`/api/attendance/polygon-report?${params}`),
    staleTime: 1000 * 60 * 2,
  });
}

// ── Geofence zones ─────────────────────────────────────────────────────────────
export function useGeofenceZones() {
  return useQuery({
    queryKey: ['geofence-zones'],
    queryFn: () => api.get('/api/geofence-zones?limit=200'),
  });
}

export function useCreateGeofenceZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/geofence-zones', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofence-zones'] }),
  });
}

export function useUpdateGeofenceZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/geofence-zones/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofence-zones'] }),
  });
}

export function useDeleteGeofenceZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/geofence-zones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofence-zones'] }),
  });
}

// ── Shift templates ────────────────────────────────────────────────────────────
export function useShiftTemplates() {
  return useQuery({
    queryKey: ['shift-templates'],
    queryFn: () => api.get('/api/shift-templates?status=active&limit=200'),
  });
}

export function useCreateShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/shift-templates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift-templates'] }),
  });
}

export function useUpdateShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/shift-templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift-templates'] }),
  });
}

export function useDeleteShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/shift-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift-templates'] }),
  });
}

// ── Clock actions ──────────────────────────────────────────────────────────────
export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/attendance/clock-in', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/attendance/clock-out', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useBreakStart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/attendance/break-start', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'status'] }),
  });
}

export function useBreakEnd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/attendance/break-end', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'status'] }),
  });
}

// ── Manager CRUD ───────────────────────────────────────────────────────────────
export function useCreateAttendanceSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/attendance', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useUpdateAttendanceSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/attendance/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useApproveOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, notes }) => api.patch(`/api/attendance/${id}/overtime`, { decision, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

// ── Absences ───────────────────────────────────────────────────────────────────
export function useAbsences() {
  return useQuery({
    queryKey: ['attendance', 'absences'],
    queryFn: () => api.get('/api/attendance/absences'),
  });
}

export function useCreateAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/api/attendance/absences', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useUpdateAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/attendance/absences/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}
