import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth.types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const decodeJwt = (token: string): Record<string, unknown> => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setTokens: (accessToken: string, refreshToken: string) => {
        const payload = decodeJwt(accessToken);
        const user: AuthUser = {
          username: String(payload.sub ?? payload.username ?? ''),
          role: (payload.role as AuthUser['role']) ?? 'REGULAR',
        };
        set({ accessToken, refreshToken, user });
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null });
        window.location.href = '/login';
      },
    }),
    {
      name: 'auth-session',
      // sessionStorage: очищается при закрытии вкладки, изолирован между вкладками
      storage: createJSONStorage(() => sessionStorage),
      // accessToken остаётся только в памяти (не персистируется)
      // refreshToken сохраняется для автообновления при перезагрузке страницы
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    }
  )
);