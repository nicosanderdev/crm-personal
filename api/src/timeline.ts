import type { Channel, TimelineEntry } from "@crm/shared";
import mongoose from "mongoose";
import { createdAtOf } from "./last-contact.ts";
import { GroupLogModel } from "./models/group-log.ts";
import { InteractionModel } from "./models/interaction.ts";
import { iso } from "./serialize.ts";

export async function timelineForPerson(
  personId: mongoose.Types.ObjectId,
): Promise<TimelineEntry[]> {
  const [interactions, logs] = await Promise.all([
    InteractionModel.find({ personId }),
    GroupLogModel.find({ audienceIds: personId }),
  ]);

  const entries: TimelineEntry[] = [
    ...interactions.map(
      (doc): TimelineEntry => ({
        id: String(doc._id),
        kind: "personal",
        date: doc.date.toISOString(),
        channel: doc.channel as Channel,
        notes: doc.notes,
        createdAt: iso(createdAtOf(doc)),
        groupId: null,
        groupName: null,
        countsAsContact: null,
      }),
    ),
    ...logs.map(
      (doc): TimelineEntry => ({
        id: String(doc._id),
        kind: "group",
        date: doc.date.toISOString(),
        channel: doc.channel as Channel,
        notes: doc.notes,
        createdAt: iso(createdAtOf(doc)),
        groupId: doc.groupId ? String(doc.groupId) : null,
        groupName: doc.groupName,
        countsAsContact: doc.countsAsContact,
      }),
    ),
  ];

  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
  return entries;
}
