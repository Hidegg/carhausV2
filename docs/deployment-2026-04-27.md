# Deployment 2026-04-27 — Security Hardening & Backup System

## Security fixes

| ID | What | File(s) |
|----|------|---------|
| C1 | Removed password-repair branch from `initialize.py` — re-running the script no longer silently resets passwords | `initialize.py` |
| C2 | Rotated `SECRET_KEY` on VPS to a random 64-char hex value | `.env` (VPS only) |
| C3 | `run.py` `debug=False`; confirmed `FLASK_DEBUG=false` on VPS | `run.py` |
| C4 | `get_client` in manager routes now scopes client + servicii queries by `locatie_id` — managers can no longer look up plates from other locations | `backend/blueprints/manager/routes.py` |
| H1 | Added `ProxyFix(x_for=1, x_proto=1)` — rate limiter now sees real client IPs behind Nginx | `backend/__init__.py` |
| H1 | Added `X-Forwarded-For` + `X-Forwarded-Proto` to Nginx proxy headers | `/etc/nginx/sites-available/carhaus` |
| H2 | 8-character minimum password enforced on all account create/edit endpoints | `backend/blueprints/admin/routes.py`, `backend/blueprints/dev/routes.py` |
| H3 | HSTS (`max-age=31536000`) and CSP headers added in Nginx | `/etc/nginx/sites-available/carhaus` |

### CSP allowlist
- `img-src`: `self`, `data:`, `https://raw.githubusercontent.com` (car logos)
- `style-src`: `self`, `unsafe-inline`, `https://fonts.googleapis.com`
- `font-src`: `self`, `https://fonts.gstatic.com`
- `script-src`: `self` + inline script hash for Vite build
- `connect-src`: `self`

## Backup system

- Removed in-process APScheduler (was multiplying with Gunicorn workers)
- `scripts/backup.sh` — DB-agnostic: `pg_dump` for Postgres, `sqlite3 .backup` for SQLite; zstd compressed; integrity check; rclone upload to Backblaze B2; Healthchecks.io ping
- `systemd/carhaus-backup.service` + `carhaus-backup.timer` — daily at 03:00 Bucharest, persistent catch-up if server was off
- B2 bucket: `carhaus-vps` (write-only app key)
- Healthchecks.io: `https://hc-ping.com/4356e596-de54-40d5-9580-2794dd8e7ba4`

## DB fix

- `activ` column was missing from `spalatori` table in prod — added via `ALTER TABLE` and committed to `models.py` + `deploy.py` guard

## Pending

- [ ] Change `admin` password via Admin UI
- [ ] Change `admin2` password via Admin UI
- [ ] Quarterly: restore rehearsal from B2 backup
