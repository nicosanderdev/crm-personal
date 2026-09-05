import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { SNOOZE_DAYS, type SnoozeDays } from "@crm/shared";
import { HttpError } from "../middleware.ts";
import { InteractionModel } from "../models/interaction.ts";
import { PersonModel } from "../models/person.ts";
import { presignUpload } from "../r2.ts";
import { personInputSchema, toPersonDto, toPersonInput } from "../serialize.ts";

export const peopleRouter = Router();

peopleRouter.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { organization: { $regex: q, $options: "i" } },
            { tags: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const docs = await PersonModel.find(filter).sort({ name: 1 });
    res.json(await Promise.all(docs.map(toPersonDto)));
  } catch (err) {
    next(err);
  }
});

peopleRouter.post("/", async (req, res, next) => {
  try {
    const input = toPersonInput(personInputSchema.parse(req.body));
    const doc = await PersonModel.create(input);
    res.status(201).json(await toPersonDto(doc));
  } catch (err) {
    next(err);
  }
});

peopleRouter.get("/:id", async (req, res, next) => {
  try {
    const doc = await findPerson(req.params.id);
    res.json(await toPersonDto(doc));
  } catch (err) {
    next(err);
  }
});

peopleRouter.put("/:id", async (req, res, next) => {
  try {
    const doc = await findPerson(req.params.id);
    const input = toPersonInput(personInputSchema.parse(req.body));
    Object.assign(doc, input);
    await doc.save();
    res.json(await toPersonDto(doc));
  } catch (err) {
    next(err);
  }
});

peopleRouter.delete("/:id", async (req, res, next) => {
  try {
    const doc = await findPerson(req.params.id);
    await InteractionModel.deleteMany({ personId: doc._id });
    await doc.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

peopleRouter.post("/:id/pause", async (req, res, next) => {
  try {
    const doc = await findPerson(req.params.id);
    doc.pausedAt = new Date();
    await doc.save();
    res.json(await toPersonDto(doc));
  } catch (err) {
    next(err);
  }
});

peopleRouter.post("/:id/unpause", async (req, res, next) => {
  try {
    const doc = await findPerson(req.params.id);
    doc.pausedAt = null;
    await doc.save();
    res.json(await toPersonDto(doc));
  } catch (err) {
    next(err);
  }
});

peopleRouter.post("/:id/snooze", async (req, res, next) => {
  try {
    const { days } = z
      .object({
        days: z.custom<SnoozeDays>((v) => SNOOZE_DAYS.includes(v as SnoozeDays)),
      })
      .parse(req.body);
    const doc = await findPerson(req.params.id);
    const until = new Date();
    until.setDate(until.getDate() + days);
    doc.snoozedUntil = until;
    await doc.save();
    res.json(await toPersonDto(doc));
  } catch (err) {
    next(err);
  }
});

peopleRouter.post("/:id/photo/presign", async (req, res, next) => {
  try {
    const { contentType } = z
      .object({ contentType: z.string().min(1) })
      .parse(req.body);
    const doc = await findPerson(req.params.id);
    const result = await presignUpload(String(doc._id), contentType);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

peopleRouter.put("/:id/photo", async (req, res, next) => {
  try {
    const { key } = z.object({ key: z.string().min(1) }).parse(req.body);
    const doc = await findPerson(req.params.id);
    const prefix = `people/${String(doc._id)}/`;
    if (!key.startsWith(prefix)) {
      throw new HttpError(400, "Invalid photo key");
    }
    doc.photoKey = key;
    await doc.save();
    res.json(await toPersonDto(doc));
  } catch (err) {
    next(err);
  }
});

export async function findPerson(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Person not found");
  }
  const doc = await PersonModel.findById(id);
  if (!doc) {
    throw new HttpError(404, "Person not found");
  }
  return doc;
}

export function personIdParam(req: { params: { id?: string } }): string {
  const id = req.params.id;
  if (!id) {
    throw new HttpError(404, "Person not found");
  }
  return id;
}
