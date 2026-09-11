#!/bin/sh
# One-command installer for dataq on a fresh Linux VPS (root).
#
# The dataq repo is PRIVATE, so this needs a GitHub Personal Access Token
# with read access to it — both to fetch this script itself and to clone
# the code. Create one at https://github.com/settings/tokens?type=beta,
# scoped to just the natanidigital/dataq repository with Contents: Read-only,
# then:
#
#   export GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#   curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" \
#     -H "Accept: application/vnd.github.raw+json" \
#     https://api.github.com/repos/natanidigital/dataq/contents/install.sh \
#     | sudo GITHUB_TOKEN="$GITHUB_TOKEN" bash
#
# Fetch this through api.github.com, NOT raw.githubusercontent.com — the
# latter is known to reject fine-grained tokens (github_pat_...) with a
# plain 404 even when the token is valid, and separately caches responses
# for several minutes so a just-pushed fix wouldn't show up right away.
#
# With a domain that already points at this server's IP, for automatic
# HTTPS via Caddy, add ` -s -- yourdomain.com` after `bash` above.
#
# Re-running this script (e.g. to update) is safe: it pulls the latest
# code and re-runs `docker compose up -d --build` without touching your
# existing .env or data volumes. GITHUB_TOKEN must be supplied every run —
# it's never written to disk.
set -e

REPO_SLUG="natanidigital/dataq"
REPO_URL="https://github.com/${REPO_SLUG}.git"
INSTALL_DIR="${INSTALL_DIR:-/opt/dataq}"
DOMAIN="$1"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (e.g. with sudo)." >&2
  exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "This repo is private — set GITHUB_TOKEN to a GitHub Personal Access" >&2
  echo "Token with read access to natanidigital/dataq first, e.g.:" >&2
  echo "  export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" >&2
  echo "See the comment at the top of this script for the full command." >&2
  exit 1
fi
AUTH_URL="https://${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git"

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker is installed but the 'docker compose' plugin is missing." >&2
  echo "See https://docs.docker.com/compose/install/ and re-run this script." >&2
  exit 1
fi

# The token is only ever used transiently for the clone/pull itself — the
# remote is reset to the bare (non-token) URL immediately after, so it
# doesn't sit in .git/config afterward. You'll need to supply GITHUB_TOKEN
# again on every future run (including updates).
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "==> Updating existing install at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" remote set-url origin "$AUTH_URL"
  git -C "$INSTALL_DIR" pull --ff-only
  git -C "$INSTALL_DIR" remote set-url origin "$REPO_URL"
else
  echo "==> Cloning dataq into $INSTALL_DIR..."
  command -v git >/dev/null 2>&1 || (apt-get update -qq && apt-get install -y -qq git)
  git clone "$AUTH_URL" "$INSTALL_DIR"
  git -C "$INSTALL_DIR" remote set-url origin "$REPO_URL"
fi
cd "$INSTALL_DIR"

if [ ! -f .env ]; then
  echo "==> Generating .env with fresh secrets..."
  cp .env.docker.example .env
  PG_PASS=$(openssl rand -hex 16)
  AUTH_SECRET=$(openssl rand -base64 33)
  sed -i "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=$PG_PASS#" .env
  sed -i "s#^AUTH_SECRET=.*#AUTH_SECRET=$AUTH_SECRET#" .env
  if [ -n "$DOMAIN" ]; then
    sed -i "s#^DOMAIN=.*#DOMAIN=$DOMAIN#" .env
    sed -i "s#^NEXTAUTH_URL=.*#NEXTAUTH_URL=https://$DOMAIN#" .env
  fi
else
  echo "==> Reusing existing .env (delete it first if you want fresh secrets)."
fi

if [ -n "$DOMAIN" ]; then
  echo "==> Starting dataq with automatic HTTPS for $DOMAIN..."
  docker compose --profile with-proxy up -d --build
else
  echo "==> Starting dataq on port 3000 (no reverse proxy)..."
  docker compose up -d --build app db
fi

echo ""
echo "==> Waiting for first-run setup to finish..."
sleep 10
docker compose logs app 2>&1 | grep -A2 "Seeded initial admin" || echo "(Admin already existed from a previous run — no new credentials to show.)"

echo ""
echo "==> Done."
if [ -n "$DOMAIN" ]; then
  echo "    Visit: https://$DOMAIN"
else
  SERVER_IP=$(curl -fsS ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
  echo "    Visit: http://$SERVER_IP:3000"
  echo "    (Put your own reverse proxy — e.g. CloudPanel, Nginx — in front of port 3000 for a real domain + HTTPS.)"
fi
echo "    Save the admin credentials printed above — they're only shown once."
