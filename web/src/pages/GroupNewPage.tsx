import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { GroupDetail, Person } from "@crm/shared";
import { api } from "../api.ts";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";

export function GroupNewPage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<Person[]>("/api/people")
      .then(setPeople)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load people");
      });
  }, []);

  function toggle(id: string) {
    setMemberIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const group = await api<GroupDetail>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name, memberIds }),
      });
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
      setBusy(false);
    }
  }

  const needle = query.trim().toLowerCase();
  const visible = (people ?? []).filter((person) => {
    if (!needle) return true;
    return person.name.toLowerCase().includes(needle);
  });

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/groups" className="text-sm text-ink-soft hover:text-ink">
        ← Groups
      </Link>
      <h1 className="mt-4 font-serif text-4xl">New group</h1>
      <p className="mt-1 text-ink-soft">A name is enough. Add people now or later.</p>
      {error && !people ? <p className="mt-8 text-sm text-rose">{error}</p> : null}
      {!people && !error ? (
        <div className="mt-8">
          <LoadingSpinner />
        </div>
      ) : null}
      {people ? (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          <label className="block text-sm">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
            />
          </label>
          <div>
            <p className="text-sm">People</p>
            <input
              className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
              placeholder="Filter by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {people.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No people yet.</p>
            ) : (
              <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto rounded-xl border border-line bg-card p-2">
                {visible.map((person) => (
                  <li key={person.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-paper">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(person.id)}
                        onChange={() => toggle(person.id)}
                      />
                      <span>
                        {person.name}
                        {person.pausedAt ? (
                          <span className="text-ink-soft"> · paused</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
                {visible.length === 0 ? (
                  <li className="px-2 py-1.5 text-sm text-ink-soft">No matching people.</li>
                ) : null}
              </ul>
            )}
          </div>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
          >
            {busy ? "Saving…" : "Create group"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
