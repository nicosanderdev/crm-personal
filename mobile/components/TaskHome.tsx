import { Link, Stack, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  isTaskOverdue,
  taskFormPath,
  taskSubjectLabel,
  taskSubjectPath,
  tasksForView,
  todayYmd,
  type Task,
  type TaskStatus,
} from "@crm/shared";
import { api } from "../lib/api";
import { formatDay } from "../lib/format";

type TaskHomeProps = {
  variant: "page" | "section";
  personId?: string;
  groupId?: string;
};

export function TaskHome({ variant, personId, groupId }: TaskHomeProps) {
  const isPage = variant === "page";
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<TaskStatus>("pending");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const today = todayYmd();

  const path = personId
    ? `/api/tasks?personId=${personId}`
    : groupId
      ? `/api/tasks?groupId=${groupId}`
      : "/api/tasks";

  const load = useCallback(async () => {
    try {
      const next = await api<Task[]>(path);
      setTasks(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tasks");
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function complete(task: Task) {
    setCompletingId(task.id);
    setError(null);
    try {
      const next = await api<Task>(`/api/tasks/${task.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "completed" }),
      });
      setTasks((current) => current?.map((item) => (item.id === next.id ? next : item)) ?? current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete task");
    } finally {
      setCompletingId(null);
    }
  }

  const shown = tasks ? tasksForView(tasks, view, isPage ? query : "") : [];
  const origin = {
    from: personId ? "person" : groupId ? "group" : "tasks",
    personId: personId ?? null,
    groupId: groupId ?? null,
    view: isPage ? view : null,
    q: isPage ? query : null,
  };
  const empty = tasks ? emptyMessage(tasks.length, view, isPage ? query : "", shown.length) : null;

  const body = (
    <View className={isPage ? "" : "mt-8"}>
      {isPage ? null : (
        <View className="flex-row items-center justify-between">
          <Text className="font-serif text-xl text-ink">Tasks</Text>
          <Link href={taskFormPath(null, origin) as Href} asChild>
            <Pressable>
              <Text className="font-sans-medium text-accent">New task</Text>
            </Pressable>
          </Link>
        </View>
      )}

      <View className={isPage ? "flex-row flex-wrap gap-2" : "mt-3 flex-row flex-wrap gap-2"}>
        {TASK_STATUSES.map((status) => (
          <Pressable
            key={status}
            className={
              view === status
                ? "rounded-full bg-ink px-3 py-1"
                : "rounded-full border border-line px-3 py-1"
            }
            onPress={() => setView(status)}
          >
            <Text className={view === status ? "text-sm text-paper" : "text-sm text-ink"}>
              {TASK_STATUS_LABELS[status]}
            </Text>
          </Pressable>
        ))}
      </View>

      {isPage ? (
        <TextInput
          className="mt-4 rounded-lg border border-line bg-card px-3 py-3 text-ink"
          placeholder="Filter by task name"
          placeholderTextColor="#5c534a"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      ) : null}

      {error ? <Text className="mt-3 text-sm text-rose">{error}</Text> : null}
      {!tasks && !error ? <Text className="mt-4 text-ink-soft">Loading…</Text> : null}
      {empty ? <Text className="mt-4 text-ink-soft">{empty}</Text> : null}

      <View className="mt-3 gap-3">
        {shown.map((task) => {
          const overdue = isTaskOverdue(task, today);
          const subject = isPage ? taskSubjectLabel(task.subject) : null;
          const subjectHref = isPage ? taskSubjectPath(task.subject) : null;
          return (
            <View key={task.id} className="rounded-xl border border-line bg-card p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Link href={taskFormPath(task.id, origin) as Href} asChild>
                    <Pressable>
                      <Text className="font-sans-medium text-ink">{task.name}</Text>
                    </Pressable>
                  </Link>
                  {task.dueDate ? (
                    <Text className="mt-1 text-sm text-ink-soft">
                      {formatDay(task.dueDate)}
                      {overdue ? <Text className="text-rose"> · Overdue</Text> : null}
                    </Text>
                  ) : null}
                  {subject && subjectHref ? (
                    <Link href={subjectHref as Href} asChild>
                      <Pressable className="mt-1 self-start">
                        <Text className="text-sm text-ink underline">{subject}</Text>
                      </Pressable>
                    </Link>
                  ) : null}
                </View>
                {task.status === "pending" ? (
                  <Pressable disabled={completingId === task.id} onPress={() => void complete(task)}>
                    <Text className="text-sm text-accent">Complete</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (!isPage) return body;

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen
        options={{
          title: "Tasks",
          headerRight: () => (
            <Link href={"/tasks/new" as Href} asChild>
              <Pressable className="pl-3">
                <Text className="font-sans-medium text-accent">Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12 pt-4"
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
        <Text className="mb-4 text-ink-soft">What you mean to do.</Text>
        {body}
      </ScrollView>
    </View>
  );
}

function emptyMessage(total: number, view: TaskStatus, query: string, shown: number): string | null {
  if (shown > 0) return null;
  if (total === 0) return "No tasks yet.";
  if (query.trim()) return "No tasks with that name in this view.";
  if (view === "pending") return "No pending tasks.";
  if (view === "completed") return "No completed tasks.";
  return "No cancelled tasks.";
}
