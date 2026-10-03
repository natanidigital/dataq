# Running dataq behind Cloudflare with R2 (bare-metal / CloudPanel)

This is the setup `dataq.space` itself runs: a hotlink-heavy image host with
the bytes in Cloudflare R2, the app on a shared CloudPanel server, and
Cloudflare absorbing the traffic. Everything under [`deploy/`](../deploy) is
the *actual* config from that server — copy and adjust paths/user names.

```
visitor ──► Cloudflare (dataq.space) ──► nginx (CloudPanel) ──► dataq app :3200
   │             │  cache rule: /i/*  (302 cached ~10 min)
   │             └─ origin only accepts Cloudflare IPs
   └──────► 302 ──► Cloudflare (img.<your-zone>) ──► R2 bucket (public custom domain)
```

## 1. R2 bucket + custom domain

1. Create the bucket **in the same Cloudflare account as the zone you'll
   serve it from** — R2 custom domains only attach to zones in the bucket's
   own account. (`img.example.com` must be a zone in that account.)
2. Bucket → *Settings → Custom Domains → Add* → `img.example.com`, minimum
   TLS **1.2**. Don't pre-create a DNS record for it; Cloudflare does.
3. Bucket → *Public Development URL* → **Disable** (`*.r2.dev` is
   rate-limited and uncached, and is a second public path to every object).
4. *R2 → Manage API tokens → Create*: **Object Read & Write**, scoped to this
   bucket only. Use the Access Key ID / Secret Access Key it shows.

```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=<bucket>
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://img.example.com
```

With `S3_PUBLIC_BASE_URL` set, `/i/<slug>` answers `302` to the bucket domain
for public images. See the privacy caveat in the README: objects in a
publicly served bucket are readable by key, so don't rely on the Private
toggle for sensitive images.

> If you only have a user-level API token (`cfut_…`) rather than R2 S3
> credentials: Access Key ID = the token's `id` (`GET /user/tokens/verify`),
> Secret Access Key = SHA-256 hex of the token value. Prefer a bucket-scoped
> R2 token.

## 2. Cloudflare cache rule for `/i/*` (the app's own zone)

*Caching → Cache Rules → Create rule*

| Setting | Value |
| --- | --- |
| When | URI Path **starts with** `/i/` |
| Cache eligibility | **Eligible for cache** |
| Edge TTL | **Use cache-control header if present, bypass cache if not** |
| Browser TTL | Respect origin |
| Cache key → Query string | **Ignore** (stops `?x=random` cache-busting) |

Why these exact choices:

- The path has no file extension, so Cloudflare won't cache it without a rule.
- Don't use *Ignore cache-control / override TTL*: the app sends
  `CDN-Cache-Control: private, no-store` for private images, and overriding
  would cache them for anyone.
- The app does **not** set a `Set-Cookie` on public image responses.
  Cloudflare refuses to cache responses carrying one (`cf-cache-status:
  BYPASS`) — hotlinked embeds are cross-site, so a `SameSite=Lax` cookie never
  stuck for them anyway.
- Also enable *Caching → Tiered Cache → Smart*. Do **not** turn on "I'm Under
  Attack" site-wide: its JS challenge can't be solved by `<img>` embeds.

Check it:

```bash
for i in 1 2 3; do curl -sI https://dataq.space/i/<slug> | grep -iE 'cf-cache-status|location'; done
# MISS then HIT (302 -> https://img.example.com/<slug>.jpg)
```

**Consequence for statistics:** view counts and the bandwidth ledger only see
requests that reach the origin (edge cache misses). Real numbers live in
Cloudflare Analytics for the zone serving the bytes.

## 3. Prune the view-tracking table

`ImageView` has one row per (image, session) for the one-view-per-session
dedupe; with cookieless hotlinkers it grows fast. A daily timer keeps a
rolling 2-day window (aggregate `viewCount` and the monthly bandwidth ledger
are separate and untouched):

```bash
sudo cp deploy/systemd/dataq-prune-views.* /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now dataq-prune-views.timer
sudo systemctl start dataq-prune-views.service && journalctl -u dataq-prune-views -n 3 -o cat
```

Edit the interval in `deploy/prune-views.sql` (`interval '2 days'`).

## 4. Lock the origin to Cloudflare (nginx, per vhost)

Cloudflare protects the origin only if the origin refuses everyone else.
If other sites share the server and aren't proxied, **do not** restrict
ports 80/443 in the firewall — do it per vhost:

```bash
sudo install -m 755 deploy/sbin/dataq-update-cf-ips /usr/local/sbin/
sudo /usr/local/sbin/dataq-update-cf-ips          # writes sites-enabled/00-dataq-cloudflare-geo.conf
sudo cp deploy/systemd/dataq-update-cf-ips.* /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now dataq-update-cf-ips.timer   # monthly refresh
```

Then add the one line from `deploy/nginx/dataq-cloudflare-only.conf.example`
to the main `server {}` block of the vhost, `nginx -t`, reload.

- The geo map keys on `$realip_remote_addr` (the TCP peer), so it works
  whether or not nginx restores the visitor IP.
- `127.0.0.1` is allowed so local health checks keep working.
- The refresh script validates what it downloads and rolls back if
  `nginx -t` fails.
- CloudPanel regenerates vhosts from its own database; if you change the
  site in the CloudPanel UI, re-check that the `if` line survived (it fails
  *open*, not closed).
- An IP allow-list stops direct hits, but anyone can point their own
  Cloudflare zone at your IP. For a stricter lock use *Authenticated Origin
  Pulls* (mTLS).

## 5. systemd unit for the app

`deploy/systemd/dataq.service` runs `next start -p 3200` as the site user with
`EnvironmentFile=.env.production`, matching the CloudPanel layout
(`/home/<site-user>/htdocs/<domain>`). Rebuild with
`nice -n 10 npm run build` before `systemctl restart dataq`.
