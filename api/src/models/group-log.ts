import mongoose from "mongoose";
import type { Channel } from "@crm/shared";

export type GroupLogDoc = {
  groupId: mongoose.Types.ObjectId | null;
  groupName: string;
  date: Date;
  channel: Channel;
  notes: string;
  countsAsContact: boolean;
  audienceIds: mongoose.Types.ObjectId[];
};

const groupLogSchema = new mongoose.Schema<GroupLogDoc>(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    groupName: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    channel: { type: String, required: true },
    notes: { type: String, default: "" },
    countsAsContact: { type: Boolean, required: true },
    audienceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
  },
  { timestamps: true },
);

groupLogSchema.index({ groupId: 1, date: -1 });
groupLogSchema.index({ audienceIds: 1 });

export const GroupLogModel = mongoose.model<GroupLogDoc>("GroupLog", groupLogSchema);
