import { create } from 'zustand';
import { authApi, platformApi, setTokens, clearTokens, setPlatformToken, clearPlatformToken, getPlatformToken, setTokensFromPlatform } from '../api/client';
import queryClient from '../queryClient';

const useAuthStore = create((set, get) => ({
  // Regular user state
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Platform admin state
  isPlatformAdmin: false,
  platformAdmin: null,

  // Impersonation state (platform admin acting as tenant)
  impersonating: null,

  // ── Regular user actions ────────────────────────────────────────────────────

  login: async (username, password) => {
    const data = await authApi.login(username, password);
    // Admin-required MFA setup (user hasn't set up MFA yet but is required to)
    if (data.mfaSetupRequired) return { mfaSetupRequired: true, setupToken: data.setupToken };
    // MFA required — return the mfaToken so LoginPage can show the code step
    if (data.mfaRequired) return { mfaRequired: true, mfaToken: data.mfaToken };
    await queryClient.cancelQueries();
    queryClient.clear();
    set({ user: data.user, isAuthenticated: true, isPlatformAdmin: false, impersonating: null });
    return data.user;
  },

  mfaComplete: async (mfaToken, code) => {
    const data = await authApi.mfa.complete(mfaToken, code);
    setTokens(data.accessToken, data.refreshToken);
    await queryClient.cancelQueries();
    queryClient.clear();
    set({ user: data.user, isAuthenticated: true });
    return data.user;
  },

  logout: async (reason = 'manual') => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try { await authApi.logout(reason); } catch {}
    clearTokens();
    clearPlatformToken();
    set({ user: null, isAuthenticated: false, isPlatformAdmin: false, platformAdmin: null, impersonating: null });
  },

  tryRestore: async () => {
    set({ isLoading: true });
    try {
      // Try platform admin token first (sessionStorage)
      const platToken = getPlatformToken();
      if (platToken) {
        try {
          const admin = await platformApi.me(platToken);
          if (admin) {
            set({ isPlatformAdmin: true, platformAdmin: admin, isAuthenticated: false, user: null, isLoading: false });
            return;
          }
        } catch {}
        clearPlatformToken();
      }

      // Try regular user restore
      const user = await authApi.tryRestore();
      if (user) {
        set({ user, isAuthenticated: true });
      }
    } catch {}
    set({ isLoading: false });
  },

  // ── Platform admin actions ──────────────────────────────────────────────────

  platformLogin: async (username, password) => {
    const data = await platformApi.login(username, password);
    setPlatformToken(data.accessToken);
    set({
      isPlatformAdmin: true,
      platformAdmin: data.admin,
      isAuthenticated: false,
      user: null,
      impersonating: null,
    });
    return data.admin;
  },

  platformLogout: () => {
    clearPlatformToken();
    clearTokens();
    set({ isPlatformAdmin: false, platformAdmin: null, impersonating: null });
  },

  // Enter a tenant as impersonator — gets scoped token, switches context
  enterTenant: async (tenantId, tenantName) => {
    const data = await platformApi.tenants.impersonate(tenantId);
    setTokensFromPlatform(data.accessToken);
    await queryClient.cancelQueries();
    queryClient.clear();
    set({
      impersonating: { tenantId, tenantName },
      isAuthenticated: true,
      user: {
        id: get().platformAdmin?.id,
        username: `platform:${get().platformAdmin?.username}`,
        userType: 'superAdmin',
        firstName: 'Platform',
        lastName: 'Admin',
      },
    });
    return data;
  },

  // Exit impersonation — restore platform token context
  exitTenant: async () => {
    clearTokens();
    await queryClient.cancelQueries();
    queryClient.clear();
    set({ impersonating: null, isAuthenticated: false, user: null });
  },
}));

export default useAuthStore;
