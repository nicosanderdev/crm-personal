import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Person } from "@crm/shared";
import { api } from "../api.ts";
import { Avatar } from "../components/Avatar.tsx";
import { formatWhen, tierLabel } from "../format.ts";

export function PeoplePage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      void api<Person[]>(`/api/people?q=${encodeURIComponent(q)}`)
        .then(setPeople)
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not load people");
        });
    }, 150);
    return () => clearTimeout(handle);
  }, [q]);

  if (error) return <p className="text-rose">{error}</p>;

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">People</h1>
          <p className="mt-1 text-ink-soft">Everyone in your circle.</p>
        </div>
        <Link
          to="/people/new"
          className="rounded-lg bg-ink px-4 py-2 text-sm text-paper hover:bg-ink/90"
        >
          Add person
        </Link>
      </header>
      <input
        className="mb-6 w-full max-w-md rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent"
        placeholder="Search name, organization, tags…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {!people ? (
        <p className="text-ink-soft">Loading…</p>
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-12 text-center text-ink-soft">
          No people yet. Add someone, or import a CSV.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Last contact</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/people/${person.id}`} className="flex items-center gap-3">
                      <Avatar name={person.name} photoUrl={person.photoUrl} />
                      <span>
                        {person.name}
                        {person.pausedAt ? (
                          <span className="ml-2 text-xs text-ink-soft">paused</span>
                        ) : null}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{person.organization || "—"}</td>
                  <td className="px-4 py-3">{tierLabel(person.tier)}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {formatWhen(person.lastInteractionAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link className="text-accent hover:underline" to={`/people/${person.id}/edit`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
