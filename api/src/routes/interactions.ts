import { Router } from "express";
import { CHANNELS } from "@crm/shared";
import { z } from "zod";
import { refreshLastContact } from "../last-contact.ts";
import { InteractionModel } from "../models/interaction.ts";
import { timelineForPerson } from "../timeline.ts";
import { findPerson, personIdParam } from "./people.ts";
import { iso, parseDay } from "../serialize.ts";

export const interactionsRouter = Router({ mergeParams: true });

const interactionSchema = z.object({
  date: z.string().min(1),
  channel: z.enum(CHANNELS),
  notes: z.string().trim().max(8000).default(""),
});

interactionsRouter.get("/", async (req, res, next) => {
  try {
    const person = await findPerson(personIdParam(req));
    res.json(await timelineForPerson(person._id));
  } catch (err) {
    next(err);
  }
});

interactionsRouter.post("/", async (req, res, next) => {
  try {
    const person = await findPerson(personIdParam(req));
    const body = interactionSchema.parse(req.body);
    const date = parseDay(body.date);
    if (!date) {
      res.status(400).json({ error: "Invalid date" });
      return;
    }
    const doc = await InteractionModel.create({
      personId: person._id,
      date,
      channel: body.channel,
      notes: body.notes,
    });
    await refreshLastContact([String(person._id)], { clearSnoozeWhen: () => true });
    res.status(201).json({
      id: String(doc._id),
      personId: String(doc.personId),
      date: doc.date.toISOString(),
      channel: doc.channel,
      notes: doc.notes,
      createdAt: iso(doc.get("createdAt") as Date),
    });
  } catch (err) {
    next(err);
  }
});
