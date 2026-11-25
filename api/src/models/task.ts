import mongoose from "mongoose";
import type { TaskStatus } from "@crm/shared";

export type TaskDoc = {
  name: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
  personId: mongoose.Types.ObjectId | null;
  groupId: mongoose.Types.ObjectId | null;
  statusChangedAt: Date;
};

const taskSchema = new mongoose.Schema<TaskDoc>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, required: true, enum: ["pending", "completed", "cancelled"] },
    dueDate: { type: String, default: null },
    personId: { type: mongoose.Schema.Types.ObjectId, ref: "Person", default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    statusChangedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

taskSchema.index({ personId: 1 });
taskSchema.index({ groupId: 1 });

export const TaskModel = mongoose.model<TaskDoc>("Task", taskSchema);
