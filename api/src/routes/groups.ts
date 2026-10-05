import {
  CHANNELS,
  type Channel,
  type GroupDetail,
  type GroupInput,
  type GroupLog,
  type GroupMember,
  type GroupSummary,
} from "@crm/shared";
import { Router } from "express";
import mongoose, { type HydratedDocument } from "mongoose";
import { z } from "zod";
import { HttpError } from "../middleware.ts";
import { refreshLastContact } from "../last-contact.ts";
import { GroupLogModel, type GroupLogDoc } from "../models/group-log.ts";
import { GroupModel, type GroupDoc } from "../models/group.ts";
import { PersonModel } from "../models/person.ts";
import { iso, parseDay } from "../serialize.ts";

export const groupsRouter = Router();

const groupInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  memberIds: z.array(z.string()).default([]),
});

const groupLogInputSchema = z.object({
  date: z.string().min(1),
  channel: z.enum(CHANNELS),
  notes: z.string().trim().max(8000).default(""),
  countsAsContact: z.boolean(),
  audienceIds: z.array(z.string()).min(1),
});

groupsRouter.get("/", async (_req, res, next) => {
  try {
    const docs = await GroupModel.find();
    const summaries = docs.map(toGroupSummary);
    summaries.sort(byName);
    res.json(summaries);
  } catch (err) {
    next(err);
  }
});

groupsRouter.post("/", async (req, res, next) => {
  try {
    const input = toGroupInput(groupInputSchema.parse(req.body));
    await assertKnownPeople(input.memberIds);
    const doc = await GroupModel.create({
      name: input.name,
      memberIds: input.memberIds.map((id) => new mongoose.Types.ObjectId(id)),
    });
    res.status(201).json(await toGroupDetail(doc));
  } catch (err) {
    next(err);
  }
});

groupsRouter.get("/:id", async (req, res, next) => {
  try {
    const doc = await findGroup(req.params.id);
    res.json(await toGroupDetail(doc));
  } catch (err) {
    next(err);
  }
});

groupsRouter.put("/:id", async (req, res, next) => {
  try {
    const doc = await findGroup(req.params.id);
    const input = toGroupInput(groupInputSchema.parse(req.body));
    await assertKnownPeople(input.memberIds);
    const nameChanged = doc.name !== input.name;
    doc.name = input.name;
    doc.memberIds = input.memberIds.map((id) => new mongoose.Types.ObjectId(id));
    await doc.save();
    if (nameChanged) {
      await GroupLogModel.updateMany({ groupId: doc._id }, { groupName: doc.name });
      const logs = await GroupLogModel.find({ groupId: doc._id, countsAsContact: true });
      const personIds = logs.flatMap((log) => log.audienceIds.map(String));
      await refreshLastContact(personIds);
    }
    res.json(await toGroupDetail(doc));
  } catch (err) {
    next(err);
  }
});

groupsRouter.delete("/:id", async (req, res, next) => {
  try {
    const doc = await findGroup(req.params.id);
    await GroupLogModel.updateMany({ groupId: doc._id }, { $set: { groupId: null } });
    await doc.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

groupsRouter.post("/:id/logs", async (req, res, next) => {
  try {
    const group = await findGroup(req.params.id);
    const input = parseLogInput(req.body);
    assertAudience(input.audienceIds, group.memberIds.map(String), []);
    const date = requireDay(input.date);
    const log = await GroupLogModel.create({
      groupId: group._id,
      groupName: group.name,
      date,
      channel: input.channel,
      notes: input.notes,
      countsAsContact: input.countsAsContact,
      audienceIds: input.audienceIds.map((id) => new mongoose.Types.ObjectId(id)),
    });
    const logId = String(log._id);
    await refreshLastContact(input.audienceIds, {
      clearSnoozeWhen: (_personId, winner) => winner?.kind === "group" && winner.id === logId,
    });
    res.status(201).json(await toGroupLogDto(log));
  } catch (err) {
    next(err);
  }
});

groupsRouter.put("/:id/logs/:logId", async (req, res, next) => {
  try {
    const group = await findGroup(req.params.id);
    const log = await findGroupLog(group._id, req.params.logId);
    const input = parseLogInput(req.body);
    const previousAudience = log.audienceIds.map(String);
    assertAudience(input.audienceIds, group.memberIds.map(String), previousAudience);
    const date = requireDay(input.date);
    log.groupName = group.name;
    log.date = date;
    log.channel = input.channel;
    log.notes = input.notes;
    log.countsAsContact = input.countsAsContact;
    log.audienceIds = input.audienceIds.map((id) => new mongoose.Types.ObjectId(id));
    await log.save();
    const logId = String(log._id);
    await refreshLastContact([...previousAudience, ...input.audienceIds], {
      clearSnoozeWhen: (_personId, winner) => winner?.kind === "group" && winner.id === logId,
    });
    res.json(await toGroupLogDto(log));
  } catch (err) {
    next(err);
  }
});

groupsRouter.delete("/:id/logs/:logId", async (req, res, next) => {
  try {
    const group = await findGroup(req.params.id);
    const log = await findGroupLog(group._id, req.params.logId);
    const audience = log.audienceIds.map(String);
    await log.deleteOne();
    await refreshLastContact(audience);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function toGroupInput(data: z.infer<typeof groupInputSchema>): GroupInput {
  return { name: data.name, memberIds: uniqueIds(data.memberIds) };
}

function parseLogInput(body: unknown): z.infer<typeof groupLogInputSchema> & { audienceIds: string[] } {
  const input = groupLogInputSchema.parse(body);
  const audienceIds = uniqueIds(input.audienceIds);
  if (audienceIds.length === 0) {
    throw new HttpError(400, "Choose at least one person");
  }
  return { ...input, audienceIds };
}

function requireDay(value: string): Date {
  const date = parseDay(value);
  if (!date) throw new HttpError(400, "Invalid date");
  return date;
}

function uniqueIds(ids: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

async function assertKnownPeople(ids: string[]) {
  if (ids.length === 0) return;
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new HttpError(400, "Unknown person");
  }
  const found = await PersonModel.countDocuments({
    _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
  });
  if (found !== ids.length) throw new HttpError(400, "Unknown person");
}

function assertAudience(audienceIds: string[], memberIds: string[], existingAudience: string[]) {
  const allowed = new Set([...memberIds, ...existingAudience]);
  if (audienceIds.some((id) => !allowed.has(id))) {
    throw new HttpError(
      400,
      "Choose people who are in the group, or who are already on this log",
    );
  }
}

async function findGroup(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, "Group not found");
  const doc = await GroupModel.findById(id);
  if (!doc) throw new HttpError(404, "Group not found");
  return doc;
}

async function findGroupLog(groupId: mongoose.Types.ObjectId, logId: string) {
  if (!mongoose.isValidObjectId(logId)) throw new HttpError(404, "Log not found");
  const doc = await GroupLogModel.findOne({ _id: logId, groupId });
  if (!doc) throw new HttpError(404, "Log not found");
  return doc;
}

function toGroupSummary(doc: HydratedDocument<GroupDoc>): GroupSummary {
  return {
    id: String(doc._id),
    name: doc.name,
    memberCount: doc.memberIds.length,
    createdAt: iso(doc.get("createdAt") as Date),
    updatedAt: iso(doc.get("updatedAt") as Date),
  };
}

async function toGroupDetail(doc: HydratedDocument<GroupDoc>): Promise<GroupDetail> {
  const logs = await GroupLogModel.find({ groupId: doc._id });
  const ids = new Set<string>(doc.memberIds.map(String));
  for (const log of logs) for (const id of log.audienceIds) ids.add(String(id));
  const names = await loadNames([...ids]);
  const summary = toGroupSummary(doc);
  return {
    id: summary.id,
    name: summary.name,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    members: membersFrom(doc.memberIds.map(String), names),
    logs: logs
      .map((log) => toGroupLog(log, names))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
  };
}

async function toGroupLogDto(doc: HydratedDocument<GroupLogDoc>): Promise<GroupLog> {
  const names = await loadNames(doc.audienceIds.map(String));
  return toGroupLog(doc, names);
}

function toGroupLog(doc: HydratedDocument<GroupLogDoc>, names: Map<string, string>): GroupLog {
  return {
    id: String(doc._id),
    date: doc.date.toISOString(),
    channel: doc.channel as Channel,
    notes: doc.notes,
    countsAsContact: doc.countsAsContact,
    audience: membersFrom(doc.audienceIds.map(String), names),
    createdAt: iso(doc.get("createdAt") as Date),
    updatedAt: iso(doc.get("updatedAt") as Date),
  };
}

async function loadNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const people = await PersonModel.find(
    { _id: { $in: ids.filter((id) => mongoose.isValidObjectId(id)) } },
    { name: 1 },
  );
  return new Map(people.map((person) => [String(person._id), person.name]));
}

function membersFrom(ids: string[], names: Map<string, string>): GroupMember[] {
  return ids
    .flatMap((id) => {
      const name = names.get(id);
      return name ? [{ id, name }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function byName(a: GroupSummary, b: GroupSummary): number {
  const name = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  if (name !== 0) return name;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}
