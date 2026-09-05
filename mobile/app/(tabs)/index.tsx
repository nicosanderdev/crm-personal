import { Link, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import {
  SNOOZE_DAYS,
  SNOOZE_LABELS,
  type QueueItem,
  type Settings,
  type SnoozeDays,
} from "@crm/shared";
import { Avatar } from "../../components/Avatar";
import { api } from "../../lib/api";
import { channelLabel, formatWhen, tierLabel } from "../../lib/format";

type QueueResponse = {
  due: QueueItem[];
  tierDays: Settings["tierDays"];
};

export default function QueueScreen() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api<QueueResponse>("/api/queue"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load queue");
    }
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function snooze(id: string, days: SnoozeDays) {
    await api(`/api/people/${id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ days }),
    });
    await load();
  }

  if (error && !data) {
    return (
      <View className="flex-1 bg-paper px-5 pt-6">
        <Text className="text-rose">{error}</Text>
        <Pressable className="mt-4 self-start rounded-lg bg-ink px-4 py-2" onPress={() => void load()}>
          <Text className="text-paper">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerClassName="px-5 pb-10 pt-2"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Stack.Screen options={{ title: "Queue" }} />
      <Text className="text-ink-soft">Due when the last conversation is older than their cadence.</Text>

      {!data ? (
        <Text className="mt-8 text-ink-soft">Loading queue…</Text>
      ) : data.due.length === 0 ? (
        <View className="mt-8 rounded-xl border border-dashed border-line p-8">
          <Text className="text-center text-ink-soft">Nobody is due. Enjoy the quiet.</Text>
        </View>
      ) : (
        <View className="mt-5 gap-3">
          {data.due.map((person) => (
            <View key={person.id} className="rounded-xl border border-line bg-card p-4">
              <Link href={`/people/${person.id}`} asChild>
                <Pressable className="flex-row items-center gap-3">
                  <Avatar name={person.name} photoUrl={person.photoUrl} />
                  <View className="flex-1">
                    <Text className="font-sans-medium text-ink">{person.name}</Text>
                    <Text className="text-sm text-ink-soft">
                      {person.organization || tierLabel(person.tier)}
                    </Text>
                  </View>
                </Pressable>
              </Link>
              <Text className={`mt-3 text-sm ${person.neverContacted ? "text-rose" : "text-accent"}`}>
                {person.neverContacted
                  ? "Never contacted"
                  : person.daysOverdue === 0
                    ? "Due today"
                    : `${person.daysOverdue}d overdue`}
              </Text>
              <Text className="mt-1 text-sm text-ink-soft">{formatWhen(person.lastInteractionAt)}</Text>
              <Text className="text-sm text-ink" numberOfLines={2}>
                {person.lastInteractionPreview
                  ? person.lastInteractionPreview
                  : channelLabel(person.lastInteractionChannel)}
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {SNOOZE_DAYS.map((days) => (
                  <Pressable
                    key={days}
                    className="rounded-md border border-line px-2 py-1"
                    onPress={() => void snooze(person.id, days)}
                  >
                    <Text className="text-xs text-ink-soft">{SNOOZE_LABELS[days]}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
