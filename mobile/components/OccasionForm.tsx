import type { ReactNode } from "react";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { normalizeTags, todayYmd, type OccasionInput } from "@crm/shared";
import { api } from "../lib/api";

type OccasionFormProps = {
  occasionId?: string;
};

export function OccasionForm({ occasionId }: OccasionFormProps) {
  const editing = Boolean(occasionId);
  const today = todayYmd();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [tags, setTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const vocab = await api<string[]>(`/api/dates/tags?today=${today}`);
      setSuggestions(vocab);
      if (!occasionId) return;
      const occasion = await api<{ title: string; date: string; tags: string[] }>(
        `/api/occasions/${occasionId}`,
      );
      setTitle(occasion.title);
      setDate(occasion.date);
      setTags(occasion.tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load");
    }
  }, [occasionId, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedDraft = normalizeTags([draft])[0];
  const available = suggestions.filter((tag) => !tags.includes(tag));
  const filtered = draft
    ? available.filter((tag) => tag.includes(draft.trim().toLowerCase()))
    : available;
  const canCreate = Boolean(normalizedDraft) && !tags.includes(normalizedDraft);

  function addTag(tag: string) {
    setTags(normalizeTags([...tags, tag]));
    setDraft("");
  }

  async function onSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload: OccasionInput = { title: title.trim(), date, tags };
    try {
      if (editing && occasionId) {
        await api(`/api/occasions/${occasionId}?today=${today}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/api/occasions?today=${today}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!occasionId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/occasions/${occasionId}`, { method: "DELETE" });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-4 pb-12">
        <Field label="Title">
          <TextInput
            className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
            value={title}
            onChangeText={setTitle}
          />
        </Field>
        <Field label="Date (YYYY-MM-DD)">
          <TextInput
            className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
            value={date}
            onChangeText={setDate}
            placeholder={today}
            placeholderTextColor="#5c534a"
          />
        </Field>
        <Text className="mt-4 text-sm text-ink">Tags</Text>
        {tags.length > 0 ? (
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Pressable
                key={tag}
                className="rounded-full border border-line bg-card px-2.5 py-1"
                onPress={() => setTags(tags.filter((item) => item !== tag))}
              >
                <Text className="text-sm text-ink">{tag} ×</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <TextInput
          className="mt-2 rounded-lg border border-line bg-card px-3 py-3 text-ink"
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a tag"
          placeholderTextColor="#5c534a"
          onSubmitEditing={() => {
            if (normalizedDraft) addTag(normalizedDraft);
          }}
        />
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {filtered.slice(0, 20).map((tag) => (
            <Pressable
              key={tag}
              className="rounded-full border border-line px-2.5 py-1"
              onPress={() => addTag(tag)}
            >
              <Text className="text-sm text-ink-soft">{tag}</Text>
            </Pressable>
          ))}
        </View>
        {filtered.length === 0 && canCreate ? (
          <Pressable className="mt-2" onPress={() => addTag(normalizedDraft)}>
            <Text className="text-sm text-accent">Create “{normalizedDraft}”</Text>
          </Pressable>
        ) : null}

        {error ? <Text className="mt-3 text-sm text-rose">{error}</Text> : null}
        <Pressable
          className="mt-6 rounded-lg bg-ink py-3 disabled:opacity-60"
          disabled={busy}
          onPress={() => void onSubmit()}
        >
          <Text className="text-center font-sans-medium text-paper">
            {busy ? "Saving…" : "Save"}
          </Text>
        </Pressable>
        {editing ? (
          <Pressable className="mt-4 py-2" disabled={busy} onPress={() => void onDelete()}>
            <Text className="text-center text-sm text-rose">
              {confirmDelete ? "Tap again to delete" : "Delete"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="text-sm text-ink">{label}</Text>
      {children}
    </View>
  );
}
