import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 0,           // evict unused queries immediately — no cross-tenant leakage
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;
