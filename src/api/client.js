/**
 * API Client with JWT authentication
 * Handles token refresh, error handling, and base URL configuration
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

let accessToken = null;
let refreshToken = localStorage.getItem('_biz_refresh') || null;

// Platform admin token — stored in sessionStorage (cleared on tab close)
const PLATFORM_KEY = '_biz_platform_token';

// ── Token Management ─────────────────────────────────────────────────────────

export const setTokens = (access, refresh) => {
  accessToken = access;
  refreshToken = refresh;
  if (refresh) localStorage.setItem('_biz_refresh', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('_biz_refresh');
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

// Platform token helpers
export const setPlatformToken = (token) => {
  sessionStorage.setItem(PLATFORM_KEY, token);
};

export const clearPlatformToken = () => {
  sessionStorage.removeItem(PLATFORM_KEY);
};

export const getPlatformToken = () => sessionStorage.getItem(PLATFORM_KEY) || null;

// Set impersonation token as active access token (no refresh)
export const setTokensFromPlatform = (impersonationToken) => {
  accessToken = impersonationToken;
  // No refresh token for impersonation — it expires naturally
};

// ── Token Refresh ────────────────────────────────────────────────────────────

let _refreshPromise = null;

const doRefresh = async () => {
  if (!refreshToken) return false;
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
};

// ── Core Fetch Wrapper ───────────────────────────────────────────────────────

export const apiFetch = async (url, opts = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(opts.headers || {}),
  };

  let res = await fetch(`${API_BASE}${url}`, { ...opts, headers });

  // Auto-refresh on 401 (only for regular user tokens, not impersonation)
  if (res.status === 401 && refreshToken) {
    const refreshed = await doRefresh();
    if (refreshed) {
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${url}`, { ...opts, headers });
    }
  }

  // Tenant suspended — dispatch event so the UI can react
  if (res.status === 403) {
    const clone = res.clone();
    try {
      const data = await clone.json();
      if (data.code === 'TENANT_SUSPENDED') {
        window.dispatchEvent(new CustomEvent('tenant-suspended'));
      }
    } catch {}
  }

  return res;
};

// Platform fetch — uses platform token from sessionStorage
const platformFetch = async (url, opts = {}) => {
  const platToken = getPlatformToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(platToken ? { Authorization: `Bearer ${platToken}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(`${API_BASE}${url}`, { ...opts, headers });
  return res;
};

// ── Convenience Methods ──────────────────────────────────────────────────────

const buildErr = async (res) => {
  const j = await res.json().catch(() => ({}));
  let msg = j.error || res.statusText || `HTTP ${res.status}`;
  if (j.detail && j.detail !== msg) msg += ` — ${j.detail}`;
  return new Error(msg);
};

export const api = {
  get: async (url) => {
    const res = await apiFetch(url);
    if (!res.ok) throw await buildErr(res);
    return res.json();
  },

  post: async (url, data) => {
    const res = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await buildErr(res);
    return res.json();
  },

  put: async (url, data) => {
    const res = await apiFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await buildErr(res);
    return res.json();
  },

  patch: async (url, data) => {
    const res = await apiFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await buildErr(res);
    return res.json();
  },

  delete: async (url) => {
    const res = await apiFetch(url, { method: 'DELETE' });
    if (!res.ok) throw await buildErr(res);
    return res.json();
  },

  upload: async (url, file) => {
    const res = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) throw await buildErr(res);
    return res.json();
  },
};

// ── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Login failed');
      err.code = data.code;
      throw err;
    }
    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  logout: async (reason = 'manual') => {
    try {
      await apiFetch(`/api/auth/logout?reason=${reason}`, { method: 'POST' });
    } catch {}
    clearTokens();
  },

  me: async () => {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) return null;
    return res.json();
  },

  tryRestore: async () => {
    if (!refreshToken) return null;
    const refreshed = await doRefresh();
    if (!refreshed) return null;
    return authApi.me();
  },

  forgotPassword: async (email) => {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  },

  resetPassword: async (token, newPassword) => {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  },

  mfa: {
    complete: async (mfaToken, code) => {
      const res = await fetch(`${API_BASE}/api/auth/mfa/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, code }),
      });
      const data = await res.json();
      if (!res.ok) { const e = new Error(data.error || 'Failed'); e.code = data.code; throw e; }
      return data;
    },
    setup: async () => api.post('/api/auth/mfa/setup', {}),
    verifySetup: async (code) => api.post('/api/auth/mfa/verify-setup', { code }),
    disable: async (password) => api.post('/api/auth/mfa/disable', { password }),
    status: async () => api.get('/api/auth/mfa/status'),
    forcedSetup: async (setupToken) => {
      const res = await fetch(`${API_BASE}/api/auth/mfa/forced-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      return data;
    },
    forcedVerify: async (setupToken, code) => {
      const res = await fetch(`${API_BASE}/api/auth/mfa/forced-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken, code }),
      });
      const data = await res.json();
      if (!res.ok) { const e = new Error(data.error || 'Failed'); e.code = data.code; throw e; }
      return data;
    },
  },
};

// ── Platform Admin API ───────────────────────────────────────────────────────

export const platformApi = {
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/api/platform/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  me: async (token) => {
    const res = await fetch(`${API_BASE}/api/platform/auth/login`, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  },

  tenants: {
    list: async () => {
      const res = await platformFetch('/api/platform/tenants');
      if (!res.ok) throw new Error('Failed to fetch tenants');
      return res.json();
    },

    get: async (id) => {
      const res = await platformFetch(`/api/platform/tenants/${id}`);
      if (!res.ok) throw new Error('Failed to fetch tenant');
      return res.json();
    },

    create: async (data) => {
      const res = await platformFetch('/api/platform/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create tenant');
      return json;
    },

    update: async (id, data) => {
      const res = await platformFetch(`/api/platform/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update tenant');
      return json;
    },

    setStatus: async (id, status) => {
      const res = await platformFetch(`/api/platform/tenants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update status');
      return json;
    },

    impersonate: async (id) => {
      const res = await platformFetch(`/api/platform/tenants/${id}/impersonate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to impersonate tenant');
      return json;
    },

    users: {
      list: async (tenantId) => {
        const res = await platformFetch(`/api/platform/tenants/${tenantId}/users`);
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      },

      resetPassword: async (tenantId, userId, newPassword) => {
        const res = await platformFetch(
          `/api/platform/tenants/${tenantId}/users/${userId}/reset-password`,
          { method: 'POST', body: JSON.stringify({ newPassword }) }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to reset password');
        return json;
      },
    },
  },

  loginHistory: async ({ page = 1, limit = 50, tenantId = '', userId = '', dateFrom = '', dateTo = '' } = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries({ page, limit, tenantId, userId, dateFrom, dateTo }).filter(([, v]) => v))
    ).toString();
    const res = await platformFetch(`/api/platform/login-history${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error('Failed to fetch login history');
    return res.json();
  },
};
