import { Link, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { dayHeading, todayYmd, type DatesResponse, type Occasion } from "@crm/shared";
import { api } from "../../../lib/api";

export default function DatesScreen() {
  const [data, setData] = useState<DatesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = todayYmd();

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api<DatesResponse>(`/api/dates?today=${today}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dates");
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen
        options={{
          title: "Dates",
          headerRight: () => (
            <Link href="./new" asChild>
              <Pressable className="pl-3">
                <Text className="font-sans-medium text-accent">Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      {error && !data ? (
        <View className="px-5 pt-6">
          <Text className="text-rose">{error}</Text>
          <Pressable className="mt-4 self-start rounded-lg bg-ink px-4 py-2" onPress={() => void load()}>
            <Text className="text-paper">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-10 pt-2"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load().finally(() => setRefreshing(false));
              }}
            />
          }
        >
          <Text className="text-ink-soft">Upcoming occasions and birthdays.</Text>
          {!data ? (
            <Text className="mt-8 text-ink-soft">Loading…</Text>
          ) : data.days.length === 0 ? (
            <View className="mt-8 rounded-xl border border-dashed border-line p-8">
              <Text className="text-center text-ink-soft">
                Nothing coming up. Add an occasion, or set a birthday on someone.
              </Text>
            </View>
          ) : (
            data.days.map((group) => (
              <View key={group.date} className="mt-6">
                <Text className="text-xs font-sans-semibold uppercase tracking-wide text-ink-soft">
                  {dayHeading(group.date, today)}
                </Text>
                <View className="mt-2 gap-2">
                  {group.occasions.map((occasion) => (
                    <OccasionRow key={occasion.id} occasion={occasion} />
                  ))}
                  {group.birthdays.map((person) => (
                    <Link key={person.id} href={`/people/${person.id}`} asChild>
                      <Pressable className="flex-row items-center gap-2 rounded-xl border border-line bg-card px-4 py-3">
                        <Text className="flex-1 font-sans-medium text-ink">{person.name}</Text>
                        <Text className="text-sm text-ink-soft">birthday</Text>
                      </Pressable>
                    </Link>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function OccasionRow({ occasion }: { occasion: Occasion }) {
  return (
    <View className="rounded-xl border border-line bg-card px-4 py-3">
      <Link href={`./${occasion.id}`} asChild>
        <Pressable>
          <Text className="font-sans-medium text-ink">{occasion.title}</Text>
        </Pressable>
      </Link>
      {occasion.tags.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {occasion.tags.map((tag) => (
            <Link key={tag} href={`/people?tag=${encodeURIComponent(tag)}`} asChild>
              <Pressable className="rounded-full border border-line bg-paper px-2.5 py-0.5">
                <Text className="text-sm text-ink-soft">{tag}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}
    </View>
  );
}
