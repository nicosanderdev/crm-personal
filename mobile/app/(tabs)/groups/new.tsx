import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { GroupDetail, Person } from "@crm/shared";
import { api } from "../../../lib/api";

export default function NewGroupScreen() {
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

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const group = await api<GroupDetail>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), memberIds }),
      });
      router.replace(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
      setBusy(false);
    }
  }

  const needle = query.trim().toLowerCase();
  const visible = (people ?? []).filter((person) => !needle || person.name.toLowerCase().includes(needle));

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-4 pb-12">
        <Text className="text-sm text-ink-soft">A name is enough. Add people now or later.</Text>
        <Text className="mt-4 text-sm text-ink">Name</Text>
        <TextInput
          className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#5c534a"
        />
        <Text className="mt-4 text-sm text-ink">People</Text>
        <TextInput
          className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
          value={query}
          onChangeText={setQuery}
          placeholder="Filter by name…"
          placeholderTextColor="#5c534a"
        />
        {people === null ? (
          <Text className="mt-3 text-ink-soft">Loading…</Text>
        ) : people.length === 0 ? (
          <Text className="mt-3 text-ink-soft">No people yet.</Text>
        ) : (
          <View className="mt-3 gap-2">
            {visible.map((person) => {
              const checked = memberIds.includes(person.id);
              return (
                <Pressable
                  key={person.id}
                  className={`rounded-lg border px-3 py-3 ${checked ? "border-ink bg-ink" : "border-line bg-card"}`}
                  onPress={() => toggle(person.id)}
                >
                  <Text className={checked ? "text-paper" : "text-ink"}>
                    {person.name}
                    {person.pausedAt ? " · paused" : ""}
                  </Text>
                </Pressable>
              );
            })}
            {visible.length === 0 ? <Text className="text-ink-soft">No matching people.</Text> : null}
          </View>
        )}
        {error ? <Text className="mt-3 text-sm text-rose">{error}</Text> : null}
        <Pressable
          className="mt-5 rounded-lg bg-ink py-3 disabled:opacity-60"
          disabled={busy || name.trim().length === 0}
          onPress={() => void create()}
        >
          <Text className="text-center font-sans-medium text-paper">
            {busy ? "Saving…" : "Create group"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
