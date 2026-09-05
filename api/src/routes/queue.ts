import { Router } from "express";
import type { BirthdayItem, QueueItem, Tier } from "@crm/shared";
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
    const birthdays: BirthdayItem[] = [];

    for (const person of people) {
      const daysUntil = daysUntilBirthday(person.birthday, now);
      if (daysUntil !== null && daysUntil <= 7) {
        birthdays.push({ person, daysUntil });
      }

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
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil || a.person.name.localeCompare(b.person.name));

    res.json({ due, birthdays, tierDays });
  } catch (err) {
    next(err);
  }
});

function daysUntilBirthday(birthday: string | null, now: Date): number | null {
  if (!birthday) return null;
  const parts = birthday.split("-").map(Number);
  const month = parts[1];
  const day = parts[2];
  if (!month || !day) return null;

  const year = now.getFullYear();
  let next = new Date(year, month - 1, day);
  if (month === 2 && day === 29 && next.getMonth() !== 1) {
    next = new Date(year, 1, 28);
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (next < today) {
    next = new Date(year + 1, month - 1, day);
    if (month === 2 && day === 29 && next.getMonth() !== 1) {
      next = new Date(year + 1, 1, 28);
    }
  }
  return Math.round((next.getTime() - today.getTime()) / MS_DAY);
}
