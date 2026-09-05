import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Me } from "@crm/shared";
import { ApiError, api } from "./api.ts";

type AuthValue = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const next = await api<Me>("/api/auth/me");
      setMe(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setMe(null);
      } else {
        setMe(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      me,
      loading,
      refresh,
      logout: async () => {
        await api("/api/auth/logout", { method: "POST" });
        setMe(null);
      },
    }),
    [me, loading],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return createElement(
      "div",
      { className: "grid min-h-screen place-items-center text-ink-soft" },
      "Loading…",
    );
  }
  if (!me) {
    return createElement(Navigate, { to: "/login", replace: true, state: { from: location } });
  }
  return children;
}
