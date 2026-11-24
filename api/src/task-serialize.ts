import type { Task, TaskCreateInput, TaskInput, TaskSubject } from "@crm/shared";
import { TASK_STATUSES, YMD } from "@crm/shared";
import type { HydratedDocument } from "mongoose";
import mongoose from "mongoose";
import { z } from "zod";
import { HttpError } from "./middleware.ts";
import { GroupModel } from "./models/group.ts";
import { PersonModel } from "./models/person.ts";
import type { TaskDoc } from "./models/task.ts";

const subjectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("loose") }),
  z.object({ kind: z.literal("person"), id: z.string().trim().min(1) }),
  z.object({ kind: z.literal("group"), id: z.string().trim().min(1) }),
]);

const taskFields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).default(""),
  dueDate: z
    .union([z.string().regex(YMD), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  subject: subjectSchema,
};

export const taskCreateSchema = z.object(taskFields);

export const taskUpdateSchema = z.object({
  ...taskFields,
  status: z.enum(TASK_STATUSES),
});

export const taskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export function toTaskCreateInput(data: z.infer<typeof taskCreateSchema>): TaskCreateInput {
  return {
    name: data.name,
    description: data.description,
    dueDate: data.dueDate,
    subject: data.subject,
  };
}

export function toTaskInput(data: z.infer<typeof taskUpdateSchema>): TaskInput {
  return {
    ...toTaskCreateInput(data),
    status: data.status,
  };
}

export async function subjectIds(
  subject: TaskCreateInput["subject"],
): Promise<{ personId: string | null; groupId: string | null }> {
  if (subject.kind === "loose") return { personId: null, groupId: null };
  if (!mongoose.isValidObjectId(subject.id)) {
    throw new HttpError(400, subject.kind === "person" ? "Choose a person." : "Choose a group.");
  }
  if (subject.kind === "person") {
    const exists = await PersonModel.exists({ _id: subject.id });
    if (!exists) throw new HttpError(400, "Choose a person.");
    return { personId: subject.id, groupId: null };
  }
  const exists = await GroupModel.exists({ _id: subject.id });
  if (!exists) throw new HttpError(400, "Choose a group.");
  return { personId: null, groupId: subject.id };
}

export async function toTaskDtos(docs: HydratedDocument<TaskDoc>[]): Promise<Task[]> {
  const personIds = [
    ...new Set(docs.flatMap((doc) => (doc.personId ? [String(doc.personId)] : []))),
  ];
  const groupIds = [...new Set(docs.flatMap((doc) => (doc.groupId ? [String(doc.groupId)] : [])))];
  const [people, groups] = await Promise.all([
    personIds.length ? PersonModel.find({ _id: { $in: personIds } }).select("name") : [],
    groupIds.length ? GroupModel.find({ _id: { $in: groupIds } }).select("name") : [],
  ]);
  const personNames = new Map(people.map((person) => [String(person._id), person.name]));
  const groupNames = new Map(groups.map((group) => [String(group._id), group.name]));
  return docs.map((doc) => toTaskDto(doc, personNames, groupNames));
}

function toTaskDto(
  doc: HydratedDocument<TaskDoc>,
  personNames: Map<string, string>,
  groupNames: Map<string, string>,
): Task {
  const createdAt = doc.get("createdAt") as Date;
  const updatedAt = doc.get("updatedAt") as Date;
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description ?? "",
    status: doc.status,
    dueDate: doc.dueDate ?? null,
    subject: subjectOf(doc, personNames, groupNames),
    createdAt: createdAt.toISOString(),
    statusChangedAt: doc.statusChangedAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function subjectOf(
  doc: HydratedDocument<TaskDoc>,
  personNames: Map<string, string>,
  groupNames: Map<string, string>,
): TaskSubject {
  if (doc.personId) {
    const id = String(doc.personId);
    return { kind: "person", id, name: personNames.get(id) ?? "" };
  }
  if (doc.groupId) {
    const id = String(doc.groupId);
    return { kind: "group", id, name: groupNames.get(id) ?? "" };
  }
  return { kind: "loose" };
}
