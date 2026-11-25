import {
  addDaysYmd,
  parseActivityDay,
} from "@crm/shared";
import { Router } from "express";
import { assembleActivity, calendarDayInTimeZone, isTimeZone } from "../activity-report.ts";
import { HttpError } from "../middleware.ts";
import { GroupLogModel } from "../models/group-log.ts";
import { GroupModel } from "../models/group.ts";
import { InteractionModel } from "../models/interaction.ts";
import { PersonModel } from "../models/person.ts";
import { TaskModel } from "../models/task.ts";

export const activityRouter = Router();

activityRouter.get("/", async (req, res, next) => {
  try {
    const from = queryString(req.query.from);
    const to = queryString(req.query.to);
    const timeZone = queryString(req.query.timeZone);
    if (!parseActivityDay(from) || !parseActivityDay(to)) {
      throw new HttpError(400, "from and to must be YYYY-MM-DD");
    }
    if (from > to) throw new HttpError(400, "Start is after end");
    if (!isTimeZone(timeZone)) throw new HttpError(400, "Invalid time zone");

    const toNext = addDaysYmd(to, 1);
    if (!toNext) throw new HttpError(400, "from and to must be YYYY-MM-DD");
    const fromInstant = new Date(`${from}T00:00:00.000Z`);
    const toExclusive = new Date(`${toNext}T00:00:00.000Z`);
    const taskFrom = new Date(fromInstant);
    taskFrom.setUTCDate(taskFrom.getUTCDate() - 2);
    const taskTo = new Date(toExclusive);
    taskTo.setUTCDate(taskTo.getUTCDate() + 2);

    const [interactions, logs, taskDocs] = await Promise.all([
      InteractionModel.find({ date: { $gte: fromInstant, $lt: toExclusive } }),
      GroupLogModel.find({
        countsAsContact: true,
        date: { $gte: fromInstant, $lt: toExclusive },
      }),
      TaskModel.find({
        status: "completed",
        statusChangedAt: { $gte: taskFrom, $lt: taskTo },
      }),
    ]);

    const personIds = new Set<string>();
    const groupIds = new Set<string>();
    for (const doc of interactions) personIds.add(String(doc.personId));
    for (const doc of logs) {
      if (doc.groupId) groupIds.add(String(doc.groupId));
    }
    for (const doc of taskDocs) {
      if (doc.personId) personIds.add(String(doc.personId));
      if (doc.groupId) groupIds.add(String(doc.groupId));
    }

    const [people, groups] = await Promise.all([
      personIds.size ? PersonModel.find({ _id: { $in: [...personIds] } }).select("name") : [],
      groupIds.size ? GroupModel.find({ _id: { $in: [...groupIds] } }).select("name") : [],
    ]);
    const personNames = new Map(people.map((person) => [String(person._id), person.name]));
    const groupNames = new Map(groups.map((group) => [String(group._id), group.name]));

    const report = assembleActivity({
      from,
      to,
      interactions: interactions.flatMap((doc) => {
        const day = doc.date.toISOString().slice(0, 10);
        if (day < from || day > to) return [];
        return [{ personId: String(doc.personId), day }];
      }),
      groupLogs: logs.flatMap((doc) => {
        const day = doc.date.toISOString().slice(0, 10);
        if (day < from || day > to) return [];
        return [{ groupId: doc.groupId ? String(doc.groupId) : null, groupName: doc.groupName, day }];
      }),
      tasks: taskDocs.flatMap((doc) => {
        const day = calendarDayInTimeZone(doc.statusChangedAt, timeZone);
        if (day < from || day > to) return [];
        return [
          {
            personId: doc.personId ? String(doc.personId) : null,
            groupId: doc.groupId ? String(doc.groupId) : null,
            day,
          },
        ];
      }),
      personNames,
      groupNames,
    });
    if (!report) throw new Error("Could not build activity");
    res.json(report);
  } catch (err) {
    next(err);
  }
});

function queryString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}
