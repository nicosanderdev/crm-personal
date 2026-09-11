import bcrypt from "bcryptjs";
import { allowedEmail, env } from "./env.ts";
import { User } from "./models/user.ts";

export async function ensureFirstUser(): Promise<void> {
  const existing = await User.countDocuments();
  if (existing > 0) {
    console.log("User already exists; skipping bootstrap.");
    return;
  }

  const email = (env.BOOTSTRAP_EMAIL || allowedEmail || "").trim().toLowerCase();
  const password = env.BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.warn(
      "No users in the database. Set BOOTSTRAP_EMAIL (or ALLOWED_EMAIL) and BOOTSTRAP_PASSWORD on Render so the next start can create the login.",
    );
    return;
  }
  if (!email.includes("@")) {
    console.warn("BOOTSTRAP_EMAIL looks invalid; skipping.");
    return;
  }
  if (password.length < 8) {
    console.warn("BOOTSTRAP_PASSWORD must be at least 8 characters; skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ email, passwordHash });
  console.log(`First user created: ${email}`);
  if (allowedEmail && allowedEmail !== email) {
    console.warn(
      `ALLOWED_EMAIL is ${allowedEmail}, so this account cannot log in until it matches.`,
    );
  }
}
