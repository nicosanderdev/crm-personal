import mongoose from "mongoose";

export type OccasionDoc = {
  title: string;
  date: string;
  tags: string[];
};

const occasionSchema = new mongoose.Schema<OccasionDoc>(
  {
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

occasionSchema.index({ date: 1 });

export const OccasionModel = mongoose.model<OccasionDoc>("Occasion", occasionSchema);
