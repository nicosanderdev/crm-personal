import bcrypt from "bcryptjs";
import { allowedEmail } from "../env.ts";
import { connectDb, disconnectDb } from "../db.ts";
import { User } from "../models/user.ts";

const email = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: npm run create-user -- you@example.com 'your-password'");
  process.exit(1);
}

if (!email.includes("@")) {
  console.error("Email looks invalid.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

await connectDb();
const passwordHash = await bcrypt.hash(password, 12);
await User.findOneAndUpdate(
  { email },
  { email, passwordHash },
  { upsert: true, new: true },
);
console.log(`User written: ${email}`);
if (allowedEmail && allowedEmail !== email) {
  console.warn(
    `ALLOWED_EMAIL is ${allowedEmail}, so this account cannot log in. Set ALLOWED_EMAIL=${email} in api/.env and restart the API.`,
  );
}
await disconnectDb();
