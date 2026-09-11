# dataq

Self-hosted, private image hosting — invite-only, direct links, public/private
toggle, admin-managed users with Free/Paid membership tiers, and white-label
branding (logo, PWA icon, SEO). Built with Next.js, Prisma, and PostgreSQL.

## Quick install (fresh VPS, root)

This repo is **private**, so you need a GitHub Personal Access Token to
fetch the code — a [fine-grained token](https://github.com/settings/tokens?type=beta)
scoped to just this repository with **Contents: Read-only** is enough (avoid
a classic token with the broad `repo` scope). Then, on a clean Ubuntu/Debian
server:

```bash
export GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.raw+json" \
  https://api.github.com/repos/natanidigital/dataq/contents/install.sh \
  | sudo GITHUB_TOKEN="$GITHUB_TOKEN" bash
```

Fetch through `api.github.com`, not `raw.githubusercontent.com` — the latter
is known to 404 fine-grained tokens even when they're valid, and separately
caches responses for several minutes.

This installs Docker if it's missing, clones the repo to `/opt/dataq`,
generates a `.env` with fresh secrets, and starts the app + database with
`docker compose`. When it finishes it prints the app's URL and the seeded
admin username/password (shown once — save them). The token is only used to
fetch the code — it's never written to disk, and you'll need to supply it
again on every future run, including updates.

**With a domain already pointed at the server**, for automatic HTTPS via
[Caddy](https://caddyserver.com/), add the domain after `bash`:

```bash
curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.raw+json" \
  https://api.github.com/repos/natanidigital/dataq/contents/install.sh \
  | sudo GITHUB_TOKEN="$GITHUB_TOKEN" bash -s -- yourdomain.com
```

**Already have your own reverse proxy** (CloudPanel, Nginx, etc.)? Run the
no-domain form above, then point your proxy at `127.0.0.1:3000` — the
`caddy` service is entirely optional (it only starts with `--profile
with-proxy`, which the installer only uses when you pass a domain).

Re-running the installer later pulls the latest code and rebuilds — it never
touches your `.env` or data once they exist, so it's also how you update.

## Manual Docker setup

Being a private repo, `git clone` needs a token too — either
`git clone https://<GITHUB_TOKEN>@github.com/natanidigital/dataq.git`, or
plain `git clone https://github.com/natanidigital/dataq.git` and enter the
token as the password when prompted (username can be anything).

```bash
git clone https://github.com/natanidigital/dataq.git
cd dataq
cp .env.docker.example .env
# edit .env: set POSTGRES_PASSWORD and AUTH_SECRET (openssl rand -base64 33)
docker compose up -d --build app db
```

## Local development (no Docker)

```bash
npm install
cp .env.example .env
# edit .env: DATABASE_URL pointing at a local/reachable PostgreSQL 16
npx prisma migrate deploy
npm run dev
```

`npm run db:seed` creates the first admin account if none exists yet
(username/password are printed to the console).

## Environment variables

| Variable              | Required | Notes                                                                 |
| ---------------------- | -------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`         | yes      | PostgreSQL connection string                                          |
| `AUTH_SECRET`          | yes      | Session signing secret — `openssl rand -base64 33`                    |
| `NEXTAUTH_URL`         | yes      | Public base URL, e.g. `https://yourdomain.com`                        |
| `AUTH_TRUST_HOST`      | yes      | `true` — trusts the reverse proxy's forwarded host/proto              |
| `TOTAL_BANDWIDTH_GB`   | no       | Monthly bandwidth shown on the admin usage chart (default 1000)       |
| `CLAMAV_HOST`          | no       | Enables real virus scanning for uploads — see **Upload safety** below |
| `STORAGE_DRIVER`       | no       | `local` (default) or `s3` — see **Where images are stored** below     |
| `S3_*`                 | if `s3`  | Endpoint / bucket / keys for the S3-compatible store                  |

Everything else — branding, SEO, registration, membership quotas, PayPal
credentials — is configured at runtime from the admin **Settings** page, not
environment variables, so it can change without a redeploy.

## Features

- Invite-only by default — an admin creates accounts from **Users**, with an
  optional **Settings → Access** toggle to open self-registration
- Direct links, public/private per image, one-click `<img>` HTML snippet
- Session-deduped view counting (one view per visitor per image, not per
  request) and a durable monthly bandwidth ledger that survives image deletion
- Free/Paid membership: Free is capped by configurable image count/storage,
  Paid is unlimited; PayPal subscriptions can bill this automatically once
  you connect your own PayPal app in Settings (or assign tiers manually)
- White-label: upload your own logo, PWA icon, and site name; per-site SEO
  title/description/social image — all live-editable, no rebuild needed
- Installable as a PWA (add to phone home screen)
- Pluggable storage: keep images on local disk, or offload them to a
  Cloudflare R2 / S3-compatible bucket — see **Where images are stored**
- Every upload is content-validated (real bytes, not the claimed type) with
  optional ClamAV virus scanning — see **Upload safety**

## Where images are stored

By default (`STORAGE_DRIVER=local`) uploaded bytes live on the app server's
own disk under `storage/uploads/` (the `dataq_storage` volume under Docker).

Set `STORAGE_DRIVER=s3` to offload them to any S3-compatible object store —
**Cloudflare R2**, Backblaze B2, Wasabi, AWS S3 — and fill in:

```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=          # optional — see below
```

Each image records which backend it was uploaded under, so you can switch
this on at any time — images already on local disk keep being served from
there, new uploads go to S3.

**With `S3_PUBLIC_BASE_URL` set** (a read-only CDN or custom domain bound to
the bucket, e.g. an R2 public bucket URL), public images are `302`-redirected
straight to the object store — their bytes never pass through the app server
at all, so it uses effectively no bandwidth for them. R2 in particular
charges nothing for egress. Private images are always proxied through the
app's access-controlled route regardless, and the redirect itself is sent
uncacheable so flipping an image back to private takes effect immediately.

**Without it**, every image (public or private) is streamed through the app
from S3 — the bytes are off the app's disk but still cross its network.

## Upload safety

Every upload is validated twice before it's accepted, regardless of what the
uploading client claims:

1. **Real content check, always on.** The file's actual bytes are decoded
   with `sharp` — the client's declared file type/extension is never
   trusted for what gets stored or served back. Anything that isn't a
   genuine, decodable JPG/PNG/GIF/WebP/AVIF is rejected outright, which
   stops an arbitrary script or executable from being smuggled in under a
   fake image extension. SVG is not an accepted format at all (SVGs can
   embed `<script>` tags), and image responses are served with
   `X-Content-Type-Options: nosniff`.
2. **Real virus scanning, optional.** Set `CLAMAV_HOST=clamav` in `.env` and
   start the stack with `docker compose --profile with-clamav up -d` to scan
   every upload against ClamAV's signature database before accepting it.
   This is opt-in because it adds a container using ~1-1.5GB RAM and a slow
   first boot while it downloads virus definitions — skip it on a small VPS
   if step 1 is enough for your use case.

## Deploying without Docker

**systemd on a VPS** — the app is a normal Next.js app underneath, so
`npm run build && npm run start` behind any reverse proxy works. See
`docker-entrypoint.sh` for the exact startup sequence (`prisma migrate
deploy`, then the idempotent `prisma/seed.ts`, then the server) to replicate
in a systemd unit.

**Shared hosting (cPanel "Setup Node.js App")** — possible but fiddly, and
it needs PostgreSQL (most shared plans are MySQL-only, so you'll likely
point `DATABASE_URL` at a free external Postgres like Neon). Step-by-step:
[docs/shared-hosting.md](docs/shared-hosting.md).
