#!/usr/bin/env bash
# Moves live traffic and scheduled jobs from Vercel to the droplet, one switch
# at a time, and back. Run as root. Full order: docs/infrastructure/droplet.md.
#
#   cutover.sh site-on     Turn on HTTPS for theleadflowpro.com here. Only after
#                          GoDaddy DNS points at this droplet.
#   cutover.sh crons-on    Start running the vercel.json jobs here. Only after
#                          Vercel's cron jobs are switched off.
#   cutover.sh crons-off   Stop running jobs here (turn Vercel's back on).
#   cutover.sh site-off    Stop serving the site here.
#   cutover.sh rollback    crons-off + site-off, then prints the DNS to restore.
#   cutover.sh status      Same as check.sh.

set -euo pipefail

APP_DIR="/opt/theleadflowpro"
CONF_DIR="/etc/theleadflowpro"
FLAG="$CONF_DIR/cron-enabled"
SITE_ON="/etc/caddy/sites/theleadflowpro.caddy"
SITE_OFF="/etc/caddy/sites/theleadflowpro.caddy.off"

say() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok  %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo $0 $*"

public_ip() { curl -fs --max-time 3 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null || true; }
points_here() { getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | grep -qx "$2"; }

reload_caddy() {
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || return 1
  systemctl reload caddy
}

site_on() {
  say "HTTPS for theleadflowpro.com on this droplet"
  [ -f "$SITE_ON" ] && { ok "already on"; return; }
  [ -f "$SITE_OFF" ] || die "No staged site block. Run install.sh first."
  curl -fsS --max-time 5 http://127.0.0.1:3100/api/health >/dev/null || die "The site container is not healthy. Run deploy.sh first."
  ip=$(public_ip)
  [ -n "$ip" ] || die "Could not read this droplet's public IP from the metadata service."
  for host in theleadflowpro.com www.theleadflowpro.com; do
    points_here "$host" "$ip" || die "$host does not point at $ip yet. Change DNS at GoDaddy first (docs/infrastructure/droplet.md), wait, then retry."
  done
  mv "$SITE_OFF" "$SITE_ON"
  if ! reload_caddy; then mv "$SITE_ON" "$SITE_OFF"; die "Caddy rejected the site block; put it back off. Send check.sh output to Claude."; fi
  for _ in $(seq 1 45); do
    if curl -fsS --max-time 5 --resolve www.theleadflowpro.com:443:127.0.0.1 https://www.theleadflowpro.com/api/health >/dev/null 2>&1; then
      ok "https://www.theleadflowpro.com answers from this droplet with a valid certificate"
      return
    fi
    sleep 4
  done
  die "Caddy has the site but no certificate yet. Check: journalctl -u caddy --since '10 min ago'"
}

site_off() {
  say "Stop serving theleadflowpro.com here"
  [ -f "$SITE_ON" ] || { ok "already off"; return; }
  mv "$SITE_ON" "$SITE_OFF"
  reload_caddy || die "Caddy reload failed; check /etc/caddy/Caddyfile."
  ok "site block off; the brain's site is unchanged"
}

crons_on() {
  say "Run the scheduled jobs here"
  [ -f "$FLAG" ] && { ok "already on"; return; }
  cat <<'EOF'
   Vercel and this droplet must never both run the jobs: leads would get two
   emails and two texts. Switch Vercel's off first:
     Vercel -> the-lead-flow-pro -> Settings -> Cron Jobs -> Disable Cron Jobs
EOF
  printf '\n   Type VERCEL CRONS ARE OFF to continue: '
  read -r answer
  [ "$answer" = "VERCEL CRONS ARE OFF" ] || die "Not confirmed. Nothing changed."
  touch "$FLAG"
  ok "on. The next whole minute runs whatever vercel.json schedules for it."
  ok "watch: docker compose -f $APP_DIR/deploy/droplet/compose.yml logs -f cron"
}

crons_off() {
  say "Stop the scheduled jobs here"
  rm -f "$FLAG"
  ok "off. Turn Vercel's cron jobs back on if the site still runs there."
}

case "${1:-}" in
  site-on) site_on ;;
  site-off) site_off ;;
  crons-on) crons_on ;;
  crons-off) crons_off ;;
  rollback)
    crons_off
    site_off
    cat <<'EOF'

   To send traffic back to Vercel, at GoDaddy (Domains -> theleadflowpro.com -> DNS):
     A     @     76.76.21.21
     CNAME www   cname.vercel-dns.com
   and turn Vercel's cron jobs back on.
EOF
    ;;
  status) exec "$APP_DIR/deploy/droplet/check.sh" ;;
  *) sed -n '2,13p' "$0"; exit 2 ;;
esac
