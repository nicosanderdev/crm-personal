export type ActivityGrain = "day" | "week" | "month";

export type ActivitySpan = {
  start: string;
  end: string;
};

export type ActivityBucket = ActivitySpan & {
  count: number;
};

export type ActivityRow = {
  id: string | null;
  name: string;
  count: number;
};

export type ActivityBlock = {
  total: number;
  buckets: ActivityBucket[];
  people: ActivityRow[];
  groups: ActivityRow[];
};

export type ActivityTaskBlock = ActivityBlock & {
  loose: number;
};

export type ActivityResponse = {
  from: string;
  to: string;
  conversations: ActivityBlock;
  tasks: ActivityTaskBlock;
};

export const ACTIVITY_PRESET_DAYS = [7, 30, 90, 365] as const;

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseActivityDay(value: string): { year: number; month: number; day: number } | null {
  const match = YMD_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function formatDay(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDaysYmd(ymd: string, days: number): string | null {
  const parsed = parseActivityDay(ymd);
  if (!parsed || !Number.isInteger(days)) return null;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function inclusiveDayCount(from: string, to: string): number | null {
  const start = parseActivityDay(from);
  const end = parseActivityDay(to);
  if (!start || !end || from > to) return null;
  const ms = Date.UTC(end.year, end.month - 1, end.day) - Date.UTC(start.year, start.month - 1, start.day);
  return Math.round(ms / 86400000) + 1;
}

export function activityGrain(from: string, to: string): ActivityGrain | null {
  const count = inclusiveDayCount(from, to);
  if (count == null) return null;
  if (count <= 31) return "day";
  if (count <= 120) return "week";
  return "month";
}

export function rollingRange(today: string, days: number): { from: string; to: string } | null {
  if (!parseActivityDay(today) || !Number.isInteger(days) || days < 1) return null;
  const from = addDaysYmd(today, 1 - days);
  if (!from) return null;
  return { from, to: today };
}

function mondayOnOrBefore(ymd: string): string | null {
  const parsed = parseActivityDay(ymd);
  if (!parsed) return null;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return formatDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function activityBucketStart(day: string, from: string, to: string): string | null {
  if (!parseActivityDay(day) || day < from || day > to) return null;
  const grain = activityGrain(from, to);
  if (!grain) return null;
  if (grain === "day") return day;
  if (grain === "week") {
    const monday = mondayOnOrBefore(day);
    if (!monday) return null;
    return monday < from ? from : monday;
  }
  const monthStart = `${day.slice(0, 7)}-01`;
  if (!parseActivityDay(monthStart)) return null;
  return monthStart < from ? from : monthStart;
}

export function activitySpans(from: string, to: string): ActivitySpan[] | null {
  const grain = activityGrain(from, to);
  if (!grain) return null;
  const spans: ActivitySpan[] = [];
  let cursor = from;
  while (cursor <= to) {
    let end = cursor;
    if (grain === "week") {
      const monday = mondayOnOrBefore(cursor);
      const sunday = monday ? addDaysYmd(monday, 6) : null;
      if (!sunday) return null;
      end = sunday < to ? sunday : to;
    } else if (grain === "month") {
      const parsed = parseActivityDay(cursor);
      if (!parsed) return null;
      const monthEnd = new Date(Date.UTC(parsed.year, parsed.month, 0));
      const last = formatDay(monthEnd.getUTCFullYear(), monthEnd.getUTCMonth() + 1, monthEnd.getUTCDate());
      end = last < to ? last : to;
    }
    spans.push({ start: cursor, end });
    const next = addDaysYmd(end, 1);
    if (!next || next <= cursor) return null;
    cursor = next;
  }
  return spans;
}
