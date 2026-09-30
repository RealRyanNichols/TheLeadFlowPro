#!/usr/bin/env bash
# Puts the business directory on the LeadFlow website:
# https://www.theleadflowpro.com/<town>/businesses/ and /places/ (every other
# page stays the website, served exactly as before).
#
# Run as root on the droplet AFTER install.sh, from the same checkout:
#   bash deploy/longview-archive/website-on.sh --check   # read-only: what it found, what it would change
#   bash deploy/longview-archive/website-on.sh           # make the change
#
# It works with the site block that serves www.theleadflowpro.com today,
# wherever it is under /etc/caddy and whatever it proxies to (on Sep 28, 2026
# that was the site@leadflow service on 127.0.0.1:3109, see CLAUDE.md). It
# never replaces that block. It changes only this:
#   1. One line is added right after the block's opening line:
#        import /etc/caddy/longview-archive/*.routes
#      (the directory's paths, served from /var/lib/longview-archive/www; the
#      routes answer their own 404s, so no error handling is added). The file
#      is copied to /etc/caddy/longview-archive/site-block.previous first and
#      put back if Caddy rejects the change or the website stops answering.
#      --undo removes that one line again and leaves the rest of the block alone.
#   2. LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com in
#      /etc/longview-archive/env (unless a value is already there).
#   3. Restarts longview-archive and rebuilds the directory pages.
# It stops, changing nothing, unless exactly one block for
# www.theleadflowpro.com is found. It touches no DNS, no other site, no app,
# no release pipeline, and no secret; it prints file names, never file contents.
# Undo: bash deploy/longview-archive/website-on.sh --undo

set -euo pipefail

CADDY_DIR=${LVA_CADDY_DIR:-/etc/caddy}
CADDYFILE=$CADDY_DIR/Caddyfile
ROUTES=$CADDY_DIR/longview-archive/website.routes
BACKUP=$CADDY_DIR/longview-archive/site-block.previous
BACKUP_PATH=$CADDY_DIR/longview-archive/site-block.path
IMPORT_LINE='import /etc/caddy/longview-archive/*.routes'
ENV_FILE=/etc/longview-archive/env
BASE_URL=https://www.theleadflowpro.com
HOST=www.theleadflowpro.com
# A site-address line naming www.theleadflowpro.com and opening its block:
#   www.theleadflowpro.com {   |   theleadflowpro.com, www.theleadflowpro.com {   |   https://www.theleadflowpro.com:443 {
ADDRESS_RE='^[[:space:]]*([^#{]*[[:space:],])?(https?://)?www\.theleadflowpro\.com(:443)?([[:space:],][^#{]*)?[[:space:]]*\{[[:space:]]*$'

MODE=apply
case "${1:-}" in
	'') ;;
	--check) MODE=check ;;
	--undo) MODE=undo ;;
	*) echo "usage: $0 [--check|--undo]" >&2; exit 2 ;;
esac

say() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok  %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root."

site_ok() {
	curl -fsS --max-time 10 --resolve "$HOST:443:127.0.0.1" -o /dev/null "https://$HOST$1"
}

reload_or_restore() {
	local file=$1
	restore() {
		cp -p "$BACKUP" "$file"
		systemctl reload caddy || true
		die "$1 The site block was put back as it was ($file)."
	}
	caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1 || restore "Caddy rejected the change."
	systemctl reload caddy || restore "Caddy did not reload."
	sleep 2
	site_ok / || restore "The website stopped answering after the change."
}

if [ "$MODE" = undo ]; then
	# Removes only the line this script added, so later edits to the block are kept.
	[ -f "$BACKUP_PATH" ] || die "This script has not changed a site block ($BACKUP_PATH missing). Nothing was changed."
	file=$(cat "$BACKUP_PATH")
	grep -qF "$IMPORT_LINE" "$file" || { ok "$file does not import the directory routes; nothing to undo"; exit 0; }
	cp -p "$file" "$BACKUP"
	tmp=$(mktemp)
	awk -v line="$IMPORT_LINE" '{ t = $0; gsub(/^[ \t]+|[ \t]+$/, "", t) } t != line' "$file" > "$tmp"
	cat "$tmp" > "$file"
	rm -f "$tmp"
	reload_or_restore "$file"
	ok "removed the import from $file; the directory is off the website (the rest of the block is unchanged)"
	exit 0
fi

say "Where www.theleadflowpro.com is served from"
[ -f "$CADDYFILE" ] || die "$CADDYFILE does not exist, so this droplet's Caddy is set up some other way. Nothing was changed. Send this output to Claude."
command -v caddy >/dev/null 2>&1 || die "caddy is not on the PATH. Nothing was changed."
matches=()
while IFS= read -r f; do
	case "$f" in
		*.previous|*.bak|*.off|*.orig|*~|"$CADDY_DIR"/longview-archive/*) continue ;;
	esac
	n=$(grep -cE "$ADDRESS_RE" "$f" || true)
	[ "$n" -gt 0 ] && matches+=("$f:$n")
done < <(grep -rlE "$ADDRESS_RE" "$CADDY_DIR" 2>/dev/null || true)
if [ "${#matches[@]}" -ne 1 ] || [ "${matches[0]##*:}" -ne 1 ]; then
	printf '   found: %s\n' "${matches[@]:-none}"
	die "Expected exactly one site block for $HOST under $CADDY_DIR. Nothing was changed. Send this output to Claude."
fi
FILE=${matches[0]%:*}
ok "$FILE"
site_ok / && ok "https://$HOST/ answers" || die "https://$HOST does not answer from this droplet right now. Nothing was changed."

say "Directory routes"
[ -f "$ROUTES" ] || die "The directory is not installed yet ($ROUTES missing). Run install.sh first. Nothing was changed."
ok "$ROUTES"

say "Site block"
if grep -qF "$IMPORT_LINE" "$FILE"; then
	ok "already imports the directory routes"
elif [ "$MODE" = check ]; then
	ok "would add, after line $(grep -nE "$ADDRESS_RE" "$FILE" | cut -d: -f1): $IMPORT_LINE"
	ok "would set LVA_PUBLIC_BASE_URL=$BASE_URL unless $ENV_FILE has one, then rebuild the pages"
	echo; echo "Check only: nothing was changed."
	exit 0
else
	cp -p "$FILE" "$BACKUP"
	printf '%s\n' "$FILE" > "$BACKUP_PATH"
	tmp=$(mktemp)
	awk -v re="$ADDRESS_RE" -v line="	$IMPORT_LINE" '{ print } !done && $0 ~ re { print line; done = 1 }' "$FILE" > "$tmp"
	cat "$tmp" > "$FILE"   # keeps the file's owner and mode
	rm -f "$tmp"
	reload_or_restore "$FILE"
	ok "added; the previous block is kept in $BACKUP (undo: $0 --undo)"
fi
[ "$MODE" = check ] && { echo; echo "Check only: nothing was changed."; exit 0; }

say "Directory links point at the website"
install -d -m 755 /etc/longview-archive
if grep -q '^LVA_PUBLIC_BASE_URL=' "$ENV_FILE" 2>/dev/null; then
	ok "kept the existing $(grep '^LVA_PUBLIC_BASE_URL=' "$ENV_FILE" | head -1)"
else
	[ -f "$ENV_FILE" ] || printf '# Only LVA_PUBLIC_HOST, LVA_PUBLIC_BASE_URL and LVA_PLACES may be set here, one KEY=VALUE per line.\n' > "$ENV_FILE"
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
	ok "https://$HOST/longview/businesses/ answers"
else
	die "The directory does not answer on the website yet. Send this output to Claude; undo with: $0 --undo"
fi
