import { Router } from "express";
import {
  BIRTHDAY_HORIZON_DAYS,
  type DatesDay,
  type DatesResponse,
  type Occasion,
  daysUntilBirthday,
  nextBirthdayOnOrAfter,
  normalizeTags,
} from "@crm/shared";
import { OccasionModel } from "../models/occasion.ts";
import { PersonModel } from "../models/person.ts";
import { requireToday, toOccasionDto } from "../occasion-serialize.ts";
import { toPersonDto } from "../serialize.ts";

export const datesRouter = Router();

datesRouter.get("/", async (req, res, next) => {
  try {
    const today = requireToday(req.query.today);
    const [occasionDocs, personDocs] = await Promise.all([
      OccasionModel.find({ date: { $gte: today } }),
      PersonModel.find({ birthday: { $nin: [null, ""] } }),
    ]);

    const occasions = occasionDocs.map(toOccasionDto);
    const people = await Promise.all(personDocs.map(toPersonDto));

    const byDate = new Map<string, DatesDay>();

    function day(date: string): DatesDay {
      let entry = byDate.get(date);
      if (!entry) {
        entry = { date, occasions: [], birthdays: [] };
        byDate.set(date, entry);
      }
      return entry;
    }

    for (const occasion of occasions) {
      day(occasion.date).occasions.push(occasion);
    }

    for (const person of people) {
      const until = daysUntilBirthday(person.birthday, today);
      if (until === null || until > BIRTHDAY_HORIZON_DAYS) continue;
      const date = nextBirthdayOnOrAfter(person.birthday ?? "", today);
      if (!date) continue;
      day(date).birthdays.push(person);
    }

    const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    for (const group of days) {
      group.occasions.sort(compareOccasions);
      group.birthdays.sort((a, b) => a.name.localeCompare(b.name));
    }

    const payload: DatesResponse = { days };
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

datesRouter.get("/tags", async (req, res, next) => {
  try {
    const today = requireToday(req.query.today);
    const [people, occasions] = await Promise.all([
      PersonModel.find({}, { tags: 1 }),
      OccasionModel.find({ date: { $gte: today } }, { tags: 1 }),
    ]);
    const tags = normalizeTags([
      ...people.flatMap((doc) => doc.tags ?? []),
      ...occasions.flatMap((doc) => doc.tags ?? []),
    ]).sort((a, b) => a.localeCompare(b));
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

function compareOccasions(a: Occasion, b: Occasion): number {
  const byTitle = a.title.localeCompare(b.title);
  if (byTitle !== 0) return byTitle;
  return a.id.localeCompare(b.id);
}
