import mongoose from "mongoose";

export type UserDoc = {
  email: string;
  passwordHash: string;
};

const userSchema = new mongoose.Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

export const User = mongoose.model<UserDoc>("User", userSchema);
