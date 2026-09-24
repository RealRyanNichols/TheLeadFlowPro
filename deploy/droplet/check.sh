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
