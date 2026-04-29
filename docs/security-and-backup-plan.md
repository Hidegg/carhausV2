# Security Audit & Backup Plan

Scope: small car-wash SaaS (~5 employees, 2 locations, low PII). Recommendations are calibrated to this — not a banking app. Every item states whether it's a **fix now**, **fix soon**, **nice-to-have**, or **out of scope**.

Audit performed: 2026-04-24. Against commit `5bacc0f`.

---

## Part 1 — Security findings

### CRITICAL — fix before letting users log in to prod

#### C1. Default admin credentials `admin` / `12345678` almost certainly exist in prod
- `initialize.py:11-14` seeds two admin accounts (`admin`, `admin2`) both with password `12345678`.
- `initialize.py:37-39` **silently resets** the password back to `12345678` on every run if it doesn't match the seed. Any password change gets reverted if the script is re-invoked.
- `railway.toml:4` ran it on every deploy; on the VPS it was likely run manually at least once during bootstrap.

**Remediation:**
1. Log in with `admin:12345678`, change both admin passwords via the Admin → Settings UI.
2. Patch `initialize.py` — remove the repair branch:
   ```python
   for username, rol, password in USERS:
       if not User.query.filter_by(username=username).first():
           u = User(username=username, rol=rol)
           u.set_password(password)
           db.session.add(u)
   db.session.commit()
   ```
3. Rotate the seed password away from `12345678`, or delete `initialize.py` entirely now that the system is bootstrapped.

#### C2. Weak / predictable `SECRET_KEY`
- `backend/config.py:8` falls back to the string `'dev-secret-key'` if the env var is missing.
- Local `.env` uses `carhaus-super-secret-2024` — guessable from app name + year.
- Anyone with the key can forge session cookies for any user, including `dev`.

**Remediation:** On the VPS, in the systemd `EnvironmentFile` (`/var/www/carhausV2/.env`):
```bash
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
```
Then `systemctl restart carhaus`. All existing sessions are invalidated — users re-login once.

#### C3. `FLASK_DEBUG=true` in the local `.env` must never reach prod
- The local `.env` has `FLASK_DEBUG=true`. If it's ever copied to the VPS:
  - `SESSION_COOKIE_SECURE` flips to `False` (`config.py:20`) → session cookie travels plaintext on HTTP hops.
  - If anyone runs `python run.py` directly, Werkzeug debugger is exposed. `run.py:6` hard-codes `debug=True`, which means **remote code execution** via `/console` if debug mode is ever active.
- Gunicorn ignores `run.py:6`, so today this is latent, not active.

**Remediation:** VPS `.env` must have `FLASK_DEBUG=false`. Also change `run.py:6` to `debug=False` to remove the footgun.

#### C4. Cross-location PII leak (GDPR-relevant)
- `backend/blueprints/manager/routes.py:465-494` — `GET /api/manager/client/<numar>` has **no `locatie_id` filter**.
- A manager in location A can type any plate from location B and receive that customer's name, email, phone, and full service history.
- `plates-search` (line 423) is correctly scoped; `get_client` is not.

**Remediation:** Add the same scope used elsewhere in the file:
```python
# routes.py:468
def get_client(numar):
    locatie_id = session.get('locatie_id')
    q = Clienti.query.filter_by(numarAutoturism=numar.upper())
    if locatie_id:
        q = q.filter(Clienti.locatie_id == locatie_id)
    client = q.first()
    ...
    # also scope the servicii_list query on line 471:
    servicii_q = Servicii.query.filter_by(clienti_id=client.id)
    if locatie_id:
        servicii_q = servicii_q.filter(Servicii.locatie_id == locatie_id)
    servicii_list = servicii_q.all()
```
Admin/dev (session `locatie_id = None`) keep full access.

---

### HIGH — fix soon

#### H1. Rate limiter only sees the Nginx IP
- `backend/extensions.py:12` uses `get_remote_address` (TCP peer). Behind Nginx that's always `127.0.0.1`.
- The `10/min` login limit is effectively global — one attacker locks out every real user, and per-IP intent is lost.

**Remediation:**
1. In `backend/__init__.py:8`, right after `app = Flask(__name__)`:
   ```python
   from werkzeug.middleware.proxy_fix import ProxyFix
   app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
   ```
2. In Nginx `location /api/` add:
   ```nginx
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

#### H2. No minimum password length
- `initialize.py`, `admin/routes.py:562`, `dev/routes.py:180` all accept any non-empty password. `"a"` is valid.

**Remediation:** Require 8+ chars in the three endpoints. Return 400 otherwise.

#### H3. Missing HSTS and CSP headers
- Current headers (`backend/__init__.py:50-54`): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Good baseline.
- Missing: HSTS (forces HTTPS) and CSP (limits XSS blast radius).

**Remediation (in Nginx, outside Flask):**
```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" always;
```
If Vite-built styles break, keep `'unsafe-inline'` for styles only.

---

### Explicitly OUT OF SCOPE for this app

Listed so they don't creep back in without a reason:

- **CSRF tokens (Flask-WTF)** — `SESSION_COOKIE_SAMESITE='Lax'` already blocks cross-site state changes. Real work for ~zero practical gain at this scale.
- **Per-username account lockout / 2FA** — 5 employees, trusted users. Overkill.
- **Detailed audit log** — `/api/dev/system` + DB backups cover forensic needs.
- **Constant-time username comparison / user-enumeration defenses** — usernames are `admin`, `admin2`, and employee first names. Not a secret.
- **Rotating SECRET_KEY on a schedule** — not meaningful until there's a credible leak.
- **Encrypted-at-rest backups, HSM-sealed secrets, etc.** — scope creep.

---

## Part 2 — Backup system

### Current state (as of 2026-04-24)

Code locations:
- `backup.py` — copies the SQLite file with `shutil.copy2`, keeps the last 8 `.db` files under `backups/`.
- `backend/__init__.py:39-46` — registers an APScheduler cron job: every Sunday 03:00, **only if the DB is SQLite**.
- `backend/blueprints/dev/routes.py:285-294` — `POST /api/dev/backup` lets a dev trigger a backup manually.
- `backend/blueprints/dev/routes.py:250-256` — `/api/dev/system` lists the 5 most recent backup filenames (read-only).

Observed problems:

| # | Problem | Impact |
|---|---------|--------|
| B1 | **Weekly, not daily.** Up to 7 days of data can be lost after a failure. | High data-loss risk. |
| B2 | **No backups at all if the DB is PostgreSQL.** The scheduler is gated on `db_url.startswith('sqlite')`. | Silent total failure if prod moved to Postgres. |
| B3 | `shutil.copy2` on a live SQLite file is unsafe under concurrent writes — can yield a corrupt copy. | Backup may be unusable. |
| B4 | APScheduler runs **in-process with Gunicorn**. With `-w 4` workers, you get 4 concurrent backup jobs every Sunday. | Races, wasted disk, possibly all 4 fighting over the same file. |
| B5 | **Stored on the same VPS.** If the server dies, backups die with it. | No disaster recovery. |
| B6 | **No restore procedure documented.** Untested backups == hope. | Recovery is improvised during an outage. |
| B7 | Retention is 8 files regardless of cadence. At daily cadence that's only 8 days. | Too short for "oops I deleted last week's data". |
| B8 | No alerting if a backup fails. Silent failures go unnoticed. | Discovered only when you try to restore. |
| B9 | No integrity check after writing the file (e.g. `PRAGMA integrity_check` for SQLite or `pg_restore --list` for Postgres). | Can't tell good backup from bad. |

### Proposed daily backup system (design, not implemented)

**Goals:** daily snapshots, survive VPS loss, detect failures, tested restore path. Still a small-app budget — no fancy infra.

#### Architecture

1. **Move scheduling out of the app process.** APScheduler-in-Gunicorn is the wrong place for this. Use a **systemd timer** (or plain `cron`) on the host. Single source of truth, survives app restarts, doesn't multiply with workers, logs go to the journal.

2. **Use the DB's native backup primitive, not `shutil.copy2`.**
   - **SQLite**: `sqlite3 carhaus.db ".backup '/path/to/out.db'"` — consistent snapshot even with writers active.
   - **PostgreSQL**: `pg_dump --format=custom "$DATABASE_URL" > out.dump` — consistent, restorable with `pg_restore`.

3. **Compress + timestamp the output.** `zstd -19` gives good ratio cheaply. Include ISO date in the filename for easy sorting.

4. **Off-VPS copy.** Pick one of:
   - **rclone to a cheap object store** (Backblaze B2: ~$6/TB/mo, the practical choice) → `rclone copy backups/ b2:carhaus-backups/daily/`.
   - **rsync over SSH to a second server or to a home NAS**.
   - **Gmail / Proton inbox via `mpack` or SMTP** if backups stay under ~15 MB (they will for a while) → zero-cost but awkward to automate.
   Recommendation: **Backblaze B2 + rclone**. Cheapest reliable option.

5. **Retention policy (grandfather-father-son):**
   - Keep **last 7 daily** backups.
   - Keep **last 4 weekly** backups (one Sunday each of the past 4 weeks).
   - Keep **last 6 monthly** backups (first-of-month).
   - Everything older gets pruned by `rclone delete --min-age`.
   Gives ~6 months of recoverable history for minimal space.

6. **Integrity check after write.**
   - SQLite: open the copy and run `PRAGMA integrity_check;`. Non-`ok` → alert.
   - Postgres: `pg_restore --list out.dump > /dev/null`. Non-zero → alert.

7. **Failure alerting.** Two options:
   - **Email via `msmtp`** to the operator on any non-zero exit. Simple, works with Gmail app passwords.
   - **Healthchecks.io** (free tier): `curl https://hc-ping.com/<uuid>` on success, `.../fail` on failure. They email you if the daily ping is missed — catches "script never ran" failures too, which email-on-error misses.
   Recommendation: **Healthchecks.io** — catches silence, not just loud errors.

8. **Keep `/api/dev/backup`** for on-demand snapshots before risky operations. Make it call the same script via `subprocess` so there's one code path.

#### Proposed file layout

```
/var/www/carhausV2/
  scripts/
    backup.sh            # the real script — DB-agnostic dispatcher
  systemd/
    carhaus-backup.service
    carhaus-backup.timer
/var/backups/carhaus/    # local staging, outside the app dir
  daily/
  weekly/
  monthly/
~/.config/rclone/rclone.conf   # B2 creds, mode 0600
```

#### Cadence

```
[Timer]
OnCalendar=*-*-* 03:00:00     # daily, 03:00 Europe/Bucharest
RandomizedDelaySec=600        # stagger in case of cluster
Persistent=true               # catch up if VPS was off at 03:00
```

#### Restore procedure (documented up front)

**This is the part that makes backups real — without it, they're decoration.** Rehearse once now, re-rehearse quarterly.

- **SQLite**:
  ```bash
  systemctl stop carhaus
  cp instance/carhaus.db instance/carhaus.db.broken
  zstd -d /var/backups/carhaus/daily/carhaus_2026-04-23.db.zst \
       -o instance/carhaus.db
  sqlite3 instance/carhaus.db "PRAGMA integrity_check;"
  systemctl start carhaus
  ```
- **Postgres**:
  ```bash
  systemctl stop carhaus
  pg_restore --clean --if-exists -d "$DATABASE_URL" \
             /var/backups/carhaus/daily/carhaus_2026-04-23.dump
  systemctl start carhaus
  ```

Document both in `docs/runbook-restore.md` when the system is actually built.

#### Implementation checklist (for when it's time)

- [ ] Remove the APScheduler block from `backend/__init__.py:39-46`.
- [ ] Write `scripts/backup.sh` that branches on `sqlite://` vs `postgresql://` in `DATABASE_URL`.
- [ ] Add `zstd`, `rclone`, `msmtp` (or `curl` for healthchecks) to VPS install list.
- [ ] Create B2 bucket + an application key scoped **write-only** to that bucket (so a compromised VPS can't delete history).
- [ ] Drop `carhaus-backup.service` + `.timer` into `/etc/systemd/system/`, `systemctl enable --now carhaus-backup.timer`.
- [ ] Set up Healthchecks.io check with a daily schedule + 2h grace.
- [ ] Do one full restore into a scratch DB. Verify login + a few queries. Document any gotchas.
- [ ] Update `/api/dev/system` to show last successful backup timestamp + offsite sync status, not just local filenames.
- [ ] Quarterly: do another restore rehearsal. If you skipped the rehearsal, assume backups are broken.

#### Cost estimate

- Backblaze B2: for a DB that's ~200 KB today, even 6 months of daily snapshots is well under 1 GB. Realistically **< $1/month** including egress on the rare restore.
- Healthchecks.io free tier: 20 checks, enough for this and future needs.
- Operator time: ~2 hours to build, ~30 min quarterly to rehearse.

---

## Part 3 — Recommended order of operations

Security fixes first, backups after. Most security work is minutes; the backup project is a small weekend.

**Immediate (~30 min total):**
1. Change both admin passwords via UI (C1).
2. Rotate `SECRET_KEY` on the VPS + restart Gunicorn (C2).
3. Confirm VPS `.env` has `FLASK_DEBUG=false`; flip `run.py:6` to `debug=False` (C3).
4. Patch `get_client` with `locatie_id` scope, redeploy (C4).
5. Strip the password-repair branch out of `initialize.py` (C1 part 2).

**This week (~1 hour):**
6. Add `ProxyFix` + Nginx `X-Forwarded-*` headers (H1).
7. Add password min-length check in the 3 endpoints (H2).
8. Add HSTS + CSP headers in Nginx (H3).

**When time allows (~1 weekend):**
9. Build the daily backup system per Part 2.
10. Do a restore rehearsal. Write the runbook.
