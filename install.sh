#!/bin/sh
# One-command installer for dataq on a fresh Linux VPS (root).
#
#   curl -fsSL https://raw.githubusercontent.com/natanidigital/dataq/main/install.sh | sudo bash
#
# With a domain that already points at this server's IP, for automatic
# HTTPS via Caddy:
#
#   curl -fsSL https://raw.githubusercontent.com/natanidigital/dataq/main/install.sh | sudo bash -s -- yourdomain.com
#
# Re-running this script (e.g. to update) is safe: it pulls the latest
# code and re-runs `docker compose up -d --build` without touching your
# existing .env or data volumes.
set -e

REPO_URL="https://github.com/natanidigital/dataq.git"
INSTALL_DIR="${INSTALL_DIR:-/opt/dataq}"
DOMAIN="$1"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (e.g. with sudo)." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker is installed but the 'docker compose' plugin is missing." >&2
  echo "See https://docs.docker.com/compose/install/ and re-run this script." >&2
  exit 1
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "==> Updating existing install at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "==> Cloning dataq into $INSTALL_DIR..."
  command -v git >/dev/null 2>&1 || (apt-get update -qq && apt-get install -y -qq git)
  git clone "$REPO_URL" "$INSTALL_DIR"
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
