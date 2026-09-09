#!/bin/sh
# Runs on every container start: applying pending migrations is safe to
# repeat (Prisma tracks what's already applied), and the seed script is
# itself idempotent (it skips if an admin already exists) — so this never
# needs a separate one-time setup step. `set -e` deliberately excludes the
# seed line: a seed failure (e.g. a transient DB hiccup) shouldn't prevent
# the app from starting.
set -e

echo "dataq: applying database migrations..."
npx prisma migrate deploy

echo "dataq: checking for an admin account..."
npx tsx prisma/seed.ts || echo "dataq: seed step failed — continuing anyway, retry with 'docker compose exec app npx tsx prisma/seed.ts' if needed."

echo "dataq: starting..."
exec "$@"
