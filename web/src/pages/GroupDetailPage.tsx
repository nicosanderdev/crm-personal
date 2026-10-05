import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CHANNELS,
  CHANNEL_LABELS,
  type Channel,
  type GroupDetail,
  type GroupLog,
  type GroupMember,
  type Person,
} from "@crm/shared";
import { api } from "../api.ts";
import { formatDay, todayInput } from "../format.ts";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [directory, setDirectory] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [addId, setAddId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayInput);
  const [channel, setChannel] = useState<Channel>("message");
  const [notes, setNotes] = useState("");
  const [countsAsContact, setCountsAsContact] = useState<boolean | null>(null);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(groupId: string) {
    const [nextGroup, people] = await Promise.all([
      api<GroupDetail>(`/api/groups/${groupId}`),
      api<Person[]>("/api/people"),
    ]);
    return { group: nextGroup, people };
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void load(id)
      .then((next) => {
        if (cancelled) return;
        setDirectory(next.people);
        setGroup(next.group);
        setName(next.group.name);
        setDate(todayInput());
        setChannel("message");
        setNotes("");
        setCountsAsContact(null);
        setEditingId(null);
        setAudienceIds(next.group.members.map((member) => member.id));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load group");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function resetDraft(members: GroupMember[]) {
    setEditingId(null);
    setDate(todayInput());
    setChannel("message");
    setNotes("");
    setCountsAsContact(null);
    setAudienceIds(members.map((member) => member.id));
  }

  async function saveMembers(memberIds: string[]) {
    if (!group || busy) return;
    const previousName = group.name;
    const previousMembers = group.members.map((member) => member.id);
    setBusy(true);
    setError(null);
    try {
      const next = await api<GroupDetail>(`/api/groups/${group.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: group.name, memberIds }),
      });
      setGroup(next);
      setName((current) => (current.trim() === previousName ? next.name : current));
      if (editingId) {
        const allowed = allowedAudience(next, editingId);
        setAudienceIds((current) => current.filter((personId) => allowed.has(personId)));
      } else {
        const previous = new Set(previousMembers);
        const added = next.members
          .map((member) => member.id)
          .filter((personId) => !previous.has(personId));
        const still = new Set(next.members.map((member) => member.id));
        setAudienceIds((current) => [
          ...current.filter((personId) => still.has(personId)),
          ...added.filter((personId) => !current.includes(personId)),
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update members");
    } finally {
      setBusy(false);
    }
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!group) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api<GroupDetail>(`/api/groups/${group.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: trimmed,
          memberIds: group.members.map((member) => member.id),
        }),
      });
      setGroup(next);
      setName(next.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename group");
    } finally {
      setBusy(false);
    }
  }

  async function removeGroup() {
    if (!group) return;
    if (
      !window.confirm(
        `Delete ${group.name}? Past logs stay on people's timelines and can no longer be changed.`,
      )
    ) {
      return;
    }
    await api(`/api/groups/${group.id}`, { method: "DELETE" });
    navigate("/groups");
  }

  function startEdit(log: GroupLog) {
    setEditingId(log.id);
    setDate(log.date.slice(0, 10));
    setChannel(log.channel);
    setNotes(log.notes);
    setCountsAsContact(log.countsAsContact);
    setAudienceIds(log.audience.map((person) => person.id));
    setError(null);
    document.getElementById("group-log-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveLog(e: FormEvent) {
    e.preventDefault();
    if (!group || countsAsContact === null || audienceIds.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const path = editingId
        ? `/api/groups/${group.id}/logs/${editingId}`
        : `/api/groups/${group.id}/logs`;
      await api(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({ date, channel, notes, countsAsContact, audienceIds }),
      });
      const next = await api<GroupDetail>(`/api/groups/${group.id}`);
      setGroup(next);
      setName(next.name);
      resetDraft(next.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save log");
    } finally {
      setBusy(false);
    }
  }

  async function removeLog(log: GroupLog) {
    if (!group) return;
    if (!window.confirm("Delete this log? It leaves everyone's timeline.")) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/groups/${group.id}/logs/${log.id}`, { method: "DELETE" });
      const next = await api<GroupDetail>(`/api/groups/${group.id}`);
      setGroup(next);
      if (editingId === log.id) resetDraft(next.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete log");
    } finally {
      setBusy(false);
    }
  }

  if (error && !group) return <p className="text-rose">{error}</p>;
  if (!group) return <p className="text-ink-soft">Loading…</p>;

  const memberIds = new Set(group.members.map((member) => member.id));
  const available = directory
    .filter((person) => !memberIds.has(person.id))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const editing = group.logs.find((log) => log.id === editingId) ?? null;
  const choices = checklist(group.members, editing);
  const canSaveLog = countsAsContact !== null && audienceIds.length > 0 && !busy;

  return (
    <div>
      <Link to="/groups" className="text-sm text-ink-soft hover:text-ink">
        ← Groups
      </Link>
      <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-serif text-4xl">{group.name}</h1>
          <form onSubmit={(e) => void saveName(e)} className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-sm">
              <span className="sr-only">Name</span>
              <input
                className="rounded-lg border border-line bg-card px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                aria-label="Group name"
              />
            </label>
            <button
              type="submit"
              disabled={busy || name.trim() === group.name}
              className="rounded-lg border border-line px-3 py-2 text-sm hover:border-ink disabled:opacity-50"
            >
              Rename
            </button>
          </form>
        </div>
        <button
          type="button"
          onClick={() => void removeGroup()}
          className="rounded-lg border border-line px-3 py-2 text-sm text-rose hover:border-rose"
        >
          Delete group
        </button>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-8">
          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="font-serif text-2xl">People</h2>
            {group.members.length === 0 ? (
              <p className="mt-3 text-ink-soft">No one in this group yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {group.members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/people/${member.id}`} className="hover:underline">
                      {member.name}
                    </Link>
                    <button
                      type="button"
                      className="text-sm text-ink-soft hover:text-ink disabled:opacity-50"
                      disabled={busy}
                      onClick={() =>
                        void saveMembers(
                          group.members.map((item) => item.id).filter((item) => item !== member.id),
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                className="min-w-48 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
              >
                <option value="">Add a person…</option>
                {available.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {person.pausedAt ? " (paused)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!addId || busy}
                className="rounded-lg bg-ink px-3 py-2 text-sm text-paper disabled:opacity-50"
                onClick={() => {
                  const personId = addId;
                  setAddId("");
                  void saveMembers([...group.members.map((member) => member.id), personId]);
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-serif text-2xl">Logs</h2>
            {group.logs.length === 0 ? (
              <p className="mt-3 text-ink-soft">No logs yet.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {group.logs.map((log) => (
                  <li key={log.id} className="rounded-xl border border-line bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-sm text-ink-soft">
                        {formatDay(log.date)} · {CHANNEL_LABELS[log.channel]} ·{" "}
                        {log.countsAsContact ? "Counts as contact" : "Timeline only"}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-sm text-ink-soft hover:text-ink disabled:opacity-50"
                          disabled={busy}
                          onClick={() => startEdit(log)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-sm text-rose disabled:opacity-50"
                          disabled={busy}
                          onClick={() => void removeLog(log)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{log.notes || "—"}</p>
                    <p className="mt-2 text-sm text-ink-soft">
                      {log.audience.length === 0
                        ? "No one left on this log."
                        : log.audience.map((person) => person.name).join(", ")}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <aside>
          <form
            id="group-log-form"
            onSubmit={(e) => void saveLog(e)}
            className="sticky top-6 space-y-3 rounded-xl border border-line bg-card p-5"
          >
            <h2 className="font-serif text-2xl">{editing ? "Edit log" : "Log to this group"}</h2>
            <p className="text-sm text-ink-soft">
              One note, shared by everyone you check. This group is never a person on the Queue.
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
                {CHANNELS.map((item) => (
                  <option key={item} value={item}>
                    {CHANNEL_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Notes
              <textarea
                className="mt-1 min-h-28 w-full rounded-lg border border-line bg-paper px-3 py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={8000}
              />
            </label>
            <fieldset className="space-y-2 text-sm">
              <legend>Does this count as a real contact?</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="counts"
                  checked={countsAsContact === true}
                  onChange={() => setCountsAsContact(true)}
                />
                Yes, it counts
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="counts"
                  checked={countsAsContact === false}
                  onChange={() => setCountsAsContact(false)}
                />
                No, timeline only
              </label>
            </fieldset>
            <fieldset className="text-sm">
              <legend>Who gets this log</legend>
              {choices.length === 0 ? (
                <p className="mt-2 text-ink-soft">Add someone to this group before logging.</p>
              ) : (
                <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                  {choices.map((person) => {
                    const inGroup = memberIds.has(person.id);
                    return (
                      <li key={person.id}>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={audienceIds.includes(person.id)}
                            onChange={() =>
                              setAudienceIds((current) =>
                                current.includes(person.id)
                                  ? current.filter((item) => item !== person.id)
                                  : [...current, person.id],
                              )
                            }
                          />
                          <span>
                            {person.name}
                            {inGroup ? "" : " · no longer in the group"}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
            {error ? <p className="text-sm text-rose">{error}</p> : null}
            <button
              type="submit"
              disabled={!canSaveLog}
              className="w-full rounded-lg bg-ink py-2 text-sm text-paper disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save log"}
            </button>
            {editing ? (
              <button
                type="button"
                className="w-full text-sm text-ink-soft hover:text-ink"
                onClick={() => resetDraft(group.members)}
              >
                Cancel edit
              </button>
            ) : null}
          </form>
        </aside>
      </div>
    </div>
  );
}

function checklist(members: GroupMember[], editing: GroupLog | null): GroupMember[] {
  const byId = new Map<string, GroupMember>();
  for (const member of members) byId.set(member.id, member);
  if (editing) {
    for (const person of editing.audience) byId.set(person.id, person);
  }
  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

function allowedAudience(group: GroupDetail, editingId: string): Set<string> {
  const ids = new Set(group.members.map((member) => member.id));
  const editing = group.logs.find((log) => log.id === editingId);
  if (editing) for (const person of editing.audience) ids.add(person.id);
  return ids;
}
