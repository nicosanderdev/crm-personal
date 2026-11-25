import type { NextFunction, Request, Response } from "express";
import { isProd } from "./env.ts";

const LOCAL_BROWSER = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

/** Let the Expo web dev server call this API from another localhost port. Native clients do not send Origin. */
export function allowLocalBrowser(req: Request, res: Response, next: NextFunction): void {
  if (isProd) {
    next();
    return;
  }
  const origin = req.header("origin");
  if (!origin || !LOCAL_BROWSER.test(origin)) {
    next();
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}
