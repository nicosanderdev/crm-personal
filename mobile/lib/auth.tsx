import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import type { Me } from "@crm/shared";
import { TOKEN_KEY, api, configureApi } from "./api";

type AuthValue = {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function readToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function writeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const logoutLocal = useCallback(async () => {
    await clearToken();
    setMe(null);
  }, []);

  useEffect(() => {
    configureApi(
      { get: readToken, set: writeToken, clear: clearToken },
      () => {
        setMe(null);
      },
    );
  }, []);

  const refresh = useCallback(async () => {
    const token = await readToken();
    if (!token) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      setMe(await api<Me>("/api/auth/me"));
    } catch {
      await clearToken();
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      me,
      loading,
      login: async (email: string, password: string) => {
        const result = await api<{ email: string; token: string }>("/api/auth/token", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        await writeToken(result.token);
        setMe({ email: result.email });
      },
      logout: async () => {
        try {
          await api("/api/auth/logout", { method: "POST" });
        } catch {
          // Session is gone locally either way.
        }
        await logoutLocal();
      },
    }),
    [me, loading, logoutLocal],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
