# Circle — personal CRM

Private web app for one person: a circle of people, a log of conversations, and a queue of who is due a reach-out.

The domain language lives in [CONTEXT.md](./CONTEXT.md).

## Stack

- `web/` — Vite, React, TypeScript, Tailwind. Deployed on Vercel.
- `mobile/` — Expo (Android), React Native, NativeWind. Expo Go while developing; EAS preview APK when you want an icon.
- `api/` — Express, Mongoose, TypeScript. Deployed on Render.
- MongoDB Atlas (or local Mongo via Docker).
- Cloudflare R2 for photos (private bucket, signed URLs).

The browser only talks to the Vercel origin. `/api/*` is rewritten to Render so session cookies stay first-party.

The Android app talks to Render directly with `Authorization: Bearer` (same Mongo sessions as the web cookie).

## Local development

1. Install Node 20+.
2. Copy env and start Mongo:

```bash
cp api/.env.example api/.env
# set MONGODB_URI, SESSION_SECRET (≥16 chars), ALLOWED_EMAIL
docker compose up -d
npm install
npm run create-user -- you@example.com 'a-long-password'
npm run dev
```

App: http://localhost:5173  
API: http://localhost:3001/api/health

### Android app

The phone uses production Render by default (`https://crm-personal-api.onrender.com`). Copy `mobile/.env.example` to `mobile/.env` if you want a local API (emulator: `http://10.0.2.2:3001`).

```bash
npm run dev:mobile
```

Scan the QR code with Expo Go on Android. For a standalone APK: `cd mobile && npx eas build --profile preview --platform android`.

Photos need R2 credentials in `api/.env`. Leave them empty until you add a bucket; everything else still runs.

## Create the one user

There is no register route.

```bash
npm run create-user -- you@example.com 'at-least-12-chars'
```

This bcrypt-hashes the password and upserts the user in Mongo. Set `ALLOWED_EMAIL` to that same address so a second user document cannot log in.

## Deploy

### MongoDB Atlas

Create a cluster, a database user, and a network rule that allows Render. Copy the connection string into `MONGODB_URI`.

### Cloudflare R2

1. Create a bucket (`crm-personal-photos`).
2. Create an API token with Object Read & Write.
3. **Disable public access.** The API mints short-lived signed URLs.
4. CORS on the bucket must allow `PUT` from your Vercel origin and `localhost:5173` (the browser uploads directly).

```json
[
  {
    "AllowedOrigins": ["https://YOUR-APP.vercel.app", "http://localhost:5173"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

`R2_ENDPOINT` is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

### Render (API)

Use [render.yaml](./render.yaml) or create a Node web service from this repo:

- Build: `npm install`
- Start: `npm run start`
- Health: `/api/health`

Set:

- `NODE_ENV=production`
- `MONGODB_URI`
- `SESSION_SECRET` (long random string)
- `ALLOWED_EMAIL`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`

Render injects `PORT`. Do not override it.

Name the service `crm-personal-api` so it matches [vercel.json](./vercel.json), or edit the rewrite destination to your Render URL.

### Vercel (web)

Import the repo. Root directory stays the repo root (`vercel.json` builds `web/`).

Enable **Deployment Protection** so preview URLs are not a second copy of the CRM.

After Render is live, confirm `vercel.json` rewrites `/api/:path*` to that URL.

### First login

Run `create-user` against Atlas (same `MONGODB_URI` as Render), then sign in on the Vercel URL.

## CSV import

Download the template from Import. Columns: `name` (required), `organization`, `role`, `howWeMet`, `tags` (pipe-separated), `tier` (1–4), `birthday` (`YYYY-MM-DD`), `city`, `timezone`, `preferredChannel`, `phone`, `email`, `socialLinks` (`type:value;type:value`), `nextTalkingPoint`. Duplicate names are imported as separate people.
