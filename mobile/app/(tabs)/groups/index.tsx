import { Link, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import type { GroupSummary } from "@crm/shared";
import { api } from "../../../lib/api";

export default function GroupsScreen() {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setGroups(await api<GroupSummary[]>("/api/groups"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load groups");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen
        options={{
          title: "Groups",
          headerRight: () => (
            <Link href="/groups/new" asChild>
              <Pressable className="pl-3">
                <Text className="font-sans-medium text-accent">Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      {error ? <Text className="mx-5 mt-3 text-rose">{error}</Text> : null}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-3"
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
        {!groups ? (
          <Text className="text-ink-soft">Loading…</Text>
        ) : groups.length === 0 ? (
          <View className="rounded-xl border border-dashed border-line p-8">
            <Text className="text-center text-ink-soft">
              No groups yet. Create one for a chat or a party, then log what you shared.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} asChild>
                <Pressable className="rounded-xl border border-line bg-card px-4 py-3">
                  <Text className="font-sans-medium text-ink">{group.name}</Text>
                  <Text className="text-sm text-ink-soft">{memberCount(group.memberCount)}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function memberCount(count: number): string {
  if (count === 0) return "No people yet";
  if (count === 1) return "1 person";
  return `${count} people`;
}
