import type { ReactNode } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
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
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_TEMPLATES,
  YMD,
  formatCreatedAt,
  includesFold,
  isTaskOverdue,
  taskListPath,
  todayYmd,
  type GroupSummary,
  type Person,
  type Task,
  type TaskCreateInput,
  type TaskInput,
  type TaskOrigin,
  type TaskStatus,
  type TaskSubjectRef,
  type TaskTemplate,
} from "@crm/shared";
import { api } from "../lib/api";

type Kind = TaskSubjectRef["kind"];

function one(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function TaskForm({ taskId }: { taskId?: string }) {
  const params = useLocalSearchParams<{
    from?: string;
    personId?: string;
    groupId?: string;
    view?: string;
    q?: string;
    page?: string;
  }>();
  const origin: TaskOrigin = {
    from: one(params.from),
    personId: one(params.personId),
    groupId: one(params.groupId),
    view: one(params.view),
    q: one(params.q),
    page: one(params.page),
  };
  const editing = Boolean(taskId);
  const back = taskListPath(origin);

  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [kind, setKind] = useState<Kind>(origin.personId ? "person" : origin.groupId ? "group" : "loose");
  const [personId, setPersonId] = useState(origin.personId ?? "");
  const [groupId, setGroupId] = useState(origin.groupId ?? "");
  const [personQuery, setPersonQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [ready, setReady] = useState(!editing);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (taskId) setReady(false);
    void Promise.all([
      api<Person[]>("/api/people"),
      api<GroupSummary[]>("/api/groups"),
      taskId ? api<Task>(`/api/tasks/${taskId}`) : Promise.resolve(null),
    ])
      .then(([nextPeople, nextGroups, task]) => {
        if (cancelled) return;
        setPeople(nextPeople);
        setGroups(nextGroups);
        if (task) applyTask(task);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load task");
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  function applyTask(task: Task) {
    setName(task.name);
    setDescription(task.description);
    setDueDate(task.dueDate ?? "");
    setStatus(task.status);
    setKind(task.subject.kind);
    setCreatedAt(task.createdAt);
    if (task.subject.kind === "person") setPersonId(task.subject.id);
    if (task.subject.kind === "group") setGroupId(task.subject.id);
  }

  function subject(): TaskSubjectRef | null {
    if (kind === "loose") return { kind: "loose" };
    if (kind === "person") return personId ? { kind: "person", id: personId } : null;
    return groupId ? { kind: "group", id: groupId } : null;
  }

  async function onSubmit() {
    const nextSubject = subject();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (dueDate && !YMD.test(dueDate)) {
      setError("Use YYYY-MM-DD for the due date.");
      return;
    }
    if (!nextSubject) {
      setError(kind === "person" ? "Choose a person." : "Choose a group.");
      return;
    }
    const fields: TaskCreateInput = {
      name: name.trim(),
      description,
      dueDate: dueDate || null,
      subject: nextSubject,
    };
    setBusy(true);
    setError(null);
    try {
      if (editing && taskId) {
        const body: TaskInput = { ...fields, status };
        const saved = await api<Task>(`/api/tasks/${taskId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        applyTask(saved);
      } else {
        await api<Task>("/api/tasks", { method: "POST", body: JSON.stringify(fields) });
        router.replace((origin.from === "person" || origin.from === "group" ? back : "/tasks") as Href);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!taskId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tasks/${taskId}`, { method: "DELETE" });
      router.replace(back as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
      setBusy(false);
    }
  }

  const selectedPerson = people.find((person) => person.id === personId);
  const selectedGroup = groups.find((group) => group.id === groupId);
  const personMatches = people.filter((person) => includesFold(person.name, personQuery));
  const groupMatches = groups.filter((group) => includesFold(group.name, groupQuery));
  const personRows = personMatches.slice(0, 40);
  const groupRows = groupMatches.slice(0, 40);
  const overdue = isTaskOverdue({ status, dueDate: dueDate || null }, todayYmd());
  const selectedTemplateId =
    TASK_TEMPLATES.find((template) => template.name === name && template.description === description)?.id ??
    null;

  function applyTemplate(template: TaskTemplate) {
    if (template.id === selectedTemplateId) {
      setName("");
      setDescription("");
      return;
    }
    setName(template.name);
    setDescription(template.description);
  }

  if (!ready && !error) {
    return (
      <View className="flex-1 bg-paper px-6 pt-6">
        <Text className="text-ink-soft">Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-4 pb-12">
        {createdAt ? (
          <Text className="text-sm text-ink-soft">Created {formatCreatedAt(createdAt)}</Text>
        ) : null}
        {editing ? null : (
          <View>
            <Text className="text-sm text-ink">Templates</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {TASK_TEMPLATES.map((template) => (
                <Pressable
                  key={template.id}
                  className={
                    template.id === selectedTemplateId
                      ? "rounded-full bg-ink px-3 py-1"
                      : "rounded-full border border-line px-3 py-1"
                  }
                  onPress={() => applyTemplate(template)}
                >
                  <Text className={template.id === selectedTemplateId ? "text-sm text-paper" : "text-sm text-ink"}>
                    {template.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <Field label="Name">
          <TextInput
            className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
            value={name}
            onChangeText={setName}
            maxLength={200}
          />
        </Field>
        <Field label="Description">
          <TextInput
            className="mt-1 min-h-24 rounded-lg border border-line bg-card px-3 py-3 text-ink"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={4000}
          />
        </Field>
        <Field label="Due date (YYYY-MM-DD)">
          <TextInput
            className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="Optional"
            placeholderTextColor="#5c534a"
            autoCapitalize="none"
          />
        </Field>
        {dueDate ? (
          <Pressable className="mt-2" onPress={() => setDueDate("")}>
            <Text className="text-sm text-ink-soft">Clear date</Text>
          </Pressable>
        ) : null}
        {overdue ? <Text className="mt-2 text-sm text-rose">Overdue</Text> : null}

        {editing ? (
          <Field label="Status">
            <View className="mt-2 flex-row flex-wrap gap-2">
              {TASK_STATUSES.map((item) => (
                <Pressable
                  key={item}
                  className={
                    status === item
                      ? "rounded-full bg-ink px-3 py-1"
                      : "rounded-full border border-line px-3 py-1"
                  }
                  onPress={() => setStatus(item)}
                >
                  <Text className={status === item ? "text-sm text-paper" : "text-sm text-ink"}>
                    {TASK_STATUS_LABELS[item]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
        ) : (
          <Text className="mt-4 text-sm text-ink-soft">Starts as pending.</Text>
        )}

        <Text className="mt-4 text-sm text-ink">About</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(
            [
              ["loose", "No one"],
              ["person", "Person"],
              ["group", "Group"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              className={
                kind === value
                  ? "rounded-full bg-ink px-3 py-1"
                  : "rounded-full border border-line px-3 py-1"
              }
              onPress={() => setKind(value)}
            >
              <Text className={kind === value ? "text-sm text-paper" : "text-sm text-ink"}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {kind === "person" ? (
          <View className="mt-3">
            <Text className="text-sm text-ink">
              {selectedPerson
                ? `Selected: ${selectedPerson.name}${selectedPerson.pausedAt ? " · paused" : ""}`
                : "Choose a person."}
            </Text>
            <TextInput
              className="mt-2 rounded-lg border border-line bg-card px-3 py-3 text-ink"
              placeholder="Filter people"
              placeholderTextColor="#5c534a"
              value={personQuery}
              onChangeText={setPersonQuery}
              autoCorrect={false}
            />
            <View className="mt-2 gap-2">
              {personRows.map((person) => (
                <Pressable
                  key={person.id}
                  className={
                    person.id === personId
                      ? "rounded-lg bg-ink px-3 py-2"
                      : "rounded-lg border border-line bg-card px-3 py-2"
                  }
                  onPress={() => setPersonId(person.id)}
                >
                  <Text className={person.id === personId ? "text-paper" : "text-ink"}>
                    {person.name}
                    {person.pausedAt ? " · paused" : ""}
                  </Text>
                </Pressable>
              ))}
              {personRows.length === 0 ? (
                <Text className="text-sm text-ink-soft">
                  {people.length === 0 ? "No people yet." : "No people match."}
                </Text>
              ) : null}
              {personMatches.length > personRows.length ? (
                <Text className="text-sm text-ink-soft">Type to narrow the list.</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {kind === "group" ? (
          <View className="mt-3">
            <Text className="text-sm text-ink">
              {selectedGroup ? `Selected: ${selectedGroup.name}` : "Choose a group."}
            </Text>
            <TextInput
              className="mt-2 rounded-lg border border-line bg-card px-3 py-3 text-ink"
              placeholder="Filter groups"
              placeholderTextColor="#5c534a"
              value={groupQuery}
              onChangeText={setGroupQuery}
              autoCorrect={false}
            />
            <View className="mt-2 gap-2">
              {groupRows.map((group) => (
                <Pressable
                  key={group.id}
                  className={
                    group.id === groupId
                      ? "rounded-lg bg-ink px-3 py-2"
                      : "rounded-lg border border-line bg-card px-3 py-2"
                  }
                  onPress={() => setGroupId(group.id)}
                >
                  <Text className={group.id === groupId ? "text-paper" : "text-ink"}>{group.name}</Text>
                </Pressable>
              ))}
              {groupRows.length === 0 ? (
                <Text className="text-sm text-ink-soft">
                  {groups.length === 0 ? "No groups yet." : "No groups match."}
                </Text>
              ) : null}
              {groupMatches.length > groupRows.length ? (
                <Text className="text-sm text-ink-soft">Type to narrow the list.</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {error ? <Text className="mt-3 text-sm text-rose">{error}</Text> : null}
        <Pressable
          className="mt-6 rounded-lg bg-ink py-3 disabled:opacity-60"
          disabled={busy}
          onPress={() => void onSubmit()}
        >
          <Text className="text-center font-sans-medium text-paper">{busy ? "Saving…" : "Save"}</Text>
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
