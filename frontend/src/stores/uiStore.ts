import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PaletteMode } from '@mui/material';

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  themeMode: PaletteMode;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      themeMode: 'dark',
      toggleTheme: () => set({ themeMode: get().themeMode === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'ui-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);