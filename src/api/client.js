/**
 * API Client with JWT authentication
 * Handles token refresh, error handling, and base URL configuration
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

let accessToken = null;
let refreshToken = localStorage.getItem('_biz_refresh') || null;

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

// ── Token Refresh ────────────────────────────────────────────────────────────

let _refreshPromise = null; // Prevent multiple simultaneous refreshes

const doRefresh = async () => {
  if (!refreshToken) return false;
  // If already refreshing, wait for that promise
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

  // Auto-refresh on 401
  if (res.status === 401 && refreshToken) {
    const refreshed = await doRefresh();
    if (refreshed) {
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${url}`, { ...opts, headers });
    }
  }

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
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
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
};
