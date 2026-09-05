import { Router } from "express";
import type { QueueItem, Tier } from "@crm/shared";
import { getTierDays } from "../models/settings.ts";
import { PersonModel } from "../models/person.ts";
import { toPersonDto } from "../serialize.ts";

export const queueRouter = Router();

const MS_DAY = 24 * 60 * 60 * 1000;

queueRouter.get("/", async (_req, res, next) => {
  try {
    const tierDays = await getTierDays();
    const now = new Date();
    const docs = await PersonModel.find({});
    const people = await Promise.all(docs.map(toPersonDto));

    const due: QueueItem[] = [];

    for (const person of people) {
      if (person.pausedAt) continue;
      if (person.snoozedUntil && new Date(person.snoozedUntil) > now) continue;

      const intervalDays = tierDays[person.tier as Tier];
      if (!person.lastInteractionAt) {
        due.push({ ...person, daysOverdue: null, neverContacted: true });
        continue;
      }
      const last = new Date(person.lastInteractionAt).getTime();
      const dueAt = last + intervalDays * MS_DAY;
      if (now.getTime() >= dueAt) {
        due.push({
          ...person,
          daysOverdue: Math.floor((now.getTime() - dueAt) / MS_DAY),
          neverContacted: false,
        });
      }
    }

    due.sort((a, b) => {
      const aKey = a.neverContacted ? Number.POSITIVE_INFINITY : (a.daysOverdue ?? 0);
      const bKey = b.neverContacted ? Number.POSITIVE_INFINITY : (b.daysOverdue ?? 0);
      if (bKey !== aKey) return bKey - aKey;
      return a.name.localeCompare(b.name);
    });

    res.json({ due, tierDays });
  } catch (err) {
    next(err);
  }
});
