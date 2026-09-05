import { Router } from "express";
import mongoose from "mongoose";
import { HttpError } from "../middleware.ts";
import { OccasionModel } from "../models/occasion.ts";
import {
  occasionInputSchema,
  requireToday,
  toOccasionDto,
  toOccasionInput,
} from "../occasion-serialize.ts";

export const occasionsRouter = Router();

occasionsRouter.post("/", async (req, res, next) => {
  try {
    const today = requireToday(req.query.today);
    const input = toOccasionInput(occasionInputSchema.parse(req.body));
    if (input.date < today) {
      throw new HttpError(400, "Date cannot be in the past");
    }
    const doc = await OccasionModel.create(input);
    res.status(201).json(toOccasionDto(doc));
  } catch (err) {
    next(err);
  }
});

occasionsRouter.get("/:id", async (req, res, next) => {
  try {
    const doc = await findOccasion(req.params.id);
    res.json(toOccasionDto(doc));
  } catch (err) {
    next(err);
  }
});

occasionsRouter.put("/:id", async (req, res, next) => {
  try {
    const today = requireToday(req.query.today);
    const doc = await findOccasion(req.params.id);
    const input = toOccasionInput(occasionInputSchema.parse(req.body));
    if (input.date < today) {
      throw new HttpError(400, "Date cannot be in the past");
    }
    Object.assign(doc, input);
    await doc.save();
    res.json(toOccasionDto(doc));
  } catch (err) {
    next(err);
  }
});

occasionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const doc = await findOccasion(req.params.id);
    await doc.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

async function findOccasion(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Occasion not found");
  }
  const doc = await OccasionModel.findById(id);
  if (!doc) {
    throw new HttpError(404, "Occasion not found");
  }
  return doc;
}
