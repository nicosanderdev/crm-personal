import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import { ZodError } from "zod";
import { connectDb } from "./db.ts";
import { env, isProd } from "./env.ts";
import { injectBearerSessionCookie } from "./bearer-session.ts";
import { errorHandler, requireAuth } from "./middleware.ts";
import { getTierDays } from "./models/settings.ts";
import { authRouter } from "./routes/auth.ts";
import { normalizeStoredPersonTags } from "./normalize-stored-tags.ts";
import { datesRouter } from "./routes/dates.ts";
import { importRouter } from "./routes/import.ts";
import { interactionsRouter } from "./routes/interactions.ts";
import { occasionsRouter } from "./routes/occasions.ts";
import { peopleRouter } from "./routes/people.ts";
import { queueRouter } from "./routes/queue.ts";

await connectDb();
await getTierDays();
await normalizeStoredPersonTags();

const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: ["text/csv", "text/plain"], limit: "2mb" }));
app.use(injectBearerSessionCookie);

app.use(
  session({
    name: "crm.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: env.MONGODB_URI }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/people", requireAuth, peopleRouter);
app.use("/api/people/:id/interactions", requireAuth, interactionsRouter);
app.use("/api/queue", requireAuth, queueRouter);
app.use("/api/import", requireAuth, importRouter);
app.use("/api/occasions", requireAuth, occasionsRouter);
app.use("/api/dates", requireAuth, datesRouter);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid input", details: err.issues });
    return;
  }
  errorHandler(err, req, res, next);
});

app.listen(env.PORT, () => {
  console.log(`API listening on ${env.PORT}`);
});
