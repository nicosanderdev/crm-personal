import mongoose from "mongoose";
import type { Channel, SocialLink, Tier } from "@crm/shared";

export type PersonDoc = {
  name: string;
  organization: string;
  role: string;
  howWeMet: string;
  tags: string[];
  tier: Tier;
  birthday: string | null;
  city: string;
  timezone: string;
  preferredChannel: Channel | null;
  phone: string;
  email: string;
  socialLinks: SocialLink[];
  photoKey: string | null;
  nextTalkingPoint: string;
  lastInteractionAt: Date | null;
  lastInteractionPreview: string | null;
  lastInteractionChannel: Channel | null;
  snoozedUntil: Date | null;
  pausedAt: Date | null;
};

const socialLinkSchema = new mongoose.Schema(
  {
    type: { type: String },
    value: { type: String },
  },
  { _id: false },
);

const personSchema = new mongoose.Schema<PersonDoc>(
  {
    name: { type: String, required: true, trim: true },
    organization: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    howWeMet: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    tier: { type: Number, required: true, enum: [1, 2, 3, 4], default: 3 },
    birthday: { type: String, default: null },
    city: { type: String, default: "", trim: true },
    timezone: { type: String, default: "", trim: true },
    preferredChannel: { type: String, default: null },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    socialLinks: { type: [socialLinkSchema], default: [] },
    photoKey: { type: String, default: null },
    nextTalkingPoint: { type: String, default: "" },
    lastInteractionAt: { type: Date, default: null },
    lastInteractionPreview: { type: String, default: null },
    lastInteractionChannel: { type: String, default: null },
    snoozedUntil: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

personSchema.index({ name: 1 });
personSchema.index({ pausedAt: 1, snoozedUntil: 1, lastInteractionAt: 1 });
personSchema.index({ tags: 1 });

export const PersonModel = mongoose.model<PersonDoc>("Person", personSchema);
