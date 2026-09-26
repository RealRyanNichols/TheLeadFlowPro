#!/usr/bin/env bash
# Rollback for the Longview Business Archive (The LeadFlow Pro).
#
# Stops and disables the longview-archive service, removes its unit file and
# its one Caddy site file, and reloads Caddy only after the remaining config
# validates. It never deletes the archive's data in /var/lib/longview-archive,
# and it keeps the code in /opt/longview-archive unless --remove-code is given,
# so re-running the install one-liner brings everything back as it was.
#
# Deleting the data is a separate, deliberate step (it cannot be undone). The
# exact commands are printed at the end of this script and in README.md.
#
# Flags:
#   --dry-run       print every action and change nothing
#   --remove-code   also delete /opt/longview-archive (code and venv only)
#
# Test-only hooks, exactly as in install.sh: LVA_INSTALL_PREFIX and
# LVA_INSTALL_FAKE_SYSTEM=1, always together. Never set them on the droplet.
set -euo pipefail
umask 022

SERVICE=longview-archive
SERVICE_USER=lvarchive
DRY_RUN=0
REMOVE_CODE=0
WORK_DIR=

say() { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
die() {
	printf '\nSTOP: %s\n' "$*" >&2
	exit 1
}

run() {
	if [ "$DRY_RUN" = 1 ]; then
		printf '  [dry-run] %s\n' "$*"
		return 0
	fi
	printf '  $ %s\n' "$*"
	"$@"
}

for arg in "$@"; do
	case $arg in
	--dry-run) DRY_RUN=1 ;;
	--remove-code) REMOVE_CODE=1 ;;
	-h | --help)
		sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d; s/^# \{0,1\}//'
		exit 0
		;;
	*) die "Unknown option: $arg (see --help)" ;;
	esac
done

PREFIX=${LVA_INSTALL_PREFIX:-}
FAKE=${LVA_INSTALL_FAKE_SYSTEM:-0}
if [ -n "$PREFIX" ] || [ "$FAKE" != 0 ]; then
	if [ -z "$PREFIX" ] || [ "$FAKE" != 1 ]; then
		die "LVA_INSTALL_PREFIX and LVA_INSTALL_FAKE_SYSTEM=1 are test-only and go together."
	fi
	case $PREFIX in
	/*) ;;
	*) die "LVA_INSTALL_PREFIX must be an absolute path." ;;
	esac
fi

OPT_DIR=$PREFIX/opt/longview-archive
DATA_DIR=$PREFIX/var/lib/longview-archive
UNIT_DEST=$PREFIX/etc/systemd/system/$SERVICE.service
CADDYFILE=$PREFIX/etc/caddy/Caddyfile
SITE_DEST=$PREFIX/etc/caddy/sites/$SERVICE.caddy

if [ "$FAKE" = 1 ]; then
	# Same fake system as install.sh, reduced to the calls made here.
	FAKE_DIR=$PREFIX/.fake-system
	fake_log() {
		mkdir -p "$FAKE_DIR"
		printf '%s\n' "$*" >>"$FAKE_DIR/calls.log"
		printf '    [fake] %s\n' "$*"
	}
	id() { [ "$*" = -u ] && echo 0; }
	caddy() {
		fake_log caddy "$@"
		if [ "${1:-}" = validate ] && [ -f "$FAKE_DIR/caddy-validate-fails" ]; then
			echo "fake caddy: config rejected" >&2
			return 1
		fi
	}
	systemctl() {
		local verb=$1 unit="" a
		shift
		for a in "$@"; do
			case $a in -*) ;; *) [ -n "$unit" ] || unit=$a ;; esac
		done
		case $verb in
		is-active) [ -f "$FAKE_DIR/active-$unit" ] && return 0 || return 3 ;;
		esac
		fake_log systemctl "$verb" "$@"
		case $verb in
		stop) rm -f "$FAKE_DIR/active-$unit" ;;
		disable) rm -f "$FAKE_DIR/enabled-$unit" ;;
		esac
	}
fi

cleanup() {
	if [ -n "$WORK_DIR" ]; then rm -rf "$WORK_DIR"; fi
}
trap cleanup EXIT

remove_service() {
	step "systemd service $SERVICE"
	if [ ! -f "$UNIT_DEST" ]; then
		say "  Not installed; nothing to stop."
		return 0
	fi
	run systemctl stop "$SERVICE"
	run systemctl disable "$SERVICE"
	run rm -f "$UNIT_DEST"
	run systemctl daemon-reload
}

remove_caddy_site() {
	step "Caddy site file"
	if [ ! -f "$SITE_DEST" ]; then
		say "  Not installed; Caddy untouched."
		return 0
	fi
	local previous=
	if [ "$DRY_RUN" = 0 ]; then
		WORK_DIR=$(mktemp -d)
		previous=$WORK_DIR/$SERVICE.caddy
		cp -p "$SITE_DEST" "$previous"
	fi
	run rm -f "$SITE_DEST"
	if ! command -v caddy >/dev/null 2>&1; then
		say "  Caddy is not installed; nothing to reload."
		return 0
	fi
	if ! run caddy validate --config "$CADDYFILE" --adapter caddyfile; then
		[ -z "$previous" ] || run install -m 0644 "$previous" "$SITE_DEST"
		die "Caddy rejected the remaining config, so the site file was put back and Caddy was NOT reloaded. Fix the other error first; the live sites are unchanged."
	fi
	if systemctl is-active --quiet caddy; then
		run systemctl reload caddy
	else
		say "  Caddy is not running; nothing to reload."
	fi
}

remove_code() {
	step "Code in $OPT_DIR"
	if [ "$REMOVE_CODE" = 0 ]; then
		say "  Kept (add --remove-code to delete the code and venv)."
	elif [ -d "$OPT_DIR" ]; then
		run rm -rf "$OPT_DIR"
	else
		say "  Already gone."
	fi
}

main() {
	say "Longview Business Archive rollback"
	[ "$DRY_RUN" = 0 ] || say "DRY RUN: every action is printed; nothing is changed."
	[ "$(id -u)" = 0 ] || die "Run this as root."
	remove_service
	remove_caddy_site
	remove_code
	step "Data in $DATA_DIR"
	say "  Kept. Nothing here deletes the archive."
	say "  To delete it on purpose (cannot be undone), run these two commands:"
	say "    rm -rf $DATA_DIR"
	say "    userdel $SERVICE_USER"
	step "Done"
	if [ "$DRY_RUN" = 1 ]; then
		say "Dry run finished. Nothing was changed."
	else
		say "The Longview archive service and status site are off. Re-run the install one-liner to bring them back."
	fi
}

main
