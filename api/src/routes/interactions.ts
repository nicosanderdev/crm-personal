import { Router } from "express";
import { CHANNELS, type Channel, type Interaction } from "@crm/shared";
import { z } from "zod";
import { InteractionModel } from "../models/interaction.ts";
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
    const docs = await InteractionModel.find({ personId: person._id }).sort({ date: -1 });
    res.json(
      docs.map(
        (d): Interaction => ({
          id: String(d._id),
          personId: String(d.personId),
          date: d.date.toISOString(),
          channel: d.channel as Channel,
          notes: d.notes,
          createdAt: iso(d.get("createdAt") as Date),
        }),
      ),
    );
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
    const preview = body.notes.trim().slice(0, 180) || body.channel;
    person.lastInteractionAt = date;
    person.lastInteractionPreview = preview;
    person.lastInteractionChannel = body.channel;
    person.snoozedUntil = null;
    await person.save();
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
