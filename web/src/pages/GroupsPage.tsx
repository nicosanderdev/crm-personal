import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { GroupSummary } from "@crm/shared";
import { api } from "../api.ts";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";

export function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<GroupSummary[]>("/api/groups")
      .then(setGroups)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load groups");
      });
  }, []);

  if (error) return <p className="text-rose">{error}</p>;

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Groups</h1>
          <p className="mt-1 text-ink-soft">Write one note onto several people.</p>
        </div>
        <Link
          to="/groups/new"
          className="rounded-lg bg-ink px-4 py-2 text-sm text-paper hover:bg-ink/90"
        >
          New group
        </Link>
      </header>
      {!groups ? (
        <LoadingSpinner />
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-12 text-center text-ink-soft">
          No groups yet. Create one for a chat or a party, then log what you shared.
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                to={`/groups/${group.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper"
              >
                <span className="font-medium">{group.name}</span>
                <span className="text-sm text-ink-soft">{memberCount(group.memberCount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function memberCount(count: number): string {
  if (count === 0) return "No people yet";
  if (count === 1) return "1 person";
  return `${count} people`;
}
