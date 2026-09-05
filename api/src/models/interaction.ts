import mongoose from "mongoose";
import type { Channel } from "@crm/shared";

export type InteractionDoc = {
  personId: mongoose.Types.ObjectId;
  date: Date;
  channel: Channel;
  notes: string;
};

const interactionSchema = new mongoose.Schema<InteractionDoc>(
  {
    personId: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true, index: true },
    date: { type: Date, required: true },
    channel: { type: String, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

interactionSchema.index({ personId: 1, date: -1 });

export const InteractionModel = mongoose.model<InteractionDoc>(
  "Interaction",
  interactionSchema,
);
