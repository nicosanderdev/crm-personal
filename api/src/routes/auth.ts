import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { allowedEmail } from "../env.ts";
import { User } from "../models/user.ts";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

async function authenticate(emailRaw: string, password: string) {
  const email = emailRaw.toLowerCase();
  if (allowedEmail && email !== allowedEmail) {
    return null;
  }
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }
  return user;
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await authenticate(body.email, body.password);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    req.session.userId = String(user._id);
    res.json({ email: user.email });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/token", loginLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await authenticate(body.email, body.password);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    req.session.userId = String(user._id);
    await saveSession(req);
    res.json({ email: user.email, token: req.sessionID });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie("crm.sid");
    res.status(204).end();
  });
});

authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await User.findById(req.session.userId);
  if (!user) {
    req.session.destroy(() => undefined);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ email: user.email });
});
