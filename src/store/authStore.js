import { create } from 'zustand';
import { authApi } from '../api/client';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    const data = await authApi.login(username, password);
    set({ user: data.user, isAuthenticated: true });
    return data.user;
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null, isAuthenticated: false });
  },

  tryRestore: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.tryRestore();
      if (user) {
        set({ user, isAuthenticated: true });
      }
    } catch {}
    set({ isLoading: false });
  },
}));

export default useAuthStore;
