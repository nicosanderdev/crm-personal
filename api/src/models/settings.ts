import mongoose from "mongoose";
import { DEFAULT_TIER_DAYS, type Tier } from "@crm/shared";

export type SettingsDoc = {
  key: string;
  tierDays: Record<string, number>;
};

const settingsSchema = new mongoose.Schema<SettingsDoc>({
  key: { type: String, required: true, unique: true },
  tierDays: { type: Map, of: Number, required: true },
});

export const SettingsModel = mongoose.model<SettingsDoc>("Settings", settingsSchema);

export async function getTierDays(): Promise<Record<Tier, number>> {
  let doc = await SettingsModel.findOne({ key: "default" });
  if (!doc) {
    doc = await SettingsModel.create({
      key: "default",
      tierDays: DEFAULT_TIER_DAYS,
    });
  }
  const map = doc.tierDays as unknown as Map<string, number> | Record<string, number>;
  const read = (tier: Tier): number => {
    if (map instanceof Map) {
      return map.get(String(tier)) ?? DEFAULT_TIER_DAYS[tier];
    }
    return map[String(tier)] ?? map[tier] ?? DEFAULT_TIER_DAYS[tier];
  };
  return {
    1: read(1),
    2: read(2),
    3: read(3),
    4: read(4),
  };
}
