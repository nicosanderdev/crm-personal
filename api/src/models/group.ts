import mongoose from "mongoose";

export type GroupDoc = {
  name: string;
  memberIds: mongoose.Types.ObjectId[];
};

const groupSchema = new mongoose.Schema<GroupDoc>(
  {
    name: { type: String, required: true, trim: true },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
  },
  { timestamps: true },
);

groupSchema.index({ memberIds: 1 });

export const GroupModel = mongoose.model<GroupDoc>("Group", groupSchema);
