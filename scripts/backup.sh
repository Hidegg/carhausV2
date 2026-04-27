#!/usr/bin/env bash
# Daily backup script for Carhaus. Invoked by systemd timer (or manually via /api/dev/backup).
# Branches on DATABASE_URL: sqlite → sqlite3 .backup, postgresql → pg_dump.
# Writes compressed file to /var/backups/carhaus/daily/, syncs to B2 via rclone,
# pings Healthchecks.io on success or failure.

set -euo pipefail

APP_DIR="/var/www/carhausV2"
BACKUP_DIR="/var/backups/carhaus"
DAILY_DIR="$BACKUP_DIR/daily"
DATE=$(date +%Y-%m-%d)
HC_URL="${HEALTHCHECKS_URL:-}"   # set in /var/www/carhausV2/.env or systemd EnvironmentFile
RCLONE_REMOTE="${RCLONE_REMOTE:-b2:carhaus-vps/daily}"

# Load app env so DATABASE_URL is available
if [ -f "$APP_DIR/.env" ]; then
    set -a; source "$APP_DIR/.env"; set +a
fi

DATABASE_URL="${DATABASE_URL:-}"

fail() {
    echo "BACKUP FAILED: $1" >&2
    [ -n "$HC_URL" ] && curl -fsS --retry 3 "$HC_URL/fail" -d "$1" >/dev/null || true
    exit 1
}

mkdir -p "$DAILY_DIR"

if [[ "$DATABASE_URL" == sqlite* ]]; then
    DB_PATH=$(echo "$DATABASE_URL" | sed 's|sqlite:///||;s|sqlite://||')
    # Make path absolute relative to app dir if needed
    [[ "$DB_PATH" != /* ]] && DB_PATH="$APP_DIR/$DB_PATH"
    OUT="$DAILY_DIR/carhaus_${DATE}.db"
    sqlite3 "$DB_PATH" ".backup '$OUT'" || fail "sqlite3 .backup failed"
    sqlite3 "$OUT" "PRAGMA integrity_check;" | grep -q "^ok$" || fail "integrity_check failed on $OUT"
    zstd -19 --force -q "$OUT" && rm "$OUT"
    OUTFILE="${OUT}.zst"

elif [[ "$DATABASE_URL" == postgres* ]]; then
    OUT="$DAILY_DIR/carhaus_${DATE}.dump"
    pg_dump --format=custom "$DATABASE_URL" > "$OUT" || fail "pg_dump failed"
    pg_restore --list "$OUT" > /dev/null || fail "pg_restore --list failed on $OUT"
    zstd -19 --force -q "$OUT" && rm "$OUT"
    OUTFILE="${OUT}.zst"

else
    fail "Unknown DATABASE_URL scheme: $DATABASE_URL"
fi

echo "Backup written: $OUTFILE"

# Off-site sync (copyto uploads a single file without listing — works with write-only keys)
if command -v rclone &>/dev/null; then
    rclone copyto "$OUTFILE" "$RCLONE_REMOTE/$(basename $OUTFILE)" || fail "rclone sync failed"
fi

# Ping success
[ -n "$HC_URL" ] && curl -fsS --retry 3 "$HC_URL" >/dev/null || true

echo "Done."
