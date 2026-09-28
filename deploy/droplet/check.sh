#!/usr/bin/env bash
# Read-only status of The LeadFlow Pro on the droplet, and the brain beside it.
# Changes nothing and prints no secret. Run as root:
#
#   sudo /opt/theleadflowpro/deploy/droplet/check.sh
#
# Paste the output to Claude when something looks wrong.

set -uo pipefail

APP_DIR="/opt/theleadflowpro"
CONF_DIR="/etc/theleadflowpro"
SITE="http://127.0.0.1:3100"
COMPOSE=(docker compose -f "$APP_DIR/deploy/droplet/compose.yml")

say() { printf '\n== %s\n' "$*"; }
row() { printf '   %-22s %s\n' "$1" "$2"; }

say "Droplet"
row "host" "$(hostname) $(uname -r)"
row "uptime" "$(uptime -p 2>/dev/null)"
row "memory" "$(free -m | awk '/Mem:/ {print $3" MB used of "$2" MB"}')"
row "swap" "$(free -m | awk '/Swap:/ {print $3" MB used of "$2" MB"}')"
row "disk /" "$(df -h / | awk 'NR==2 {print $3" used, "$4" free"}')"
PUBLIC_IP=$(curl -fs --max-time 3 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null || true)
row "public IPv4" "${PUBLIC_IP:-unknown}"

say "Ports"
command -v ss >/dev/null 2>&1 || row "note" "ss missing (apt-get install iproute2); ports below read as free"
for p in 80 443 3000 3100; do
  owner=$(ss -ltnpH "sport = :$p" 2>/dev/null | sed -n 's/.*users:(("\([^"]*\)".*/\1/p' | sort -u | paste -sd, -)
  row ":$p" "${owner:-free}"
done

say "Brain (untouched by this stack)"
brain=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/ 2>/dev/null)
row "http :3000" "$([ "${brain:-000}" = "000" ] && echo "no answer" || echo "$brain")"

say "Caddy"
row "service" "$(systemctl is-active caddy 2>/dev/null || echo missing)"
if [ -f /etc/caddy/sites/theleadflowpro.caddy ]; then row "site block" "ON"
elif [ -f /etc/caddy/sites/theleadflowpro.caddy.off ]; then row "site block" "staged OFF (cutover.sh site-on)"
else row "site block" "not installed (install.sh)"; fi

say "Site containers"
"${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.State}}\t{{.Status}}' 2>/dev/null || echo "   docker compose not available"
row "checkout" "$(git -C "$APP_DIR" log -1 --format='%h %s' 2>/dev/null | cut -c1-70)"
row "health" "$(curl -fsS --max-time 5 "$SITE/api/health" 2>/dev/null || echo 'no answer')"
for path in / /tools /chase-sheet /login; do
  row "page $path" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H 'Host: www.theleadflowpro.com' -H 'X-Forwarded-Proto: https' "$SITE$path")"
done

say "Settings (names only)"
if [ -f "$CONF_DIR/web.env" ]; then
  row "web.env mode" "$(stat -c '%a %U' "$CONF_DIR/web.env")"
  row "filled" "$(grep -cE '^[A-Z0-9_]+=.+' "$CONF_DIR/web.env") values"
  empty=$(grep -E '^[A-Z0-9_]+=$' "$CONF_DIR/web.env" | cut -d= -f1 | paste -sd' ' -)
  row "empty" "${empty:-none}"
else
  row "web.env" "missing"
fi

say "Cron (replaces Vercel Cron)"
if [ -f "$CONF_DIR/cron-enabled" ]; then row "state" "ON since $(stat -c %y "$CONF_DIR/cron-enabled" | cut -d. -f1)"
else row "state" "idle (Vercel still runs the jobs until cutover.sh crons-on)"; fi
"${COMPOSE[@]}" exec -T cron node -e '
  try {
    const j = JSON.parse(require("fs").readFileSync("/state/cron-status.json", "utf8"));
    const rows = Object.entries(j.jobs || {});
    if (!rows.length) console.log("   no runs recorded yet");
    for (const [path, e] of rows) {
      const l = e.last || {};
      console.log(`   ${String(l.status).padEnd(6)} ${path}  runs=${e.runs} last=${l.at || "-"}`);
    }
  } catch { console.log("   no runs recorded yet"); }' 2>/dev/null || echo "   cron container not running"

say "Database (docs/infrastructure/database.md)"
DB_COMPOSE=(docker compose -f "$APP_DIR/deploy/droplet/compose.yml" --profile db)
DB_BACKUPS="/var/backups/theleadflowpro/db"
# -a: a stopped container counts too, so a database that is down never reads as "not set up".
db_id=$("${DB_COMPOSE[@]}" ps -a -q db 2>/dev/null)
if [ -n "$db_id" ]; then
  row "state" "$(docker inspect -f '{{.State.Status}}{{if .State.Health}} {{.State.Health.Status}}{{end}}' "$db_id" 2>/dev/null)"
  row "size" "$("${DB_COMPOSE[@]}" exec -T db psql -X -t -A -U postgres -d leadflow -c "SELECT pg_size_pretty(pg_database_size('leadflow'))" 2>/dev/null || echo 'no answer')"
  db_ports=$(docker port "$db_id" 2>/dev/null | paste -sd' ' -)
  row "port on the droplet" "${db_ports:-none (the internet cannot reach it)}"
elif docker volume inspect theleadflowpro_db-data >/dev/null 2>&1; then
  row "state" "off; its data is kept (db.sh setup turns it back on)"
else
  row "state" "not set up yet (db.sh setup)"
fi
db_newest=""
db_count=0
for f in "$DB_BACKUPS"/leadflow-*.dump; do
  [ -e "$f" ] || continue
  db_newest="$f"
  db_count=$((db_count + 1))
done
if [ -n "$db_newest" ]; then
  db_age=$(( ($(date +%s) - $(stat -c %Y "$db_newest")) / 3600 ))
  db_stale=""
  [ "$db_age" -gt 26 ] && db_stale="  !! no backup in over a day"
  row "backups" "$db_count kept; newest $(basename "$db_newest"), $(du -h "$db_newest" | cut -f1), ${db_age}h ago$db_stale"
else
  row "backups" "none yet"
fi
if [ -f "$DB_BACKUPS/last-restore-check" ]; then
  db_check_stale=""
  [ -n "$(find "$DB_BACKUPS/last-restore-check" -mtime +8 2>/dev/null)" ] && db_check_stale="  !! older than 8 days"
  row "restore check" "$(cat "$DB_BACKUPS/last-restore-check")$db_check_stale"
else
  row "restore check" "not run yet"
fi
# Only whether a sign-in is there; its contents are never read out.
if grep -q '^token = ' "$CONF_DIR/rclone.conf" 2>/dev/null; then
  if [ -f "$DB_BACKUPS/last-drive-copy" ]; then
    db_drive_stale=""
    [ -n "$(find "$DB_BACKUPS/last-drive-copy" -mmin +1560 2>/dev/null)" ] && db_drive_stale="  !! no copy in over a day"
    row "Google Drive copy" "$(cat "$DB_BACKUPS/last-drive-copy")$db_drive_stale"
  else
    row "Google Drive copy" "linked; no copy yet"
  fi
else
  row "Google Drive copy" "not linked yet (db.sh drive-link)"
fi
db_timer=$(systemctl is-enabled theleadflowpro-db-backup.timer 2>/dev/null)
case "$db_timer" in "" | not-found) db_timer="not installed" ;; esac
row "backup timer" "$db_timer"
[ "$db_timer" = "enabled" ] && row "next backup" "$(systemctl show theleadflowpro-db-backup.timer -p NextElapseUSecRealtime --value 2>/dev/null)"

say "DNS"
for host in theleadflowpro.com www.theleadflowpro.com; do
  addrs=$(getent ahostsv4 "$host" 2>/dev/null | awk '{print $1}' | sort -u | paste -sd' ' -)
  mark=""
  [ -n "$PUBLIC_IP" ] && echo " $addrs " | grep -q " $PUBLIC_IP " && mark="  <- this droplet"
  row "$host" "${addrs:-no answer}$mark"
done
if [ -f /etc/caddy/sites/theleadflowpro.caddy ]; then
  row "https www" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve www.theleadflowpro.com:443:127.0.0.1 https://www.theleadflowpro.com/api/health)"
fi
echo
