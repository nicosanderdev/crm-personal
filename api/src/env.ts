import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(apiRoot, ".env") });

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  ALLOWED_EMAIL: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  PORT: Number(parsed.PORT ?? 3001),
  NODE_ENV: parsed.NODE_ENV ?? "development",
  MONGODB_URI: parsed.MONGODB_URI,
  SESSION_SECRET: parsed.SESSION_SECRET,
  ALLOWED_EMAIL: parsed.ALLOWED_EMAIL?.trim() ?? "",
  R2_ACCOUNT_ID: parsed.R2_ACCOUNT_ID ?? "",
  R2_ACCESS_KEY_ID: parsed.R2_ACCESS_KEY_ID ?? "",
  R2_SECRET_ACCESS_KEY: parsed.R2_SECRET_ACCESS_KEY ?? "",
  R2_BUCKET: parsed.R2_BUCKET ?? "",
  R2_ENDPOINT: parsed.R2_ENDPOINT ?? "",
};

export const isProd = env.NODE_ENV === "production";
export const allowedEmail = env.ALLOWED_EMAIL
  ? env.ALLOWED_EMAIL.toLowerCase()
  : null;

export function r2Configured(): boolean {
  return Boolean(
    env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET &&
      env.R2_ENDPOINT,
  );
}
