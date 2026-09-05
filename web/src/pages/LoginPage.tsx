import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../api.ts";
import { useAuth } from "../auth.tsx";

export function LoginPage() {
  const { me, loading, refresh } = useAuth();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!loading && me) {
    return <Navigate to={from} replace />;
  }
  if (done) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refresh();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 shadow-[0_20px_60px_-40px_rgba(28,22,18,0.6)]">
        <p className="font-serif text-3xl">Circle</p>
        <p className="mt-2 text-ink-soft">Your people, and when you last reached them.</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-xs text-ink-soft">
          No public signup. Create the account with <code>npm run create-user</code> on
          your machine.
        </p>
      </div>
    </div>
  );
}
