import {
  CHANNEL_LABELS,
  TIER_LABELS,
  type Channel,
  type Person,
  type Tier,
} from "@crm/shared";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function formatDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso);
  const thenLocal = new Date(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate());
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((todayLocal.getTime() - thenLocal.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return formatDay(iso);
}

export function todayInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function channelLabel(channel: Channel | null): string {
  return channel ? CHANNEL_LABELS[channel] : "—";
}

export function tierLabel(tier: Tier): string {
  return TIER_LABELS[tier];
}

export function phoneHref(phone: string, scheme: "tel" | "sms"): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `${scheme}:${cleaned}`;
}

export function emptyCreate(): Pick<Person, "name" | "phone" | "tier" | "nextTalkingPoint"> {
  return {
    name: "",
    phone: "",
    tier: 3,
    nextTalkingPoint: "",
  };
}
