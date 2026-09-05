import { Link, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import type { Person } from "@crm/shared";
import { Avatar } from "../../../components/Avatar";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { formatWhen, tierLabel } from "../../../lib/format";

export default function PeopleScreen() {
  const { me, logout } = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (query: string) => {
    try {
      setError(null);
      setPeople(await api<Person[]>(`/api/people?q=${encodeURIComponent(query)}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load people");
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      void load(q);
    }, 150);
    return () => clearTimeout(handle);
  }, [q, load]);

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen
        options={{
          title: "People",
          headerLeft: () => (
            <Pressable className="pr-3" onPress={() => void logout()}>
              <Text className="text-sm text-ink-soft">Log out</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Link href="/people/new" asChild>
              <Pressable className="pl-3">
                <Text className="font-sans-medium text-accent">Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <TextInput
        className="mx-5 mt-3 rounded-lg border border-line bg-card px-3 py-3 text-ink"
        placeholder="Search name, organization, tags…"
        placeholderTextColor="#5c534a"
        value={q}
        onChangeText={setQ}
      />
      {me ? <Text className="mx-5 mt-2 text-xs text-ink-soft">{me.email}</Text> : null}
      {error ? <Text className="mx-5 mt-3 text-rose">{error}</Text> : null}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-3"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(q).finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {!people ? (
          <Text className="text-ink-soft">Loading…</Text>
        ) : people.length === 0 ? (
          <View className="rounded-xl border border-dashed border-line p-8">
            <Text className="text-center text-ink-soft">No people yet. Add someone you just met.</Text>
          </View>
        ) : (
          <View className="gap-2">
            {people.map((person) => (
              <Link key={person.id} href={`/people/${person.id}`} asChild>
                <Pressable className="flex-row items-center gap-3 rounded-xl border border-line bg-card px-3 py-3">
                  <Avatar name={person.name} photoUrl={person.photoUrl} />
                  <View className="flex-1">
                    <Text className="font-sans-medium text-ink">
                      {person.name}
                      {person.pausedAt ? (
                        <Text className="font-sans text-xs text-ink-soft">  paused</Text>
                      ) : null}
                    </Text>
                    <Text className="text-sm text-ink-soft">
                      {tierLabel(person.tier)} · {formatWhen(person.lastInteractionAt)}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
