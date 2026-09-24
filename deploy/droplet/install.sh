#!/usr/bin/env bash
# One-time setup of The LeadFlow Pro on the DigitalOcean droplet, next to the
# central brain. Run as root on the droplet:
#
#   curl -fsSL https://raw.githubusercontent.com/RealRyanNichols/TheLeadFlowPro/main/deploy/droplet/install.sh -o /tmp/lfp-install.sh
#   sudo bash /tmp/lfp-install.sh
#
# It looks before it changes anything, and it never touches the brain: the site
# runs on 127.0.0.1:3100 (the brain keeps :3000), and its HTTPS is one more
# site block in the droplet's Caddy. If something other than Caddy owns ports
# 80 and 443, it stops and says so. Safe to run again.
#
# It does NOT start the site. Next steps are printed at the end:
# fill /etc/theleadflowpro/web.env, then run deploy.sh.

set -euo pipefail

REPO_URL="https://github.com/RealRyanNichols/TheLeadFlowPro.git"
APP_DIR="/opt/theleadflowpro"
CONF_DIR="/etc/theleadflowpro"
SITE_PORT=3100
BRAIN_PORT=3000

say() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok  %s\n' "$*"; }
note() { printf '   ..  %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo bash $0"
. /etc/os-release
case "${ID:-}" in ubuntu | debian) ;; *) die "Expected Ubuntu or Debian, found ${ID:-unknown}." ;; esac

# Which program listens on a TCP port ("" when free).
port_owner() {
  ss -ltnpH "sport = :$1" 2>/dev/null | sed -n 's/.*users:(("\([^"]*\)".*/\1/p' | sort -u | paste -sd, -
}

say "Looking at the droplet (nothing is changed in this step)"
note "$(uname -srm), ${PRETTY_NAME:-}"
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
note "memory ${MEM_MB} MB, swap ${SWAP_MB} MB, free disk $(df -h / | awk 'NR==2 {print $4}')"
for p in 80 443 "$BRAIN_PORT" "$SITE_PORT"; do
  owner=$(port_owner "$p")
  note "port $p: ${owner:-free}"
done

P80=$(port_owner 80)
P443=$(port_owner 443)
PSITE=$(port_owner "$SITE_PORT")
if [ -n "$PSITE" ] && [ "$PSITE" != "docker-proxy" ]; then
  die "Port $SITE_PORT is taken by $PSITE. Nothing was changed. Send this output to Claude."
fi
PROXY="none"
for owner in "$P80" "$P443"; do
  [ -z "$owner" ] && continue
  if [ "$owner" = "caddy" ]; then
    [ "$PROXY" = "none" ] && PROXY="caddy"
  else
    PROXY="other:$owner"
    break
  fi
done
if [ "${PROXY#other:}" != "$PROXY" ]; then
  die "Ports 80/443 belong to ${PROXY#other:}, not Caddy. Nothing was changed, so the brain is untouched. Send this output to Claude."
fi
ok "HTTPS proxy: ${PROXY/none/none yet (Caddy will be installed)}"

say "Swap (the site build needs about 3 GB of memory)"
if [ "$SWAP_MB" -eq 0 ] && [ "$MEM_MB" -lt 3500 ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "added a 4 GB swap file"
else
  ok "no change (memory ${MEM_MB} MB, swap ${SWAP_MB} MB)"
fi

say "Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  ok "$(docker --version)"
else
  apt-get update -q
  apt-get install -y -q ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  ok "installed $(docker --version)"
fi
command -v git >/dev/null 2>&1 || apt-get install -y -q git

say "Code in $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch -q --depth 50 origin main
  ok "already cloned; fetched main (deploy.sh moves it forward)"
else
  git clone -q --depth 50 "$REPO_URL" "$APP_DIR"
  ok "cloned the public repository"
fi

say "Settings in $CONF_DIR"
install -d -m 700 "$CONF_DIR"
if [ -f "$CONF_DIR/web.env" ]; then
  ok "web.env already exists; left as is"
else
  install -m 600 "$APP_DIR/deploy/droplet/web.env.example" "$CONF_DIR/web.env"
  ok "created web.env from the template (names only, values still empty)"
fi

say "Caddy (HTTPS for the site, next to the brain)"
if [ "$PROXY" = "none" ] && ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y -q debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
  # The package's default Caddyfile only serves a placeholder page on :80.
  if grep -q '^:80' /etc/caddy/Caddyfile 2>/dev/null; then
    cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.default.$(date +%Y%m%d%H%M%S)"
    printf '# Site blocks live in /etc/caddy/sites/*.caddy\n' > /etc/caddy/Caddyfile
  fi
  ok "installed $(caddy version | cut -d' ' -f1)"
fi
command -v caddy >/dev/null 2>&1 || die "Caddy is running but its command is not on PATH. Send this output to Claude."
install -d -m 755 /etc/caddy/sites
if ! grep -qE '^[[:space:]]*import[[:space:]]+/etc/caddy/sites/\*\.caddy' /etc/caddy/Caddyfile; then
  cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%Y%m%d%H%M%S)"
  printf '\nimport /etc/caddy/sites/*.caddy\n' >> /etc/caddy/Caddyfile
  ok "added 'import /etc/caddy/sites/*.caddy' to /etc/caddy/Caddyfile (backup kept)"
fi
if [ ! -f /etc/caddy/sites/theleadflowpro.caddy ]; then
  install -m 644 "$APP_DIR/deploy/droplet/theleadflowpro.caddy" /etc/caddy/sites/theleadflowpro.caddy.off
  ok "site block staged OFF until DNS points here (cutover.sh site-on)"
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 \
  || die "Caddy rejected /etc/caddy/Caddyfile. The backup is next to it. Send this output to Claude."
systemctl enable --now caddy >/dev/null 2>&1 || true
systemctl reload caddy
ok "Caddy config valid and reloaded; the brain's site block is unchanged"

say "Firewall"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ok "ufw is on; allowed 80 and 443"
else
  ok "ufw is off; no change (this script never turns a firewall on)"
fi

chmod +x "$APP_DIR"/deploy/droplet/*.sh

cat <<EOF

Done. Nothing is serving the site yet, and nothing on the brain changed.

Next:
  1. Fill in the values:    sudo nano $CONF_DIR/web.env
  2. Build and start it:    sudo $APP_DIR/deploy/droplet/deploy.sh
  3. Check everything:      sudo $APP_DIR/deploy/droplet/check.sh
  4. When checks pass, follow docs/infrastructure/droplet.md for the DNS
     cutover (cutover.sh site-on, then cutover.sh crons-on).
EOF
