export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = "crm.token";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://crm-personal-api.onrender.com"
).replace(/\/$/, "");

type TokenStore = {
  get: () => Promise<string | null>;
  set: (token: string) => Promise<void>;
  clear: () => Promise<void>;
};

let tokenStore: TokenStore | null = null;
let onUnauthorized: (() => void) | null = null;

export function configureApi(store: TokenStore, unauthorized: () => void): void {
  tokenStore = store;
  onUnauthorized = unauthorized;
}

function shouldClearSession(path: string): boolean {
  return path !== "/api/auth/token" && path !== "/api/auth/login";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body != null && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = tokenStore ? await tokenStore.get() : null;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    if (res.status === 401 && shouldClearSession(path)) {
      await tokenStore?.clear();
      onUnauthorized?.();
    }
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: string }).error)
        : res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export { TOKEN_KEY };
