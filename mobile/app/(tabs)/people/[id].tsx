import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
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
  type Person,
} from "@crm/shared";
import { Avatar } from "../../../components/Avatar";
import { api } from "../../../lib/api";
import {
  channelLabel,
  formatWhen,
  phoneHref,
  tierLabel,
  todayInput,
} from "../../../lib/format";

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>("call");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayInput);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const next = await api<Person>(`/api/people/${id}`);
    setPerson(next);
    setChannel(next.preferredChannel ?? "call");
  }, [id]);

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load person");
    });
  }, [load]);

  async function logInteraction() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/people/${id}/interactions`, {
        method: "POST",
        body: JSON.stringify({ date, channel, notes }),
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function open(scheme: "tel" | "sms") {
    if (!person?.phone) return;
    await Linking.openURL(phoneHref(person.phone, scheme));
  }

  if (error && !person) {
    return (
      <View className="flex-1 bg-paper px-5 pt-6">
        <Text className="text-rose">{error}</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View className="flex-1 bg-paper px-5 pt-6">
        <Text className="text-ink-soft">Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: person.name }} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-4 pb-12">
        <View className="flex-row items-center gap-4">
          <Avatar name={person.name} photoUrl={person.photoUrl} size="md" />
          <View className="flex-1">
            <Text className="font-serif text-2xl text-ink">{person.name}</Text>
            <Text className="text-ink-soft">{tierLabel(person.tier)}</Text>
          </View>
        </View>

        {person.phone ? (
          <View className="mt-5 flex-row gap-2">
            <Pressable className="flex-1 rounded-lg bg-ink py-3" onPress={() => void open("tel")}>
              <Text className="text-center font-sans-medium text-paper">Call</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-lg border border-ink py-3"
              onPress={() => void open("sms")}
            >
              <Text className="text-center font-sans-medium text-ink">SMS</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="mt-5 text-sm text-ink-soft">No phone number.</Text>
        )}

        <View className="mt-6 rounded-xl border border-line bg-card p-4">
          <Text className="text-xs font-sans-semibold uppercase tracking-wide text-ink-soft">
            Talking point
          </Text>
          <Text className="mt-2 text-ink">
            {person.nextTalkingPoint || "Nothing queued for next time."}
          </Text>
        </View>

        <View className="mt-3 rounded-xl border border-line bg-card p-4">
          <Text className="text-xs font-sans-semibold uppercase tracking-wide text-ink-soft">
            Last conversation
          </Text>
          <Text className="mt-2 text-ink-soft">{formatWhen(person.lastInteractionAt)}</Text>
          <Text className="text-ink">
            {person.lastInteractionPreview
              ? person.lastInteractionPreview
              : channelLabel(person.lastInteractionChannel)}
          </Text>
        </View>

        <Text className="mt-8 font-serif text-xl text-ink">Log interaction</Text>
        <Text className="mt-3 text-sm text-ink">Date</Text>
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
              className={`rounded-lg border px-3 py-2 ${
                channel === item ? "border-ink bg-ink" : "border-line bg-card"
              }`}
              onPress={() => setChannel(item)}
            >
              <Text className={channel === item ? "text-paper" : "text-ink"}>
                {CHANNEL_LABELS[item]}
              </Text>
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
        {error ? <Text className="mt-3 text-sm text-rose">{error}</Text> : null}
        <Pressable
          className="mt-5 rounded-lg bg-ink py-3 disabled:opacity-60"
          disabled={busy}
          onPress={() => void logInteraction()}
        >
          <Text className="text-center font-sans-medium text-paper">
            {busy ? "Saving…" : "Save and return to queue"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
