export const CHANNELS = [
  "in-person",
  "call",
  "video",
  "message",
  "email",
  "other",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  "in-person": "In person",
  call: "Call",
  video: "Video",
  message: "Message",
  email: "Email",
  other: "Other",
};

export const SOCIAL_TYPES = [
  "instagram",
  "linkedin",
  "twitter",
  "whatsapp",
  "website",
  "other",
] as const;
export type SocialType = (typeof SOCIAL_TYPES)[number];

export const SOCIAL_LABELS: Record<SocialType, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  whatsapp: "WhatsApp",
  website: "Website",
  other: "Other",
};

export const TIERS = [1, 2, 3, 4] as const;
export type Tier = (typeof TIERS)[number];

export const DEFAULT_TIER_DAYS: Record<Tier, number> = {
  1: 14,
  2: 30,
  3: 90,
  4: 365,
};

export const TIER_LABELS: Record<Tier, string> = {
  1: "T1 · often",
  2: "T2 · monthly",
  3: "T3 · quarterly",
  4: "T4 · yearly",
};

export const SNOOZE_DAYS = [3, 7, 14, 30] as const;
export type SnoozeDays = (typeof SNOOZE_DAYS)[number];

export const SNOOZE_LABELS: Record<SnoozeDays, string> = {
  3: "3 days",
  7: "1 week",
  14: "2 weeks",
  30: "1 month",
};

export type SocialLink = {
  type: SocialType;
  value: string;
};

export type Person = {
  id: string;
  name: string;
  organization: string;
  role: string;
  howWeMet: string;
  tags: string[];
  tier: Tier;
  birthday: string | null;
  city: string;
  timezone: string;
  preferredChannel: Channel | null;
  phone: string;
  email: string;
  socialLinks: SocialLink[];
  photoKey: string | null;
  photoUrl: string | null;
  nextTalkingPoint: string;
  lastInteractionAt: string | null;
  lastInteractionPreview: string | null;
  lastInteractionChannel: Channel | null;
  snoozedUntil: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonInput = {
  name: string;
  organization: string;
  role: string;
  howWeMet: string;
  tags: string[];
  tier: Tier;
  birthday: string | null;
  city: string;
  timezone: string;
  preferredChannel: Channel | null;
  phone: string;
  email: string;
  socialLinks: SocialLink[];
  nextTalkingPoint: string;
};

export const YMD = /^\d{4}-\d{2}-\d{2}$/;
export const BIRTHDAY_HORIZON_DAYS = 90;
export const MAX_TAGS = 30;
export const MAX_TAG_LENGTH = 50;

export type Occasion = {
  id: string;
  title: string;
  date: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type OccasionInput = {
  title: string;
  date: string;
  tags: string[];
};

export type DatesDay = {
  date: string;
  occasions: Occasion[];
  birthdays: Person[];
};

export type DatesResponse = {
  days: DatesDay[];
};

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (!tag || tag.length > MAX_TAG_LENGTH || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function parseYmd(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function formatYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayYmd(now = new Date()): string {
  return formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function daysBetweenYmd(from: string, to: string): number | null {
  const a = parseYmd(from);
  const b = parseYmd(to);
  if (!a || !b) return null;
  const start = new Date(a.year, a.month - 1, a.day).getTime();
  const end = new Date(b.year, b.month - 1, b.day).getTime();
  return Math.round((end - start) / 86400000);
}

function birthdayOnYear(year: number, month: number, day: number): string {
  const probe = new Date(year, month - 1, day);
  if (month === 2 && day === 29 && probe.getMonth() !== 1) {
    return formatYmd(year, 2, 28);
  }
  return formatYmd(year, month, day);
}

export function nextBirthdayOnOrAfter(birthday: string, today: string): string | null {
  const born = parseYmd(birthday);
  const current = parseYmd(today);
  if (!born || !current) return null;
  let next = birthdayOnYear(current.year, born.month, born.day);
  if (next < today) {
    next = birthdayOnYear(current.year + 1, born.month, born.day);
  }
  return next;
}

export function daysUntilBirthday(birthday: string | null, today: string): number | null {
  if (!birthday) return null;
  const next = nextBirthdayOnOrAfter(birthday, today);
  if (!next) return null;
  return daysBetweenYmd(today, next);
}

export function dayHeading(date: string, today: string): string {
  const diff = daysBetweenYmd(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  const parsed = parseYmd(date);
  if (!parsed) return date;
  return new Date(parsed.year, parsed.month - 1, parsed.day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export type Interaction = {
  id: string;
  personId: string;
  date: string;
  channel: Channel;
  notes: string;
  createdAt: string;
};

export type InteractionInput = {
  date: string;
  channel: Channel;
  notes: string;
};

export type TimelineEntry = {
  id: string;
  kind: "personal" | "group";
  date: string;
  channel: Channel;
  notes: string;
  createdAt: string;
  groupId: string | null;
  groupName: string | null;
  countsAsContact: boolean | null;
};

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupSummary = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GroupLog = {
  id: string;
  date: string;
  channel: Channel;
  notes: string;
  countsAsContact: boolean;
  audience: GroupMember[];
  createdAt: string;
  updatedAt: string;
};

export type GroupDetail = {
  id: string;
  name: string;
  members: GroupMember[];
  logs: GroupLog[];
  createdAt: string;
  updatedAt: string;
};

export type GroupInput = {
  name: string;
  memberIds: string[];
};

export type GroupLogInput = {
  date: string;
  channel: Channel;
  notes: string;
  countsAsContact: boolean;
  audienceIds: string[];
};

export type QueueItem = Person & {
  daysOverdue: number | null;
  neverContacted: boolean;
};

export type Settings = {
  tierDays: Record<Tier, number>;
};

export type Me = {
  email: string;
};

export const CSV_COLUMNS = [
  "name",
  "organization",
  "role",
  "howWeMet",
  "tags",
  "tier",
  "birthday",
  "city",
  "timezone",
  "preferredChannel",
  "phone",
  "email",
  "socialLinks",
  "nextTalkingPoint",
] as const;

export const CSV_TEMPLATE = `${CSV_COLUMNS.join(",")}
Ana Pérez,Acme,Designer,Met at a dinner,climbing|design,2,1990-04-12,Buenos Aires,America/Argentina/Buenos_Aires,message,+5491100000000,ana@example.com,instagram:@ana;linkedin:https://linkedin.com/in/ana,Ask about the mural project
`;

export const TASK_STATUSES = ["pending", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type TaskSubjectRef =
  | { kind: "loose" }
  | { kind: "person"; id: string }
  | { kind: "group"; id: string };

export type TaskSubject =
  | { kind: "loose" }
  | { kind: "person"; id: string; name: string }
  | { kind: "group"; id: string; name: string };

export type Task = {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
  subject: TaskSubject;
  createdAt: string;
  statusChangedAt: string;
  updatedAt: string;
};

export type TaskInput = {
  name: string;
  description: string;
  dueDate: string | null;
  subject: TaskSubjectRef;
  status: TaskStatus;
};

export type TaskCreateInput = Omit<TaskInput, "status">;

export type TaskOrigin = {
  from?: string | null;
  personId?: string | null;
  groupId?: string | null;
  view?: string | null;
  q?: string | null;
  page?: string | null;
};

export function parseTaskStatus(value: string | null | undefined): TaskStatus {
  if (value === "completed" || value === "cancelled") return value;
  return "pending";
}

export function includesFold(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

export function isTaskOverdue(task: Pick<Task, "status" | "dueDate">, today: string): boolean {
  return task.status === "pending" && task.dueDate != null && task.dueDate < today;
}

export function comparePendingTasks(
  a: Pick<Task, "dueDate" | "createdAt">,
  b: Pick<Task, "dueDate" | "createdAt">,
): number {
  if (a.dueDate && b.dueDate) {
    const byDate = a.dueDate.localeCompare(b.dueDate);
    if (byDate !== 0) return byDate;
    return a.createdAt.localeCompare(b.createdAt);
  }
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

export function compareClosedTasks(
  a: Pick<Task, "statusChangedAt" | "createdAt">,
  b: Pick<Task, "statusChangedAt" | "createdAt">,
): number {
  const byStatus = b.statusChangedAt.localeCompare(a.statusChangedAt);
  if (byStatus !== 0) return byStatus;
  return b.createdAt.localeCompare(a.createdAt);
}

export function tasksForView(tasks: Task[], view: TaskStatus, query = ""): Task[] {
  const filtered = tasks.filter((task) => task.status === view && includesFold(task.name, query));
  filtered.sort(view === "pending" ? comparePendingTasks : compareClosedTasks);
  return filtered;
}

export function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function taskSubjectPath(subject: TaskSubject): string | null {
  if (subject.kind === "person") return `/people/${subject.id}`;
  if (subject.kind === "group") return `/groups/${subject.id}`;
  return null;
}

export function taskSubjectLabel(subject: TaskSubject): string | null {
  if (subject.kind === "loose") return null;
  if (subject.name) return subject.name;
  return subject.kind === "person" ? "Person" : "Group";
}

export function taskListPath(origin: TaskOrigin): string {
  if (origin.from === "person" && origin.personId) return `/people/${origin.personId}`;
  if (origin.from === "group" && origin.groupId) return `/groups/${origin.groupId}`;
  const params = new URLSearchParams();
  if (origin.view === "completed" || origin.view === "cancelled") params.set("view", origin.view);
  if (origin.q?.trim()) params.set("q", origin.q.trim());
  const page = Number(origin.page ?? "1");
  if (Number.isFinite(page) && page > 1) params.set("page", String(Math.floor(page)));
  const qs = params.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}

export function taskFormPath(taskId: string | null, origin: TaskOrigin): string {
  const params = new URLSearchParams();
  if (origin.from) params.set("from", origin.from);
  if (origin.personId) params.set("personId", origin.personId);
  if (origin.groupId) params.set("groupId", origin.groupId);
  if (origin.view === "completed" || origin.view === "cancelled") params.set("view", origin.view);
  if (origin.q?.trim()) params.set("q", origin.q.trim());
  const page = Number(origin.page ?? "1");
  if (Number.isFinite(page) && page > 1) params.set("page", String(Math.floor(page)));
  const qs = params.toString();
  const base = taskId ? `/tasks/${taskId}` : "/tasks/new";
  return qs ? `${base}?${qs}` : base;
}

export const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;
