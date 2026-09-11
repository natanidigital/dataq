# Running dataq on shared hosting (cPanel "Setup Node.js App")

Docker on a VPS is the supported path. Shared hosting **can** work through
cPanel's *Setup Node.js App* (Phusion Passenger), but it's fiddly and has
one hard requirement most shared plans don't meet out of the box — read the
reality check first.

---

## Reality check — will your host work?

| Requirement | Notes |
| --- | --- |
| **PostgreSQL 14+** | dataq does **not** run on MySQL. Most cPanel plans only offer MySQL/MariaDB. Check cPanel → *PostgreSQL Databases*. If it's not there, use a free external managed Postgres — [Neon](https://neon.tech), Supabase, or Railway — and point `DATABASE_URL` at it over the internet. |
| **Node.js 20 or newer** | Next.js 16 will not start on Node 18 or older. Check the versions offered in *Setup Node.js App*. |
| **SSH access** | Strongly recommended. Without it you can't run `next build` or `prisma migrate deploy` on the server — you'd have to build elsewhere and run migrations from your own machine against the external database. Ask your host to enable SSH (most will). |
| **~1 GB disk free** | `node_modules` + `.next` is roughly 500 MB – 1 GB. |
| **Outbound port 5432** | Needed if your database is external (Neon etc.). A few shared hosts block outbound connections — Neon's pooled endpoint helps, otherwise you're stuck. |

If any of the first two can't be satisfied, use a small VPS instead — see the
main [README](../README.md).

---

## 1. Database

**Host has PostgreSQL:** cPanel → *PostgreSQL Databases* → create a database
and a user, add the user to the database with all privileges. Your
`DATABASE_URL` is:

```
postgresql://DBUSER:DBPASS@127.0.0.1:5432/DBNAME
```

**Host is MySQL-only:** create a free project at neon.tech, create a
database, and copy its connection string. It looks like:

```
postgresql://USER:PASS@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

---

## 2. Create the Node.js app in cPanel

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Value |
| --- | --- |
| Node.js version | 20 or newer (22 if offered) |
| Application mode | Production |
| Application root | `dataq` (becomes `/home/USER/dataq`) |
| Application URL | your domain or subdomain |
| Application startup file | `server.js` |

Create it, then **leave it stopped** for now. cPanel shows a command near
the top like `source /home/USER/nodevenv/dataq/22/bin/activate && cd
/home/USER/dataq` — that's how you enter this app's Node environment over
SSH. Keep it handy.

---

## 3. Upload the code

Into the application root (`/home/USER/dataq`), **without** `node_modules`,
`.next`, `.env`, or `storage/`:

- **With SSH + git:** the repo is private, so `git clone` needs a
  [fine-grained Personal Access Token](https://github.com/settings/tokens?type=beta)
  scoped to just this repo with Contents: Read-only:
  `cd ~/dataq && git clone https://<GITHUB_TOKEN>@github.com/natanidigital/dataq.git .`
- **Without SSH:** download the repo ZIP from GitHub (you'll need to be
  logged in with access to the repo, or generate the ZIP via the API with
  the same token), upload via File Manager, extract into the app root.

---

## 4. Add `server.js`

Passenger loads a startup file rather than running `npm start`. Create
`server.js` in the application root:

```js
const { createServer } = require("http");
const next = require("next");

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000);
});
```

Passenger assigns the port through `PORT` automatically — don't hard-code one.

---

## 5. Environment variables

Use the **Environment variables** section of the Setup Node.js App page (or a
`.env` file in the app root — dataq reads both). Minimum:

```
DATABASE_URL   = postgresql://...            (from step 1)
AUTH_SECRET    = <openssl rand -base64 33>
NEXTAUTH_URL   = https://your-domain.com
AUTH_TRUST_HOST = true
TOTAL_BANDWIDTH_GB = 100
```

**Recommended on shared hosting:** offload image storage to Cloudflare R2 so
uploads don't eat your disk quota — add the `STORAGE_DRIVER=s3` + `S3_*`
block from the [README](../README.md#where-images-are-stored).

---

## 6. Install, migrate, build, seed

**With SSH** (enter the env with the `source ... activate` command from step 2):

```bash
npm install                 # postinstall runs `prisma generate`
npx prisma migrate deploy    # create the schema — one time
npm run build                # produce .next
npx tsx prisma/seed.ts       # create the first admin — prints the password ONCE
```

`npm install` and `npm run build` also have buttons in the Setup Node.js App
UI ("Run NPM Install" / "Run NPM script" → `build`) if you'd rather click.

**Without SSH:** run `npx prisma migrate deploy` and `npx tsx prisma/seed.ts`
**from your own computer** with `DATABASE_URL` set to the same external
database, then either use the UI's "Run NPM Install" + "Run NPM script build"
buttons, or build locally on a Linux machine and upload the resulting
`.next/` folder (do **not** upload `node_modules` from a different OS — let
the server's own `npm install` fetch the right `sharp` binary).

If `npm run build` is killed with exit code 137, the container ran out of
memory — build on another machine and upload `.next/`, or move to a VPS.

---

## 7. Start

Setup Node.js App → **Restart**. Visit `NEXTAUTH_URL` and log in with the
admin credentials from the seed step.

---

## Updating later

```bash
git pull                     # or re-upload changed files
npm install
npx prisma migrate deploy
npm run build
```

Then **Restart** the app in cPanel.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| **502, "Passenger could not spawn"** | Check `~/dataq/stderr.log` (or the log path cPanel shows). Usually a missing env var or `server.js` throwing. |
| **`PrismaClientInitializationError` / can't reach database** | `DATABASE_URL` wrong, missing `?sslmode=require` for Neon, or the host blocks outbound 5432 — try Neon's pooled host. |
| **`sharp` fails on start** | `npm install` was run on the wrong OS. SSH in and run `npm rebuild sharp` (or re-run `npm install` on the server). |
| **Build killed / exit 137** | Out of memory. Build elsewhere and upload `.next/`, or upgrade the plan. |
| **Settings changes don't show** | dataq pages are already dynamic; if content looks stale, Restart the app once. |
| **Only Node 18 offered** | Next.js 16 needs Node 20+. This host can't run dataq — use a VPS. |
