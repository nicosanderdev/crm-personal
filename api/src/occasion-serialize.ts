import type { Occasion, OccasionInput } from "@crm/shared";
import { MAX_TAG_LENGTH, MAX_TAGS, YMD, normalizeTags } from "@crm/shared";
import type { HydratedDocument } from "mongoose";
import { z } from "zod";
import { HttpError } from "./middleware.ts";
import type { OccasionDoc } from "./models/occasion.ts";

export const todayQuerySchema = z.string().regex(YMD, "today must be YYYY-MM-DD");

export const occasionInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: z.string().regex(YMD, "date must be YYYY-MM-DD"),
  tags: z.array(z.string().trim().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS).default([]),
});

export function requireToday(raw: unknown): string {
  const parsed = todayQuerySchema.safeParse(String(raw ?? "").trim());
  if (!parsed.success) {
    throw new HttpError(400, "today must be YYYY-MM-DD");
  }
  return parsed.data;
}

export function toOccasionInput(data: z.infer<typeof occasionInputSchema>): OccasionInput {
  return {
    title: data.title,
    date: data.date,
    tags: normalizeTags(data.tags),
  };
}

export function toOccasionDto(doc: HydratedDocument<OccasionDoc>): Occasion {
  const createdAt = doc.get("createdAt") as Date;
  const updatedAt = doc.get("updatedAt") as Date;
  return {
    id: String(doc._id),
    title: doc.title,
    date: doc.date,
    tags: doc.tags ?? [],
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
