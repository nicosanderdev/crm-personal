import { normalizeTags } from "@crm/shared";
import { PersonModel } from "./models/person.ts";

export async function normalizeStoredPersonTags(): Promise<void> {
  const docs = await PersonModel.find({ tags: { $exists: true, $not: { $size: 0 } } });
  for (const doc of docs) {
    const next = normalizeTags(doc.tags ?? []);
    if (sameTags(doc.tags ?? [], next)) continue;
    doc.tags = next;
    await doc.save();
  }
}

function sameTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((tag, i) => tag === b[i]);
}
