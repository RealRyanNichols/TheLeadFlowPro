#!/usr/bin/env bash
# Puts the Longview business directory on the LeadFlow website:
# https://www.theleadflowpro.com/longview/businesses/ (every other page stays the website).
#
# Run as root on the droplet AFTER install.sh, from the same checkout:
#   bash deploy/longview-archive/website-on.sh
#
# What it changes, and only this:
#   1. /etc/caddy/sites/theleadflowpro.caddy (the website's Caddy block, which
#      must already be ON) is replaced by this checkout's
#      deploy/droplet/theleadflowpro.caddy, which adds two import lines for the
#      directory routes. The old block is kept in
#      /etc/caddy/theleadflowpro.caddy.previous and put back if Caddy rejects
#      the new one or the site stops answering.
#   2. LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com in /etc/longview-archive/env
#      (unless a value is already there), so the directory's links use the website.
#   3. Restarts longview-archive and rebuilds the directory pages.
# It touches no DNS, no other site, no app container, and no secret.
# Undo: cp /etc/caddy/theleadflowpro.caddy.previous /etc/caddy/sites/theleadflowpro.caddy
#       && systemctl reload caddy  (the backup is kept after a successful run).

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
SITE_ON=/etc/caddy/sites/theleadflowpro.caddy
BACKUP=/etc/caddy/theleadflowpro.caddy.previous
NEW="$REPO/deploy/droplet/theleadflowpro.caddy"
ROUTES=/etc/caddy/longview-archive/website.routes
ENV_FILE=/etc/longview-archive/env
BASE_URL=https://www.theleadflowpro.com

say() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok  %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root."
[ -f "$SITE_ON" ] || die "The website's Caddy block ($SITE_ON) is not on. Nothing was changed."
[ -f "$ROUTES" ] || die "The directory is not installed yet ($ROUTES missing). Run install.sh first. Nothing was changed."
[ -f "$NEW" ] || die "This checkout has no $NEW. Nothing was changed."
grep -q 'import /etc/caddy/longview-archive/\*\.routes' "$NEW" || die "$NEW does not import the directory routes. Nothing was changed."

site_ok() {
	curl -fsS --max-time 10 --resolve www.theleadflowpro.com:443:127.0.0.1 -o /dev/null "https://www.theleadflowpro.com$1"
}

say "Website Caddy block"
if cmp -s "$NEW" "$SITE_ON"; then
	ok "already up to date"
else
	site_ok / || die "https://www.theleadflowpro.com does not answer from this droplet right now. Nothing was changed."
	cp -p "$SITE_ON" "$BACKUP"
	install -m 644 "$NEW" "$SITE_ON"
	restore() {
		cp -p "$BACKUP" "$SITE_ON"
		systemctl reload caddy || true
		die "$1 The previous block was put back ($BACKUP)."
	}
	caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || restore "Caddy rejected the new block."
	systemctl reload caddy || restore "Caddy did not reload."
	sleep 2
	site_ok / || restore "The website stopped answering after the change."
	ok "updated; the previous block is kept in $BACKUP"
fi

say "Directory links point at the website"
install -d -m 755 /etc/longview-archive
if grep -q '^LVA_PUBLIC_BASE_URL=' "$ENV_FILE" 2>/dev/null; then
	ok "kept the existing $(grep '^LVA_PUBLIC_BASE_URL=' "$ENV_FILE" | head -1)"
else
	[ -f "$ENV_FILE" ] || printf '# Only LVA_PUBLIC_HOST and LVA_PUBLIC_BASE_URL may be set here, one KEY=VALUE per line.\n' > "$ENV_FILE"
	printf 'LVA_PUBLIC_BASE_URL=%s\n' "$BASE_URL" >> "$ENV_FILE"
	chmod 644 "$ENV_FILE"
	ok "LVA_PUBLIC_BASE_URL=$BASE_URL"
fi
systemctl restart longview-archive
runuser -u lvarchive -- env -C /opt/longview-archive/app PYTHONPATH=/opt/longview-archive/app PYTHONDONTWRITEBYTECODE=1 \
	/opt/longview-archive/venv/bin/python -m longview_archive site >/dev/null
ok "directory pages rebuilt"

say "Check"
if site_ok /longview/businesses/; then
	ok "https://www.theleadflowpro.com/longview/businesses/ answers"
else
	die "The directory does not answer on the website yet. Send this output to Claude; the website itself is unchanged apart from the block above."
fi
