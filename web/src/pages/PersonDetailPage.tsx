import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CHANNELS,
  CHANNEL_LABELS,
  type Channel,
  type Interaction,
  type Person,
} from "@crm/shared";
import { api } from "../api.ts";
import { Avatar } from "../components/Avatar.tsx";
import { channelLabel, formatDay, formatWhen, tierLabel, todayInput } from "../format.ts";

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>("message");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayInput);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    const [nextPerson, nextInteractions] = await Promise.all([
      api<Person>(`/api/people/${id}`),
      api<Interaction[]>(`/api/people/${id}/interactions`),
    ]);
    setPerson(nextPerson);
    setInteractions(nextInteractions);
    if (nextPerson.preferredChannel) setChannel(nextPerson.preferredChannel);
  }

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load person");
    });
  }, [id]);

  async function logInteraction(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    try {
      await api(`/api/people/${id}/interactions`, {
        method: "POST",
        body: JSON.stringify({ date, channel, notes }),
      });
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function togglePause() {
    if (!person) return;
    const path = person.pausedAt
      ? `/api/people/${person.id}/unpause`
      : `/api/people/${person.id}/pause`;
    setPerson(await api<Person>(path, { method: "POST" }));
  }

  async function remove() {
    if (!person) return;
    if (!window.confirm(`Delete ${person.name}? This also deletes their history.`)) return;
    await api(`/api/people/${person.id}`, { method: "DELETE" });
    navigate("/people");
  }

  if (error && !person) return <p className="text-rose">{error}</p>;
  if (!person) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <Link to="/people" className="text-sm text-ink-soft hover:text-ink">
        ← People
      </Link>
      <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar name={person.name} photoUrl={person.photoUrl} size="md" />
          <div>
            <h1 className="font-serif text-4xl">{person.name}</h1>
            <p className="text-ink-soft">
              {[person.role, person.organization].filter(Boolean).join(" · ") || "No organization"}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {tierLabel(person.tier)}
              {person.pausedAt ? " · paused" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/people/${person.id}/edit`}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:border-ink"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => void togglePause()}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:border-ink"
          >
            {person.pausedAt ? "Unpause" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            className="rounded-lg border border-line px-3 py-2 text-sm text-rose hover:border-rose"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-6">
          {person.nextTalkingPoint ? (
            <div className="rounded-xl border border-line bg-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Next talking point
              </h2>
              <p className="mt-2">{person.nextTalkingPoint}</p>
            </div>
          ) : null}
          <dl className="grid gap-4 rounded-xl border border-line bg-card p-5 sm:grid-cols-2">
            <Item label="How you met" value={person.howWeMet} />
            <Item label="City" value={[person.city, person.timezone].filter(Boolean).join(" · ")} />
            <Item label="Birthday" value={person.birthday} />
            <Item label="Preferred channel" value={person.preferredChannel ? channelLabel(person.preferredChannel) : ""} />
            <Item label="Phone" value={person.phone} />
            <Item label="Email" value={person.email} />
            <Item
              label="Tags"
              value={person.tags.length ? person.tags.join(", ") : ""}
            />
            <Item
              label="Links"
              value={
                person.socialLinks.length
                  ? person.socialLinks.map((l) => `${l.type}: ${l.value}`).join(" · ")
                  : ""
              }
            />
          </dl>
          <div>
            <h2 className="font-serif text-2xl">History</h2>
            {interactions.length === 0 ? (
              <p className="mt-3 text-ink-soft">No conversations logged yet.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {interactions.map((item) => (
                  <li key={item.id} className="rounded-xl border border-line bg-card p-4">
                    <p className="text-sm text-ink-soft">
                      {formatDay(item.date)} · {CHANNEL_LABELS[item.channel]}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{item.notes || "—"}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <aside>
          <form
            onSubmit={(e) => void logInteraction(e)}
            className="sticky top-6 space-y-3 rounded-xl border border-line bg-card p-5"
          >
            <h2 className="font-serif text-2xl">Log a conversation</h2>
            <p className="text-sm text-ink-soft">
              Last touch: {formatWhen(person.lastInteractionAt)}
            </p>
            <label className="block text-sm">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Channel
              <select
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Where it was going
              <textarea
                className="mt-1 min-h-32 w-full rounded-lg border border-line bg-paper px-3 py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What you talked about, what to pick up next time…"
              />
            </label>
            {error ? <p className="text-sm text-rose">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-ink py-2 text-sm text-paper disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save interaction"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
