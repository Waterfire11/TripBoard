import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  isMobile: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      isMobile: false,

      toggleSidebar: () => set((state) => ({
        sidebarOpen: !state.sidebarOpen,
      })),

      setSidebarOpen: (open: boolean) => set({
        sidebarOpen: open,
      }),

      setIsMobile: (mobile: boolean) => set({
        isMobile: mobile,
        // Auto-close sidebar when switching to mobile
        sidebarOpen: mobile ? false : true,
      }),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
      } as const),
    }
  )
);