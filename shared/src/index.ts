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
