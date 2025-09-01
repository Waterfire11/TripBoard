import { create } from "zustand";
import { persist } from "zustand/middleware";

// This User interface matches exactly what the useAuth is providing
export interface User {
  id: string;  //useAuth converts number to string
  email: string;
  name: string;  //useAuth combines first_name + last_name into name
  avatar?: string;
  createdAt: string;  //useAuth maps created_at to createdAt
}

interface SessionState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions - keeping the exact same signature your useAuth expects
  setUser: (user: User, token: string) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      clearUser: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "session-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      } as const),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Rehydration complete — now we can set auth state
          if (state.user && state.token) {
            state.isAuthenticated = true;
          }
          state.isLoading = false;
        }
      },
    }
  )
);