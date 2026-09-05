import type { Channel, Person, PersonInput, SocialLink } from "@crm/shared";
import { CHANNELS, SOCIAL_TYPES } from "@crm/shared";
import type { HydratedDocument } from "mongoose";
import { z } from "zod";
import type { PersonDoc } from "./models/person.ts";
import { maybePhotoUrl } from "./r2.ts";

const socialLinkSchema = z.object({
  type: z.enum(SOCIAL_TYPES),
  value: z.string().trim().max(500),
});

export const personInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  organization: z.string().trim().max(200).default(""),
  role: z.string().trim().max(200).default(""),
  howWeMet: z.string().trim().max(2000).default(""),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  birthday: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  city: z.string().trim().max(200).default(""),
  timezone: z.string().trim().max(100).default(""),
  preferredChannel: z
    .union([z.enum(CHANNELS), z.literal(""), z.null()])
    .optional(),
  phone: z.string().trim().max(80).default(""),
  email: z.string().trim().max(200).default(""),
  socialLinks: z.array(socialLinkSchema).max(20).default([]),
  nextTalkingPoint: z.string().trim().max(2000).default(""),
});

export function toPersonInput(data: z.infer<typeof personInputSchema>): PersonInput {
  const preferred = data.preferredChannel;
  return {
    name: data.name,
    organization: data.organization,
    role: data.role,
    howWeMet: data.howWeMet,
    tags: data.tags,
    tier: data.tier,
    birthday: data.birthday,
    city: data.city,
    timezone: data.timezone,
    preferredChannel: preferred ? preferred : null,
    phone: data.phone,
    email: data.email,
    socialLinks: data.socialLinks.filter((l: SocialLink) => l.value.length > 0),
    nextTalkingPoint: data.nextTalkingPoint,
  };
}

export async function toPersonDto(
  doc: HydratedDocument<PersonDoc>,
): Promise<Person> {
  const createdAt = doc.get("createdAt") as Date;
  const updatedAt = doc.get("updatedAt") as Date;
  return {
    id: String(doc._id),
    name: doc.name,
    organization: doc.organization ?? "",
    role: doc.role ?? "",
    howWeMet: doc.howWeMet ?? "",
    tags: doc.tags ?? [],
    tier: doc.tier,
    birthday: doc.birthday || null,
    city: doc.city ?? "",
    timezone: doc.timezone ?? "",
    preferredChannel: (doc.preferredChannel as Channel | null) ?? null,
    phone: doc.phone ?? "",
    email: doc.email ?? "",
    socialLinks: (doc.socialLinks ?? [])
      .filter((l) => l.value)
      .map((l) => ({ type: l.type, value: l.value })),
    photoKey: doc.photoKey ?? null,
    photoUrl: await maybePhotoUrl(doc.photoKey),
    nextTalkingPoint: doc.nextTalkingPoint ?? "",
    lastInteractionAt: doc.lastInteractionAt?.toISOString() ?? null,
    lastInteractionPreview: doc.lastInteractionPreview ?? null,
    lastInteractionChannel: (doc.lastInteractionChannel as Channel | null) ?? null,
    snoozedUntil: doc.snoozedUntil?.toISOString() ?? null,
    pausedAt: doc.pausedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`);
}

export function iso(d: Date | string): string {
  return new Date(d).toISOString();
}
