import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  initialized: boolean;
  setAuth: (token: string, user?: User | null) => void;
  setUser: (user: User | null) => void;
  setInitialized: (v: boolean) => void;
  clear: () => void;
}

/** Access token is kept in memory only (not localStorage); on reload it is
 *  re-obtained via the httpOnly refresh cookie. */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  initialized: false,
  setAuth: (token, user) => set((s) => ({ accessToken: token, user: user ?? s.user })),
  setUser: (user) => set({ user }),
  setInitialized: (v) => set({ initialized: v }),
  clear: () => set({ accessToken: null, user: null }),
}));

// Non-React accessors for the axios interceptor.
export const authBridge = {
  get token() {
    return useAuthStore.getState().accessToken;
  },
  set(token: string | null) {
    useAuthStore.setState({ accessToken: token });
  },
  clear() {
    useAuthStore.getState().clear();
  },
};
