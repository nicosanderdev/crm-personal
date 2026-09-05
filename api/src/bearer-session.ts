import type { NextFunction, Request, Response } from "express";
import signature from "cookie-signature";
import { env } from "./env.ts";

const COOKIE_NAME = "crm.sid";

/** Map `Authorization: Bearer <session id>` onto the session cookie express-session already reads. */
export function injectBearerSessionCookie(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.toLowerCase().startsWith("bearer ")) {
    next();
    return;
  }
  const sid = header.slice(7).trim();
  if (!sid) {
    next();
    return;
  }
  const signed = `s:${signature.sign(sid, env.SESSION_SECRET)}`;
  const pair = `${COOKIE_NAME}=${signed}`;
  const existing = req.headers.cookie;
  if (!existing) {
    req.headers.cookie = pair;
    next();
    return;
  }
  const without = existing
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${COOKIE_NAME}=`));
  without.push(pair);
  req.headers.cookie = without.join("; ");
  next();
}
