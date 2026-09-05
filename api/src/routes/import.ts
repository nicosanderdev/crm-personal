import { Router } from "express";
import { parse } from "csv-parse/sync";
import {
  CHANNELS,
  CSV_TEMPLATE,
  SOCIAL_TYPES,
  TIERS,
  type Channel,
  type PersonInput,
  type SocialLink,
  type SocialType,
  type Tier,
  normalizeTags,
} from "@crm/shared";
import { PersonModel } from "../models/person.ts";
import { toPersonDto } from "../serialize.ts";

export const importRouter = Router();

importRouter.get("/template", (_req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="people-template.csv"');
  res.send(CSV_TEMPLATE);
});

importRouter.post("/", async (req, res, next) => {
  try {
    const csv = typeof req.body === "string" ? req.body : String(req.body?.csv ?? "");
    if (!csv.trim()) {
      res.status(400).json({ error: "CSV body is empty" });
      return;
    }
    const rows = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];

    const created = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const input = rowToPerson(row);
        const doc = await PersonModel.create(input);
        created.push(await toPersonDto(doc));
      } catch (err) {
        errors.push({
          row: i + 2,
          message: err instanceof Error ? err.message : "Invalid row",
        });
      }
    }

    res.json({ created: created.length, people: created, errors });
  } catch (err) {
    next(err);
  }
});

function rowToPerson(row: Record<string, string>): PersonInput {
  const name = (row.name ?? "").trim();
  if (!name) throw new Error("name is required");
  const tierNum = Number(row.tier || 3);
  if (!TIERS.includes(tierNum as Tier)) throw new Error("tier must be 1–4");
  const channelRaw = (row.preferredChannel ?? "").trim();
  const preferredChannel = channelRaw
    ? (CHANNELS as readonly string[]).includes(channelRaw)
      ? (channelRaw as Channel)
      : (() => {
          throw new Error(`unknown preferredChannel: ${channelRaw}`);
        })()
    : null;
  const birthday = (row.birthday ?? "").trim() || null;
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    throw new Error("birthday must be YYYY-MM-DD");
  }
  return {
    name,
    organization: (row.organization ?? "").trim(),
    role: (row.role ?? "").trim(),
    howWeMet: (row.howWeMet ?? "").trim(),
    tags: normalizeTags(
      (row.tags ?? "")
        .split("|")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
    tier: tierNum as Tier,
    birthday,
    city: (row.city ?? "").trim(),
    timezone: (row.timezone ?? "").trim(),
    preferredChannel,
    phone: (row.phone ?? "").trim(),
    email: (row.email ?? "").trim(),
    socialLinks: parseSocial((row.socialLinks ?? "").trim()),
    nextTalkingPoint: (row.nextTalkingPoint ?? "").trim(),
  };
}

function parseSocial(raw: string): SocialLink[] {
  if (!raw) return [];
  return raw.split(";").flatMap((part) => {
    const idx = part.indexOf(":");
    if (idx <= 0) return [];
    const type = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!value || !(SOCIAL_TYPES as readonly string[]).includes(type)) return [];
    return [{ type: type as SocialType, value }];
  });
}
