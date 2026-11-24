import { Router } from "express";
import mongoose from "mongoose";
import { HttpError } from "../middleware.ts";
import { TaskModel } from "../models/task.ts";
import {
  subjectIds,
  taskCreateSchema,
  taskStatusSchema,
  taskUpdateSchema,
  toTaskCreateInput,
  toTaskDtos,
  toTaskInput,
} from "../task-serialize.ts";

export const tasksRouter = Router();

tasksRouter.get("/", async (req, res, next) => {
  try {
    const scope = readScope(req.query.personId, req.query.groupId);
    const filter = scope.personId
      ? { personId: scope.personId }
      : scope.groupId
        ? { groupId: scope.groupId }
        : {};
    const docs = await TaskModel.find(filter);
    res.json(await toTaskDtos(docs));
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/", async (req, res, next) => {
  try {
    const input = toTaskCreateInput(taskCreateSchema.parse(req.body));
    const links = await subjectIds(input.subject);
    const doc = await TaskModel.create({
      name: input.name,
      description: input.description,
      dueDate: input.dueDate,
      status: "pending",
      statusChangedAt: new Date(),
      personId: links.personId,
      groupId: links.groupId,
    });
    const [dto] = await toTaskDtos([doc]);
    res.status(201).json(dto);
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id", async (req, res, next) => {
  try {
    const doc = await findTask(req.params.id);
    const [dto] = await toTaskDtos([doc]);
    res.json(dto);
  } catch (err) {
    next(err);
  }
});

tasksRouter.put("/:id", async (req, res, next) => {
  try {
    const doc = await findTask(req.params.id);
    const input = toTaskInput(taskUpdateSchema.parse(req.body));
    const links = await subjectIds(input.subject);
    doc.name = input.name;
    doc.description = input.description;
    doc.dueDate = input.dueDate;
    doc.personId = links.personId ? new mongoose.Types.ObjectId(links.personId) : null;
    doc.groupId = links.groupId ? new mongoose.Types.ObjectId(links.groupId) : null;
    if (doc.status !== input.status) {
      doc.status = input.status;
      doc.statusChangedAt = new Date();
    }
    await doc.save();
    const [dto] = await toTaskDtos([doc]);
    res.json(dto);
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/:id/status", async (req, res, next) => {
  try {
    const doc = await findTask(req.params.id);
    const { status } = taskStatusSchema.parse(req.body);
    if (doc.status !== status) {
      doc.status = status;
      doc.statusChangedAt = new Date();
      await doc.save();
    }
    const [dto] = await toTaskDtos([doc]);
    res.json(dto);
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete("/:id", async (req, res, next) => {
  try {
    const doc = await findTask(req.params.id);
    await doc.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function readScope(personId: unknown, groupId: unknown): { personId?: string; groupId?: string } {
  const person = typeof personId === "string" ? personId.trim() : "";
  const group = typeof groupId === "string" ? groupId.trim() : "";
  if (person && group) throw new HttpError(400, "Filter by a person or a group");
  if (person && !mongoose.isValidObjectId(person)) throw new HttpError(400, "Invalid person");
  if (group && !mongoose.isValidObjectId(group)) throw new HttpError(400, "Invalid group");
  return {
    personId: person || undefined,
    groupId: group || undefined,
  };
}

async function findTask(id: string | undefined) {
  if (!id || !mongoose.isValidObjectId(id)) throw new HttpError(404, "Task not found");
  const doc = await TaskModel.findById(id);
  if (!doc) throw new HttpError(404, "Task not found");
  return doc;
}
