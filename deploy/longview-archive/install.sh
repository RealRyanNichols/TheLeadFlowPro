#!/usr/bin/env bash
# Longview Business Archive installer for the LeadFlow droplet (leadflow-web).
#
# Paste the one-line command from README.md into the DigitalOcean web console
# as root. It changes exactly what the owner approved and nothing else:
#   - the system user lvarchive (no login shell, no home directory)
#   - /opt/longview-archive       code (app, app.previous), an empty venv,
#                                 and copies of uninstall.sh and preflight.sh
#   - /var/lib/longview-archive   the archive's data
#   - /etc/systemd/system/longview-archive.service (enabled and started)
#   - /etc/caddy/sites/longview-archive.caddy (validated before Caddy reloads)
# It installs no packages, changes no DNS, and reads no env file. Apart from
# reloading Caddy, it touches no other site, service, database, user, or key.
# Every check runs before the first change, including a check that Caddy's
# current config validates. Re-running it is the upgrade, and running it twice
# is safe. New code is migrated and self-checked from a staging copy before it
# replaces the installed one, and after the restart the installer waits for
# the NEW engine to prove itself; if it does not, the previous code and unit
# file go back and the service restarts on them.
#
# Root never follows a link the service user could plant: it changes only the
# top data folder (whose parent /var/lib is root's), and the service user
# makes everything below it.
#
# Flags:
#   --dry-run    print every action and change nothing
#   --no-caddy   skip the status host (no Caddy file, no Caddy reload)
#   --any-host   skip the leadflow-web hostname check
#
# Test-only hooks for tests/test_deploy.py. Never set them on the droplet; the
# script refuses one without the other.
#   LVA_INSTALL_PREFIX=/tmp/x   put /tmp/x in front of every absolute path
#   LVA_INSTALL_FAKE_SYSTEM=1   replace systemctl, caddy, useradd, runuser, id,
#                               chown, df, and hostname with shell functions
#                               that log what they would have done (runuser
#                               really runs `install -d`, as the test user)
set -euo pipefail
umask 022

SERVICE=longview-archive
SERVICE_USER=lvarchive
STATUS_HOST=longview.165-227-248-110.sslip.io
MIN_FREE_GB=10
STATUS_WAIT_S=90
# After the new engine's first status write, it must stay up this long with
# the same PID and no restarts before the upgrade counts as healthy.
SETTLE_S=20

SOURCE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PKG_SRC=$SOURCE_DIR/longview_archive
UNIT_SRC=$SOURCE_DIR/systemd/$SERVICE.service
SITE_SRC=$SOURCE_DIR/caddy/$SERVICE.caddy

DRY_RUN=0
NO_CADDY=0
ANY_HOST=0
WORK_DIR=

say() { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
die() {
	printf '\nSTOP: %s\n' "$*" >&2
	exit 1
}

# Every change goes through run, so --dry-run prints it instead and a real
# run leaves a readable trail in the console.
run() {
	if [ "$DRY_RUN" = 1 ]; then
		printf '  [dry-run] %s\n' "$*"
		return 0
	fi
	printf '  $ %s\n' "$*"
	"$@"
}

usage() {
	sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d; s/^# \{0,1\}//'
}

for arg in "$@"; do
	case $arg in
	--dry-run) DRY_RUN=1 ;;
	--no-caddy) NO_CADDY=1 ;;
	--any-host) ANY_HOST=1 ;;
	-h | --help)
		usage
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
APP_DIR=$OPT_DIR/app
VENV_DIR=$OPT_DIR/venv
DATA_DIR=$PREFIX/var/lib/longview-archive
STATUS_JSON=$DATA_DIR/www/status.json
UNIT_DIR=$PREFIX/etc/systemd/system
UNIT_DEST=$UNIT_DIR/$SERVICE.service
CADDYFILE=$PREFIX/etc/caddy/Caddyfile
CADDY_SITES=$PREFIX/etc/caddy/sites
SITE_DEST=$CADDY_SITES/$SERVICE.caddy
OS_RELEASE=$PREFIX/etc/os-release

if [ "$FAKE" = 1 ]; then
	# The fake system keeps its state (users, active units, knobs the tests
	# turn) in $PREFIX/.fake-system and logs every change it pretends to make
	# to calls.log there. Read-only queries are answered without logging.
	FAKE_DIR=$PREFIX/.fake-system
	fake_log() {
		mkdir -p "$FAKE_DIR"
		printf '%s\n' "$*" >>"$FAKE_DIR/calls.log"
		printf '    [fake] %s\n' "$*"
	}
	id() {
		case "$*" in
		-u) echo 0 ;;
		"-u $SERVICE_USER" | "$SERVICE_USER") [ -f "$FAKE_DIR/user-$SERVICE_USER" ] && echo 990 ;;
		*) return 1 ;;
		esac
	}
	hostname() { cat "$PREFIX/etc/hostname" 2>/dev/null || echo unknown; }
	df() {
		local kb
		kb=$(cat "$FAKE_DIR/free-kb" 2>/dev/null || echo 52428800)
		printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\nfake %s 0 %s 1%% /\n' "$kb" "$kb"
	}
	caddy() {
		if [ "${1:-}" = version ]; then
			cat "$FAKE_DIR/caddy-version" 2>/dev/null || echo "v2.8.4 h1:fake"
			return 0
		fi
		# The read-only pre-check (check_host) is logged apart from changes and
		# has its own knob: a config that was already broken before we came.
		if [ "${1:-}" = validate ] && [ "${READ_ONLY_CHECK:-0}" = 1 ]; then
			mkdir -p "$FAKE_DIR"
			printf 'caddy %s\n' "$*" >>"$FAKE_DIR/reads.log"
			if [ -f "$FAKE_DIR/caddy-config-broken" ]; then
				echo "fake caddy: existing config is broken" >&2
				return 1
			fi
			return 0
		fi
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
		is-active)
			if [ -f "$FAKE_DIR/active-$unit" ]; then
				[ "${1:-}" = --quiet ] || echo active
				return 0
			fi
			[ "${1:-}" = --quiet ] || echo inactive
			return 3
			;;
		is-enabled) [ -f "$FAKE_DIR/enabled-$unit" ] && return 0 || return 1 ;;
		show)
			echo "(fake) $unit: $*"
			return 0
			;;
		esac
		fake_log systemctl "$verb" "$@"
		case $verb in
		enable)
			touch "$FAKE_DIR/enabled-$unit"
			case " $* " in *" --now "*) touch "$FAKE_DIR/active-$unit" ;; esac
			;;
		start | restart) touch "$FAKE_DIR/active-$unit" ;;
		stop) rm -f "$FAKE_DIR/active-$unit" ;;
		disable) rm -f "$FAKE_DIR/enabled-$unit" ;;
		esac
	}
	useradd() {
		fake_log useradd "$@"
		touch "$FAKE_DIR/user-${*: -1}"
	}
	runuser() {
		fake_log runuser "$@"
		case "${*: -1}" in
		migrate) [ ! -f "$FAKE_DIR/engine-migrate-fails" ] || return 1 ;;
		check) [ ! -f "$FAKE_DIR/engine-check-fails" ] || return 1 ;;
		esac
		# The data subfolders are made as the service user; in the sandbox the
		# test user makes them, so their modes can be checked.
		if [ "${3:-}" = -- ] && [ "${4:-}" = install ]; then
			shift 3
			"$@"
		fi
	}
	chown() { fake_log chown "$@"; }
fi

cleanup() {
	if [ -n "$WORK_DIR" ]; then rm -rf "$WORK_DIR"; fi
}
trap cleanup EXIT

work_dir() {
	if [ -z "$WORK_DIR" ]; then WORK_DIR=$(mktemp -d); fi
}

# version_at_least 2.8.4 2 7 -> true when major.minor >= 2.7
version_at_least() {
	local v=$1 major minor
	major=${v%%.*}
	minor=${v#*.}
	minor=${minor%%.*}
	[[ $major =~ ^[0-9]+$ && $minor =~ ^[0-9]+$ ]] || return 1
	((major > $2 || (major == $2 && minor >= $3)))
}

check_host() {
	step "Checks (read-only)"
	[ "$(id -u)" = 0 ] || die "Run this as root. The DigitalOcean web console logs in as root."
	grep -Eqx 'ID="?ubuntu"?' "$OS_RELEASE" 2>/dev/null ||
		die "This is not Ubuntu ($OS_RELEASE). The installer is written for the LeadFlow droplet."
	say "  Ubuntu: ok"

	command -v python3 >/dev/null 2>&1 || die "python3 is missing. Ubuntu 24.04 ships it; nothing else is installed."
	python3 - <<'PY' || die "Needs python3 3.10 or newer with the standard sqlite3 and venv modules (found $(python3 --version 2>&1))."
import sys
if sys.version_info < (3, 10):
    raise SystemExit(1)
import sqlite3, venv  # noqa: F401  the engine needs nothing outside the standard library
PY
	say "  $(python3 --version 2>&1): ok"

	if [ "$NO_CADDY" = 0 ]; then
		command -v caddy >/dev/null 2>&1 || die "Caddy is not installed. Re-run with --no-caddy to skip the status page."
		local ver
		ver=$(caddy version 2>/dev/null || true)
		ver=${ver%%$'\n'*}
		ver=${ver%% *}
		version_at_least "${ver#v}" 2 7 || die "Caddy ${ver:-unknown} is too old; the status site needs Caddy 2.7 or newer."
		say "  Caddy $ver: ok"
		[ -d "$CADDY_SITES" ] || die "$CADDY_SITES does not exist, so there is nowhere to add the status site."
		grep -Eq '^[[:space:]]*import[[:space:]]+"?(/etc/caddy/)?sites/\*(\.caddy)?"?[[:space:]]*(#.*)?$' "$CADDYFILE" 2>/dev/null ||
			die "$CADDYFILE does not import sites/*.caddy, so a site file there would never load."
		say "  Caddyfile imports sites/*.caddy: ok"
		systemctl is-active --quiet caddy || die "Caddy is not running, so it cannot be reloaded. Nothing was changed."
		say "  Caddy running: ok"
		# Read-only: if another site file is already broken on disk, the
		# validate after our file goes in would fail for a reason we may not
		# fix, leaving a half-finished install. Stop before the first change.
		READ_ONLY_CHECK=1 caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1 ||
			die "Caddy's current config does not validate (another site file has an error), so the status site cannot be added safely. See the error with: caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile. Fix that first, or re-run with --no-caddy. Nothing was changed."
		say "  Caddy's current config validates: ok"
	fi

	[ -d "$UNIT_DIR" ] || die "$UNIT_DIR does not exist; this system does not look like systemd."

	local free_kb need_kb
	free_kb=$(df -Pk "$PREFIX/" | awk 'NR == 2 { print $4 }')
	need_kb=$((MIN_FREE_GB * 1024 * 1024))
	[ "${free_kb:-0}" -ge "$need_kb" ] ||
		die "Only $((${free_kb:-0} / 1024 / 1024)) GB free on /; the archive needs at least $MIN_FREE_GB GB."
	say "  Free space on /: $((free_kb / 1024 / 1024)) GB (need $MIN_FREE_GB): ok"

	if [ "$ANY_HOST" = 0 ]; then
		local host
		host=$(hostname)
		[ "${host%%.*}" = leadflow-web ] ||
			die "This machine is '$host', not leadflow-web. Run it on the LeadFlow droplet, or add --any-host if you are sure."
		say "  Hostname leadflow-web: ok"
	fi

	[ -f "$PKG_SRC/__init__.py" ] || die "The engine package is missing next to this script ($PKG_SRC)."
	[ -f "$UNIT_SRC" ] || die "The service file is missing ($UNIT_SRC)."
	[ "$NO_CADDY" = 1 ] || [ -f "$SITE_SRC" ] || die "The Caddy site file is missing ($SITE_SRC)."
	refuse_linked_data
}

DATA_SUBDIRS_PRIVATE="db backups exports exports/publish exports/private"
DATA_SUBDIRS_PUBLIC="www www/status"

# The service user owns everything below $DATA_DIR and could swap any of it for
# a symbolic link. Root never changes anything down there, but a link where a
# folder belongs means something is wrong, so stop and let a person look.
refuse_linked_data() {
	[ ! -L "$DATA_DIR" ] || die "$DATA_DIR is a symbolic link, not a folder. Refusing to touch it; check it with: ls -la /var/lib. Nothing was changed."
	if [ -e "$DATA_DIR" ] && [ ! -d "$DATA_DIR" ]; then
		die "$DATA_DIR exists but is not a folder. Nothing was changed."
	fi
	local rel
	# shellcheck disable=SC2086  # the lists are fixed words with no spaces
	for rel in $DATA_SUBDIRS_PRIVATE $DATA_SUBDIRS_PUBLIC; do
		[ ! -L "$DATA_DIR/$rel" ] ||
			die "$DATA_DIR/$rel is a symbolic link, not a folder. The engine never makes one, so the service may have been tampered with. Stop it (systemctl stop $SERVICE), look (ls -la $DATA_DIR $DATA_DIR/exports $DATA_DIR/www), remove the link, then re-run. Nothing was changed by this step."
	done
}

ensure_user() {
	step "Service user $SERVICE_USER"
	if id -u "$SERVICE_USER" >/dev/null 2>&1; then
		say "  Already exists."
	else
		run useradd --system --user-group --no-create-home --home-dir /nonexistent \
			--shell /usr/sbin/nologin "$SERVICE_USER"
	fi
}

# Root owns the code; the service can read it and never write it.
lock_code_tree() {
	run find "$1" -type d -exec chmod 0755 {} +
	run find "$1" -type f -exec chmod 0644 {} +
	run chown -R root:root "$1"
}

# Stage the new code next to the installed copy. Nothing the service runs
# changes until activate_code, after the staged copy passed migrate and check.
STAGE_DIR=$OPT_DIR/app.staging
CODE_CHANGED=1
stage_code() {
	step "Engine code staged in $STAGE_DIR"
	run mkdir -p "$OPT_DIR"
	run chmod 0755 "$OPT_DIR"
	run chown root:root "$OPT_DIR"

	# Copy into a staging directory on the same disk, then rename it into
	# place, so the service never sees a half-copied tree.
	run rm -rf "$STAGE_DIR"
	run mkdir -m 0755 "$STAGE_DIR"
	run cp -R "$PKG_SRC" "$STAGE_DIR/longview_archive"
	run find "$STAGE_DIR" -name __pycache__ -type d -prune -exec rm -rf {} +
	run find "$STAGE_DIR" -name '*.pyc' -type f -delete
	lock_code_tree "$STAGE_DIR"

	if [ "$DRY_RUN" = 0 ] && [ -d "$APP_DIR" ] && diff -rq "$STAGE_DIR" "$APP_DIR" >/dev/null 2>&1; then
		CODE_CHANGED=0
	fi
}

ensure_venv() {
	step "Python venv in $VENV_DIR (standard library only; nothing is installed into it)"
	if [ -x "$VENV_DIR/bin/python" ] && "$VENV_DIR/bin/python" -c 'import sqlite3' >/dev/null 2>&1; then
		say "  Already present."
	else
		run python3 -m venv --without-pip --clear "$VENV_DIR"
		run chown -R root:root "$VENV_DIR"
	fi
}

# Run a command as the service user.
as_service() {
	run runuser -u "$SERVICE_USER" -- "$@"
}

ensure_data_dirs() {
	step "Data in $DATA_DIR"
	refuse_linked_data
	# Root changes only the top folder. Its parent, /var/lib, belongs to root,
	# so the service user cannot swap it for a link; chown -h would not follow
	# one anyway. It is traverse-only so Caddy can reach www/ while the
	# database, backups, and exports stay private to the service user.
	run mkdir -p "$DATA_DIR"
	run chmod 0711 "$DATA_DIR"
	run chown -h "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"
	# Everything below it is made by the service user itself (the engine's
	# migrate does the same), so a planted link can only ever reach what that
	# user could already change. Root never chmods or chowns in there.
	local rel private=() public=()
	# shellcheck disable=SC2086  # the lists are fixed words with no spaces
	for rel in $DATA_SUBDIRS_PRIVATE; do private+=("$DATA_DIR/$rel"); done
	# shellcheck disable=SC2086
	for rel in $DATA_SUBDIRS_PUBLIC; do public+=("$DATA_DIR/$rel"); done
	as_service install -d -m 0700 "${private[@]}"
	as_service install -d -m 0755 "${public[@]}"
}

# Run an engine command from the code in $1 as the service user, with the same
# environment the unit gives the service.
engine() {
	local code=$1
	shift
	as_service env -C "$code" \
		PYTHONPATH="$code" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
		LVA_DATA_DIR="$DATA_DIR" "$VENV_DIR/bin/python" -m longview_archive "$@"
}

# The staged (new) code migrates and checks itself before it replaces the
# installed copy. On failure the staged copy is thrown away, so the code in
# $APP_DIR, which any later restart would run, is the code that was there.
migrate_and_check() {
	step "Database migrate and self-check (new code, before it goes live)"
	local failed=
	if ! engine "$STAGE_DIR" migrate; then
		failed=migrate
	elif ! engine "$STAGE_DIR" check; then
		failed=self-check
	fi
	if [ -n "$failed" ]; then
		run rm -rf "$STAGE_DIR"
		die "The new code's $failed step failed, so it was not installed. The code in $APP_DIR is the same as before this run and the service was not (re)started. Read the error above."
	fi
}

SWAPPED_CODE=0
activate_code() {
	step "Engine code in $APP_DIR"
	if [ "$CODE_CHANGED" = 0 ]; then
		say "  Code unchanged; keeping the installed copy and app.previous as they are."
		run rm -rf "$STAGE_DIR"
		lock_code_tree "$APP_DIR"
	else
		if [ -d "$APP_DIR" ]; then
			run rm -rf "$APP_DIR.previous"
			run mv -T "$APP_DIR" "$APP_DIR.previous"
			SWAPPED_CODE=1
		fi
		run mv -T "$STAGE_DIR" "$APP_DIR"
	fi

	# The rollback and inspection scripts live next to the code, so they are
	# on the droplet after the temporary clone is gone.
	run install -m 0755 "$SOURCE_DIR/uninstall.sh" "$OPT_DIR/uninstall.sh"
	run install -m 0755 "$SOURCE_DIR/preflight.sh" "$OPT_DIR/preflight.sh"
	run chown root:root "$OPT_DIR/uninstall.sh" "$OPT_DIR/preflight.sh"
}

START_MARK=
START_PID=
START_RESTARTS=
PREVIOUS_UNIT=
unit_prop() { systemctl show -p "$1" --value "$SERVICE" 2>/dev/null || true; }

install_service() {
	step "systemd service $SERVICE"
	if [ -f "$UNIT_DEST" ] && cmp -s "$UNIT_SRC" "$UNIT_DEST"; then
		say "  Unit file unchanged."
	else
		if [ -f "$UNIT_DEST" ] && [ "$DRY_RUN" = 0 ]; then
			work_dir
			PREVIOUS_UNIT=$WORK_DIR/$SERVICE.service.previous
			cp -p "$UNIT_DEST" "$PREVIOUS_UNIT"
		fi
		run install -m 0644 "$UNIT_SRC" "$UNIT_DEST"
	fi
	run systemctl daemon-reload
	if systemctl is-active --quiet "$SERVICE"; then
		run systemctl enable "$SERVICE"
		run systemctl restart "$SERVICE"
	else
		run systemctl enable --now "$SERVICE"
	fi
	# systemctl returns only after the old engine has exited (its last write
	# is a "stopping" status page) and the new one was started, so anything
	# written after this mark comes from the new engine.
	if [ "$DRY_RUN" = 0 ]; then
		work_dir
		START_MARK=$WORK_DIR/started
		touch "$START_MARK"
		if [ "$FAKE" = 0 ]; then
			START_PID=$(unit_prop MainPID)
			START_RESTARTS=$(unit_prop NRestarts)
		fi
	fi
}

install_caddy_site() {
	step "Caddy site $STATUS_HOST"
	if [ "$NO_CADDY" = 1 ]; then
		say "  Skipped (--no-caddy)."
		return 0
	fi
	if [ -f "$SITE_DEST" ] && cmp -s "$SITE_SRC" "$SITE_DEST"; then
		say "  Site file unchanged; Caddy not reloaded."
		return 0
	fi
	local previous=
	if [ -f "$SITE_DEST" ] && [ "$DRY_RUN" = 0 ]; then
		work_dir
		previous=$WORK_DIR/$SERVICE.caddy.previous
		cp -p "$SITE_DEST" "$previous"
	fi
	run install -m 0644 "$SITE_SRC" "$SITE_DEST"
	run chown root:root "$SITE_DEST"
	if ! run caddy validate --config "$CADDYFILE" --adapter caddyfile; then
		if [ -n "$previous" ]; then
			run install -m 0644 "$previous" "$SITE_DEST"
		else
			run rm -f "$SITE_DEST"
		fi
		die "Caddy rejected the config, so the site file was put back as it was and Caddy was NOT reloaded. The live sites are unchanged."
	fi
	if ! run systemctl reload caddy; then
		if [ -n "$previous" ]; then
			run install -m 0644 "$previous" "$SITE_DEST"
		else
			run rm -f "$SITE_DEST"
		fi
		die "Caddy did not reload; it keeps serving its previous config. The site file was put back as it was."
	fi
}

# The "state" field of status.json, read as the service user: the file sits in
# a folder that user controls, so root does not open it.
status_state() {
	runuser -u "$SERVICE_USER" -- env -C / "$VENV_DIR/bin/python" -I -c \
		'import json, sys; print(json.load(open(sys.argv[1])).get("state") or "")' \
		"$STATUS_JSON" 2>/dev/null || true
}

# True when the engine started by install_service is healthy: it wrote a
# status.json after the restart whose state is not "stopping" (the old
# engine's last word), and it then stayed active with the same PID and no
# restarts for SETTLE_S seconds. Sets HEALTH_PROBLEM when it is not.
HEALTH_PROBLEM=
new_engine_healthy() {
	if [ "$FAKE" = 1 ]; then
		if [ -f "$FAKE_DIR/engine-unhealthy" ]; then
			HEALTH_PROBLEM="(fake) the new engine crashed after the restart."
			return 1
		fi
		say "  [fake] no engine runs in the test sandbox; treating it as healthy"
		return 0
	fi
	local waited=0 state="" fresh=0
	say "  Waiting up to $STATUS_WAIT_S s for the new engine to write $STATUS_JSON ..."
	while [ "$waited" -lt "$STATUS_WAIT_S" ]; do
		if [ -f "$STATUS_JSON" ] && [ "$STATUS_JSON" -nt "$START_MARK" ]; then
			state=$(status_state)
			if [ -n "$state" ] && [ "$state" != stopping ]; then
				fresh=1
				break
			fi
		fi
		sleep 3
		waited=$((waited + 3))
	done
	if [ "$fresh" = 0 ]; then
		HEALTH_PROBLEM="The new engine wrote no fresh status.json in $STATUS_WAIT_S s (last state: '${state:-none}')."
		return 1
	fi
	say "  Fresh status.json from the new engine (state: $state). Watching it for $SETTLE_S s ..."
	sleep "$SETTLE_S"
	local active pid restarts
	active=$(systemctl is-active "$SERVICE" 2>/dev/null || true)
	pid=$(unit_prop MainPID)
	restarts=$(unit_prop NRestarts)
	if [ "$active" != active ]; then
		HEALTH_PROBLEM="The service is '$active' after the restart."
		return 1
	fi
	if [ -z "$START_PID" ] || [ "$START_PID" = 0 ] || [ "$pid" != "$START_PID" ] || [ "$restarts" != "$START_RESTARTS" ]; then
		HEALTH_PROBLEM="The new engine did not stay up (PID ${START_PID:-?} -> ${pid:-?}, restarts ${START_RESTARTS:-?} -> ${restarts:-?})."
		return 1
	fi
	return 0
}

# Put back what this run changed for the service (the code and the unit file)
# and restart on it. Data and the Caddy file are left as they are.
roll_back() {
	local why=$1
	if [ "$SWAPPED_CODE" = 0 ] && [ -z "$PREVIOUS_UNIT" ]; then
		die "$why This run changed neither the installed code nor the unit file, so there is nothing to roll back to. Read why: journalctl -u $SERVICE -n 100 --no-pager"
	fi
	step "Rolling back to the previous release"
	run systemctl stop "$SERVICE"
	if [ "$SWAPPED_CODE" = 1 ]; then
		run rm -rf "$APP_DIR"
		run mv -T "$APP_DIR.previous" "$APP_DIR"
	fi
	if [ -n "$PREVIOUS_UNIT" ]; then
		run install -m 0644 "$PREVIOUS_UNIT" "$UNIT_DEST"
	fi
	run systemctl daemon-reload
	run systemctl start "$SERVICE"
	die "$why The previous release is back in place and the service was restarted on it. Read why the new one failed: journalctl -u $SERVICE -n 200 --no-pager"
}

verify() {
	step "Verify"
	if [ "$DRY_RUN" = 1 ]; then
		say "  [dry-run] would wait up to $STATUS_WAIT_S s for a status.json from the new engine, watch it $SETTLE_S s more, and roll back to the previous release if it is not healthy"
		return 0
	fi
	say "  systemctl is-active $SERVICE: $(systemctl is-active "$SERVICE" 2>/dev/null || true)"
	systemctl show "$SERVICE" -p CPUQuotaPerSecUSec -p MemoryMax -p IPAddressDeny | sed 's/^/  /'
	if ! new_engine_healthy; then
		roll_back "$HEALTH_PROBLEM"
	fi
	say "  The new engine is running, wrote a fresh status.json, and stayed up."
}

summary() {
	step "Done"
	if [ "$DRY_RUN" = 1 ]; then
		say "Dry run finished. Nothing was changed."
		return 0
	fi
	say "The Longview Business Archive is installed and running."
	if [ "$NO_CADDY" = 1 ]; then
		say "  Status:    $STATUS_JSON (no status page; installed with --no-caddy)"
	else
		say "  Status:    https://$STATUS_HOST/status/"
		say "  Directory: https://$STATUS_HOST/longview/businesses/ (shows a batch once you run: lva approve)"
	fi
	say "  Pause:     touch $DATA_DIR/PAUSE"
	say "  Resume:    rm -f $DATA_DIR/PAUSE"
	say "  Rollback:  bash $OPT_DIR/uninstall.sh   (stops it; keeps the data)"
	say "  Logs:      journalctl -u $SERVICE -n 100 --no-pager"
	say "  Runbook:   https://github.com/RealRyanNichols/TheLeadFlowPro/blob/main/deploy/longview-archive/README.md"
}

main() {
	local commit
	commit=$(git -C "$SOURCE_DIR" rev-parse --short=12 HEAD 2>/dev/null || echo unknown)
	say "Longview Business Archive installer (source $commit)"
	[ "$DRY_RUN" = 0 ] || say "DRY RUN: every action is printed; nothing is changed."
	[ -z "$PREFIX" ] || say "TEST SANDBOX: prefix $PREFIX, fake system calls."
	check_host
	ensure_user
	stage_code
	ensure_venv
	ensure_data_dirs
	migrate_and_check
	activate_code
	install_service
	install_caddy_site
	verify
	summary
}

main
