import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "donor" | "ngo" | "vendor" | "field" | "auditor" | "admin" | "pending" | "guest";
export type Theme = "light" | "dark";

export interface UserInfo {
  id?: string;
  name: string;
  email: string;
  role?: string;
  organizationId?: string;
  emailVerified?: boolean;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
}

interface UIState {
  role: Role;
  setRole: (r: Role) => void;
  user: UserInfo | null;
  setUser: (u: UserInfo | null) => void;
  signOut: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNav: (open: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  isAuthenticated: boolean;
  setAuthenticated: (auth: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

function initialTheme(): Theme {
  if (typeof document !== "undefined") {
    const el = document.documentElement.getAttribute("data-theme");
    if (el === "dark" || el === "light") return el;
  }
  try {
    const s = localStorage.getItem("rahatsetu_theme");
    if (s === "dark" || s === "light") return s;
  } catch { /* noop */ }
  return "light";
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      role: "guest",
      setRole: (role) => set({ role }),
      user: null,
      setUser: (user) => set({ user, role: (user?.role?.toLowerCase() as any) || "guest", isAuthenticated: !!user }),
      signOut: () => set({ role: "guest", user: null, mobileNavOpen: false, isAuthenticated: false }),
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      mobileNavOpen: false,
      setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
      theme: initialTheme(),
      setTheme: (theme) => set({ theme }),
      isAuthenticated: false,
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      loading: true,
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "rahatsetu_ui",
      partialize: (s) => ({ role: s.role, user: s.user, theme: s.theme, sidebarOpen: s.sidebarOpen, isAuthenticated: s.isAuthenticated }) as UIState,
    },
  ),
);