import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  dayHeading,
  todayYmd,
  type DatesResponse,
  type Occasion,
} from "@crm/shared";
import { api } from "../api.ts";
import { OccasionFormModal } from "../components/OccasionFormModal.tsx";

export function DatesPage() {
  const [data, setData] = useState<DatesResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Occasion | null | "new">(null);
  const today = todayYmd();

  const load = useCallback(async () => {
    try {
      const [dates, tags] = await Promise.all([
        api<DatesResponse>(`/api/dates?today=${today}`),
        api<string[]>(`/api/dates/tags?today=${today}`),
      ]);
      setData(dates);
      setSuggestions(tags);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dates");
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSaved() {
    setEditing(null);
    void load();
  }

  if (error && !data) return <p className="text-rose">{error}</p>;

  const empty = data && data.days.length === 0;

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Dates</h1>
          <p className="mt-1 text-ink-soft">Upcoming occasions and birthdays.</p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-ink px-4 py-2 text-sm text-paper hover:bg-ink/90"
          onClick={() => setEditing("new")}
        >
          Add occasion
        </button>
      </header>

      {error ? <p className="mb-4 text-rose">{error}</p> : null}

      {!data ? (
        <p className="text-ink-soft">Loading…</p>
      ) : empty ? (
        <div className="rounded-xl border border-dashed border-line p-12 text-center text-ink-soft">
          Nothing coming up. Add an occasion, or set a birthday on someone.
        </div>
      ) : (
        <ol className="space-y-8">
          {data.days.map((group) => (
            <li key={group.date}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                {dayHeading(group.date, today)}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.occasions.map((occasion) => (
                  <li key={occasion.id}>
                    <div
                      className="flex cursor-pointer flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 hover:border-accent"
                      onClick={() => setEditing(occasion)}
                    >
                      <span className="font-medium">{occasion.title}</span>
                      {occasion.tags.map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </div>
                  </li>
                ))}
                {group.birthdays.map((person) => (
                  <li key={person.id}>
                    <Link
                      to={`/people/${person.id}`}
                      className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 hover:border-accent"
                    >
                      <span className="font-medium">{person.name}</span>
                      <span className="text-sm text-ink-soft">birthday</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {editing !== null ? (
        <OccasionFormModal
          occasion={editing === "new" ? null : editing}
          suggestions={suggestions}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  );
}

function TagChip({ tag }: { tag: string }) {
  function onClick(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <Link
      to={`/people?tag=${encodeURIComponent(tag)}`}
      onClick={onClick}
      className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-sm text-ink-soft hover:border-ink hover:text-ink"
    >
      {tag}
    </Link>
  );
}
