import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../api/client';

export function usePlatformTenants() {
  return useQuery({
    queryKey: ['platform-tenants'],
    queryFn: () => platformApi.tenants.list(),
    select: (data) => data?.data || [],
  });
}

export function usePlatformTenant(id) {
  return useQuery({
    queryKey: ['platform-tenant', id],
    queryFn: () => platformApi.tenants.get(id),
    enabled: !!id,
  });
}
