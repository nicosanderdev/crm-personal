import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CHANNELS,
  CHANNEL_LABELS,
  type Channel,
  type GroupDetail,
  type GroupLog,
  type GroupMember,
  type Person,
} from "@crm/shared";
import { api } from "../../../lib/api";
import { formatDay, todayInput } from "../../../lib/format";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [directory, setDirectory] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayInput());
  const [channel, setChannel] = useState<Channel>("message");
  const [notes, setNotes] = useState("");
  const [countsAsContact, setCountsAsContact] = useState<boolean | null>(null);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return null;
    const [nextGroup, people] = await Promise.all([
      api<GroupDetail>(`/api/groups/${id}`),
      api<Person[]>("/api/people"),
    ]);
    return { group: nextGroup, people };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setEditingId(null);
    setCountsAsContact(null);
    setNotes("");
    void load()
      .then((next) => {
        if (cancelled || !next) return;
        setDirectory(next.people);
        setGroup(next.group);
        setName(next.group.name);
        setDate(todayInput());
        setAudienceIds(next.group.members.map((member) => member.id));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load group");
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

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

  async function saveName() {
    if (!group || name.trim().length === 0 || name.trim() === group.name) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api<GroupDetail>(`/api/groups/${group.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
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

  function confirmDeleteGroup() {
    if (!group) return;
    Alert.alert(
      "Delete group",
      `Past logs for ${group.name} stay on people's timelines and can no longer be changed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void api(`/api/groups/${group.id}`, { method: "DELETE" }).then(() => {
              router.replace("/groups");
            });
          },
        },
      ],
    );
  }

  function startEdit(log: GroupLog) {
    setEditingId(log.id);
    setDate(log.date.slice(0, 10));
    setChannel(log.channel);
    setNotes(log.notes);
    setCountsAsContact(log.countsAsContact);
    setAudienceIds(log.audience.map((person) => person.id));
    setError(null);
  }

  async function saveLog() {
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
      const next = await load();
      if (next) {
        setDirectory(next.people);
        setGroup(next.group);
        setName(next.group.name);
        resetDraft(next.group.members);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save log");
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteLog(log: GroupLog) {
    if (!group) return;
    Alert.alert("Delete log", "It leaves everyone's timeline.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              await api(`/api/groups/${group.id}/logs/${log.id}`, { method: "DELETE" });
              const next = await load();
              if (next) {
                setDirectory(next.people);
                setGroup(next.group);
                if (editingId === log.id) resetDraft(next.group.members);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not delete log");
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  if (error && !group) {
    return (
      <View className="flex-1 bg-paper px-5 pt-6">
        <Text className="text-rose">{error}</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 bg-paper px-5 pt-6">
        <Text className="text-ink-soft">Loading…</Text>
      </View>
    );
  }

  const memberIds = new Set(group.members.map((member) => member.id));
  const needle = query.trim().toLowerCase();
  const available = directory
    .filter((person) => !memberIds.has(person.id))
    .filter((person) => !needle || person.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const editing = group.logs.find((log) => log.id === editingId) ?? null;
  const choices = checklist(group.members, editing);
  const canSaveLog = countsAsContact !== null && audienceIds.length > 0 && !busy;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: group.name }} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-4 pb-16">
        <Text className="text-sm text-ink">Name</Text>
        <TextInput
          className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
          value={name}
          onChangeText={setName}
        />
        <Pressable
          className="mt-2 self-start rounded-lg border border-line px-3 py-2 disabled:opacity-50"
          disabled={busy || name.trim() === group.name || name.trim().length === 0}
          onPress={() => void saveName()}
        >
          <Text className="text-ink">Rename</Text>
        </Pressable>
        <Pressable className="mt-3 self-start" onPress={confirmDeleteGroup}>
          <Text className="text-rose">Delete group</Text>
        </Pressable>

        <Text className="mt-8 font-serif text-xl text-ink">People</Text>
        {group.members.length === 0 ? (
          <Text className="mt-3 text-ink-soft">No one in this group yet.</Text>
        ) : (
          <View className="mt-3 gap-2">
            {group.members.map((member) => (
              <View
                key={member.id}
                className="flex-row items-center justify-between rounded-xl border border-line bg-card px-3 py-3"
              >
                <Link href={`/people/${member.id}`} asChild>
                  <Pressable className="flex-1">
                    <Text className="text-ink">{member.name}</Text>
                  </Pressable>
                </Link>
                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void saveMembers(
                      group.members.map((item) => item.id).filter((item) => item !== member.id),
                    )
                  }
                >
                  <Text className="text-sm text-ink-soft">Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <TextInput
          className="mt-3 rounded-lg border border-line bg-card px-3 py-3 text-ink"
          value={query}
          onChangeText={setQuery}
          placeholder="Add a person…"
          placeholderTextColor="#5c534a"
        />
        <View className="mt-2 gap-2">
          {available.slice(0, 8).map((person) => (
            <Pressable
              key={person.id}
              className="rounded-lg border border-line bg-card px-3 py-2"
              disabled={busy}
              onPress={() => {
                void saveMembers([...group.members.map((member) => member.id), person.id]);
              }}
            >
              <Text className="text-ink">
                Add {person.name}
                {person.pausedAt ? " · paused" : ""}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-8 font-serif text-xl text-ink">Logs</Text>
        {group.logs.length === 0 ? (
          <Text className="mt-3 text-ink-soft">No logs yet.</Text>
        ) : (
          <View className="mt-3 gap-3">
            {group.logs.map((log) => (
              <View key={log.id} className="rounded-xl border border-line bg-card p-4">
                <Text className="text-sm text-ink-soft">
                  {formatDay(log.date)} · {CHANNEL_LABELS[log.channel]} ·{" "}
                  {log.countsAsContact ? "Counts as contact" : "Timeline only"}
                </Text>
                <Text className="mt-1 text-ink">{log.notes || "—"}</Text>
                <Text className="mt-2 text-sm text-ink-soft">
                  {log.audience.length === 0
                    ? "No one left on this log."
                    : log.audience.map((person) => person.name).join(", ")}
                </Text>
                <View className="mt-3 flex-row gap-4">
                  <Pressable disabled={busy} onPress={() => startEdit(log)}>
                    <Text className="text-ink">Edit</Text>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => confirmDeleteLog(log)}>
                    <Text className="text-rose">Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text className="mt-8 font-serif text-xl text-ink">{editing ? "Edit log" : "Log to this group"}</Text>
        <Text className="mt-2 text-sm text-ink-soft">
          One note, shared by everyone you check. This group never shows up on the Queue.
        </Text>
        <Text className="mt-4 text-sm text-ink">Date</Text>
        <TextInput
          className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#5c534a"
        />
        <Text className="mt-4 text-sm text-ink">Channel</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {CHANNELS.map((item) => (
            <Pressable
              key={item}
              className={`rounded-lg border px-3 py-2 ${channel === item ? "border-ink bg-ink" : "border-line bg-card"}`}
              onPress={() => setChannel(item)}
            >
              <Text className={channel === item ? "text-paper" : "text-ink"}>{CHANNEL_LABELS[item]}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-4 text-sm text-ink">Notes</Text>
        <TextInput
          className="mt-1 min-h-[100px] rounded-lg border border-line bg-card px-3 py-3 text-ink"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
        <Text className="mt-4 text-sm text-ink">Does this count as a real contact?</Text>
        <View className="mt-2 flex-row gap-2">
          <Pressable
            className={`flex-1 rounded-lg border px-3 py-3 ${countsAsContact === true ? "border-ink bg-ink" : "border-line bg-card"}`}
            onPress={() => setCountsAsContact(true)}
          >
            <Text className={`text-center ${countsAsContact === true ? "text-paper" : "text-ink"}`}>
              Yes, it counts
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 rounded-lg border px-3 py-3 ${countsAsContact === false ? "border-ink bg-ink" : "border-line bg-card"}`}
            onPress={() => setCountsAsContact(false)}
          >
            <Text className={`text-center ${countsAsContact === false ? "text-paper" : "text-ink"}`}>
              Timeline only
            </Text>
          </Pressable>
        </View>
        <Text className="mt-4 text-sm text-ink">Who gets this log</Text>
        {choices.length === 0 ? (
          <Text className="mt-2 text-ink-soft">Add someone to this group before logging.</Text>
        ) : (
          <View className="mt-2 gap-2">
            {choices.map((person) => {
              const checked = audienceIds.includes(person.id);
              const inGroup = memberIds.has(person.id);
              return (
                <Pressable
                  key={person.id}
                  className={`rounded-lg border px-3 py-2 ${checked ? "border-ink bg-ink" : "border-line bg-card"}`}
                  onPress={() =>
                    setAudienceIds((current) =>
                      current.includes(person.id)
                        ? current.filter((item) => item !== person.id)
                        : [...current, person.id],
                    )
                  }
                >
                  <Text className={checked ? "text-paper" : "text-ink"}>
                    {person.name}
                    {inGroup ? "" : " · no longer in the group"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {error ? <Text className="mt-3 text-sm text-rose">{error}</Text> : null}
        <Pressable
          className="mt-5 rounded-lg bg-ink py-3 disabled:opacity-60"
          disabled={!canSaveLog}
          onPress={() => void saveLog()}
        >
          <Text className="text-center font-sans-medium text-paper">{busy ? "Saving…" : "Save log"}</Text>
        </Pressable>
        {editing ? (
          <Pressable className="mt-3 py-2" onPress={() => resetDraft(group.members)}>
            <Text className="text-center text-ink-soft">Cancel edit</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function checklist(members: GroupMember[], editing: GroupLog | null): GroupMember[] {
  const byId = new Map<string, GroupMember>();
  for (const member of members) byId.set(member.id, member);
  if (editing) for (const person of editing.audience) byId.set(person.id, person);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function allowedAudience(group: GroupDetail, editingId: string): Set<string> {
  const ids = new Set(group.members.map((member) => member.id));
  const editing = group.logs.find((log) => log.id === editingId);
  if (editing) for (const person of editing.audience) ids.add(person.id);
  return ids;
}
