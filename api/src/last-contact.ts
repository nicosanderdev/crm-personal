import type { Channel } from "@crm/shared";
import mongoose from "mongoose";
import { GroupLogModel } from "./models/group-log.ts";
import { InteractionModel } from "./models/interaction.ts";
import { PersonModel } from "./models/person.ts";

const PREVIEW_MAX = 180;

export type ContactCandidate = {
  id: string;
  kind: "personal" | "group";
  date: Date;
  createdAt: Date;
  channel: Channel;
  notes: string;
  groupName: string | null;
};

export function calendarDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function contactPreview(candidate: ContactCandidate): string {
  if (candidate.kind === "group") {
    const name = (candidate.groupName ?? "").trim();
    const note = candidate.notes.trim();
    if (!note) return name.slice(0, PREVIEW_MAX);
    return `${name} · ${note}`.slice(0, PREVIEW_MAX);
  }
  return (candidate.notes.trim() || candidate.channel).slice(0, PREVIEW_MAX);
}

export function winningContact(candidates: ContactCandidate[]): ContactCandidate | null {
  if (candidates.length === 0) return null;
  let bestDay = calendarDay(candidates[0].date);
  for (const candidate of candidates) {
    const day = calendarDay(candidate.date);
    if (day > bestDay) bestDay = day;
  }
  const onDay = candidates.filter((candidate) => calendarDay(candidate.date) === bestDay);
  const personal = onDay.filter((candidate) => candidate.kind === "personal");
  const pool = personal.length > 0 ? personal : onDay;
  let winner = pool[0];
  for (const candidate of pool) {
    if (candidate.createdAt.getTime() > winner.createdAt.getTime()) winner = candidate;
  }
  return winner;
}

export function createdAtOf(doc: { get(path: string): unknown }): Date {
  const value = doc.get("createdAt");
  return value instanceof Date ? value : new Date(0);
}

export async function refreshLastContact(
  personIds: string[],
  options?: {
    clearSnoozeWhen?: (personId: string, winner: ContactCandidate | null) => boolean;
  },
): Promise<void> {
  const unique = [...new Set(personIds)].filter((id) => mongoose.isValidObjectId(id));
  if (unique.length === 0) return;
  const oids = unique.map((id) => new mongoose.Types.ObjectId(id));
  const refreshing = new Set(unique);
  const [people, interactions, logs] = await Promise.all([
    PersonModel.find({ _id: { $in: oids } }),
    InteractionModel.find({ personId: { $in: oids } }),
    GroupLogModel.find({ audienceIds: { $in: oids }, countsAsContact: true }),
  ]);

  const byPerson = new Map<string, ContactCandidate[]>();
  const add = (personId: string, candidate: ContactCandidate) => {
    const list = byPerson.get(personId) ?? [];
    list.push(candidate);
    byPerson.set(personId, list);
  };

  for (const doc of interactions) {
    add(String(doc.personId), {
      id: String(doc._id),
      kind: "personal",
      date: doc.date,
      createdAt: createdAtOf(doc),
      channel: doc.channel as Channel,
      notes: doc.notes,
      groupName: null,
    });
  }

  for (const doc of logs) {
    const candidate: ContactCandidate = {
      id: String(doc._id),
      kind: "group",
      date: doc.date,
      createdAt: createdAtOf(doc),
      channel: doc.channel as Channel,
      notes: doc.notes,
      groupName: doc.groupName,
    };
    for (const memberId of doc.audienceIds) {
      const id = String(memberId);
      if (refreshing.has(id)) add(id, candidate);
    }
  }

  for (const person of people) {
    const id = String(person._id);
    const winner = winningContact(byPerson.get(id) ?? []);
    if (!winner) {
      person.lastInteractionAt = null;
      person.lastInteractionPreview = null;
      person.lastInteractionChannel = null;
    } else {
      person.lastInteractionAt = winner.date;
      person.lastInteractionPreview = contactPreview(winner);
      person.lastInteractionChannel = winner.channel;
    }
    if (options?.clearSnoozeWhen?.(id, winner)) person.snoozedUntil = null;
    await person.save();
  }
}
