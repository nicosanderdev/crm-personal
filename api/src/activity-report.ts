import type { ActivityBlock, ActivityResponse, ActivityRow, ActivityTaskBlock } from "@crm/shared";
import { activityBucketStart, activitySpans } from "@crm/shared";

type EventDay = {
  day: string;
};

type ConversationEvent = EventDay & {
  personId: string;
};

type GroupEvent = EventDay & {
  groupId: string | null;
  groupName: string;
};

type TaskEvent = EventDay & {
  personId: string | null;
  groupId: string | null;
};

type Counted = {
  id: string | null;
  name: string;
  count: number;
};

export function calendarDayInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("Could not read the calendar day");
  return `${year}-${month}-${day}`;
}

export function isTimeZone(value: string): boolean {
  if (!value || value.length > 100) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function bump(map: Map<string, Counted>, key: string, id: string | null, name: string) {
  const current = map.get(key);
  if (current) {
    current.count += 1;
    return;
  }
  map.set(key, { id, name, count: 1 });
}

function sorted(map: Map<string, Counted>): ActivityRow[] {
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function bucketsFor(days: string[], from: string, to: string) {
  const spans = activitySpans(from, to);
  if (!spans) return null;
  const buckets = spans.map((span) => ({ ...span, count: 0 }));
  const index = new Map(buckets.map((bucket, i) => [bucket.start, i]));
  for (const day of days) {
    const start = activityBucketStart(day, from, to);
    const slot = start == null ? undefined : index.get(start);
    if (slot == null) return null;
    const bucket = buckets[slot];
    if (!bucket) return null;
    bucket.count += 1;
  }
  return buckets;
}

function personRow(
  map: Map<string, Counted>,
  personId: string,
  personNames: Map<string, string>,
) {
  const name = personNames.get(personId);
  if (name) bump(map, personId, personId, name);
  else bump(map, "unknown-person", null, "Unknown");
}

function groupRow(
  map: Map<string, Counted>,
  groupId: string | null,
  groupName: string,
  groupNames: Map<string, string>,
) {
  if (groupId && groupNames.has(groupId)) {
    bump(map, groupId, groupId, groupNames.get(groupId) ?? groupName);
    return;
  }
  bump(map, `deleted:${groupName}`, null, groupName);
}

export function assembleActivity(input: {
  from: string;
  to: string;
  interactions: ConversationEvent[];
  groupLogs: GroupEvent[];
  tasks: TaskEvent[];
  personNames: Map<string, string>;
  groupNames: Map<string, string>;
}): ActivityResponse | null {
  const conversationPeople = new Map<string, Counted>();
  const conversationGroups = new Map<string, Counted>();
  const conversationDays: string[] = [];
  for (const item of input.interactions) {
    personRow(conversationPeople, item.personId, input.personNames);
    conversationDays.push(item.day);
  }
  for (const item of input.groupLogs) {
    groupRow(conversationGroups, item.groupId, item.groupName, input.groupNames);
    conversationDays.push(item.day);
  }

  const taskPeople = new Map<string, Counted>();
  const taskGroups = new Map<string, Counted>();
  const taskDays: string[] = [];
  let loose = 0;
  for (const item of input.tasks) {
    if (item.personId) personRow(taskPeople, item.personId, input.personNames);
    else if (item.groupId) {
      const name = input.groupNames.get(item.groupId);
      if (name) bump(taskGroups, item.groupId, item.groupId, name);
      else bump(taskGroups, `missing-group:${item.groupId}`, null, "Unknown");
    } else loose += 1;
    taskDays.push(item.day);
  }

  const conversations = blockOf(
    input.from,
    input.to,
    conversationDays,
    sorted(conversationPeople),
    sorted(conversationGroups),
  );
  const taskBlock = blockOf(input.from, input.to, taskDays, sorted(taskPeople), sorted(taskGroups));
  if (!conversations || !taskBlock) return null;
  const tasks: ActivityTaskBlock = { ...taskBlock, loose, total: taskBlock.total + loose };
  return { from: input.from, to: input.to, conversations, tasks };
}

function blockOf(
  from: string,
  to: string,
  days: string[],
  people: ActivityRow[],
  groups: ActivityRow[],
): ActivityBlock | null {
  const buckets = bucketsFor(days, from, to);
  if (!buckets) return null;
  const total = people.reduce((sum, row) => sum + row.count, 0) + groups.reduce((sum, row) => sum + row.count, 0);
  return { total, buckets, people, groups };
}
