import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "donor" | "ngo" | "vendor" | "field" | "auditor" | "admin" | "guest";
export type Theme = "light" | "dark";

export interface UserInfo {
  name: string;
  email: string;
}

interface UIState {
  role: Role;
  setRole: (r: Role) => void;
  user: UserInfo | null;
  setUser: (u: UserInfo | null) => void;
  orgId: string | null;
  setOrgId: (id: string | null) => void;
  signOut: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNav: (open: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
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
      setUser: (user) => set({ user }),
      orgId: null,
      setOrgId: (orgId) => set({ orgId }),
      signOut: () => set({ role: "guest", user: null, orgId: null, mobileNavOpen: false }),
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      mobileNavOpen: false,
      setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
      theme: initialTheme(),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "rahatsetu_ui",
      partialize: (s) => ({ role: s.role, user: s.user, orgId: s.orgId, theme: s.theme, sidebarOpen: s.sidebarOpen }) as UIState,
    },
  ),
);
