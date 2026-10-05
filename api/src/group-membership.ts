import mongoose from "mongoose";
import { GroupLogModel } from "./models/group-log.ts";
import { GroupModel } from "./models/group.ts";

export async function detachPersonFromGroups(personId: string): Promise<void> {
  if (!mongoose.isValidObjectId(personId)) return;
  const oid = new mongoose.Types.ObjectId(personId);
  await GroupModel.updateMany({ memberIds: oid }, { $pull: { memberIds: oid } });
  await GroupLogModel.updateMany({ audienceIds: oid }, { $pull: { audienceIds: oid } });
}
