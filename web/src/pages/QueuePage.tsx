import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  SNOOZE_DAYS,
  SNOOZE_LABELS,
  type BirthdayItem,
  type QueueItem,
  type Settings,
  type SnoozeDays,
} from "@crm/shared";
import { api } from "../api.ts";
import { Avatar } from "../components/Avatar.tsx";
import { channelLabel, formatWhen, tierLabel } from "../format.ts";

type QueueResponse = {
  due: QueueItem[];
  birthdays: BirthdayItem[];
  tierDays: Settings["tierDays"];
};

export function QueuePage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setData(await api<QueueResponse>("/api/queue"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load queue");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function snooze(id: string, days: SnoozeDays) {
    await api(`/api/people/${id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ days }),
    });
    await load();
  }

  if (error) return <p className="text-rose">{error}</p>;
  if (!data) return <p className="text-ink-soft">Loading queue…</p>;

  return (
    <div>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">People to reach</h1>
          <p className="mt-1 text-ink-soft">
            Due when the last conversation is older than their cadence.
          </p>
        </div>
        <Link
          to="/people/new"
          className="rounded-lg bg-ink px-4 py-2 text-sm text-paper hover:bg-ink/90"
        >
          Add person
        </Link>
      </header>

      {data.birthdays.length > 0 ? (
        <section className="mb-8 rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Birthdays this week
          </h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {data.birthdays.map((item) => (
              <li key={item.person.id}>
                <Link
                  to={`/people/${item.person.id}`}
                  className="flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-sm hover:border-accent"
                >
                  <Avatar name={item.person.name} photoUrl={item.person.photoUrl} />
                  <span>{item.person.name}</span>
                  <span className="text-ink-soft">
                    {item.daysUntil === 0 ? "today" : `in ${item.daysUntil}d`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.due.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-12 text-center text-ink-soft">
          Nobody is due. Enjoy the quiet, or{" "}
          <Link className="text-accent underline" to="/people">
            browse everyone
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Last conversation</th>
                <th className="px-4 py-3 font-medium">Snooze</th>
              </tr>
            </thead>
            <tbody>
              {data.due.map((person) => (
                <tr key={person.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/people/${person.id}`} className="flex items-center gap-3">
                      <Avatar name={person.name} photoUrl={person.photoUrl} />
                      <span>
                        <span className="block font-medium">{person.name}</span>
                        <span className="text-ink-soft">
                          {person.organization || tierLabel(person.tier)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {person.neverContacted ? (
                      <span className="text-rose">Never contacted</span>
                    ) : (
                      <span className="text-accent">
                        {person.daysOverdue === 0
                          ? "Due today"
                          : `${person.daysOverdue}d overdue`}
                      </span>
                    )}
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <p className="text-ink-soft">{formatWhen(person.lastInteractionAt)}</p>
                    <p className="truncate">
                      {person.lastInteractionPreview
                        ? person.lastInteractionPreview
                        : channelLabel(person.lastInteractionChannel)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {SNOOZE_DAYS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:border-ink hover:text-ink"
                          onClick={() => void snooze(person.id, days)}
                        >
                          {SNOOZE_LABELS[days]}
                        </button>
                      ))}
                    </div>
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
