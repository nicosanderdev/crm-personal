import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env, r2Configured } from "./env.ts";
import { HttpError } from "./middleware.ts";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function client(): S3Client {
  if (!r2Configured()) {
    throw new HttpError(501, "Photo storage is not configured");
  }
  return new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function presignUpload(
  personId: string,
  contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    throw new HttpError(400, "Unsupported image type");
  }
  const key = `people/${personId}/${randomUUID()}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client(), command, { expiresIn: 60 * 5 });
  return { uploadUrl, key };
}

export async function presignDownload(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(client(), command, { expiresIn: 60 * 60 });
}

export async function maybePhotoUrl(key: string | null | undefined): Promise<string | null> {
  if (!key || !r2Configured()) return null;
  try {
    return await presignDownload(key);
  } catch {
    return null;
  }
}
