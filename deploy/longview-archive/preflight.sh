#!/usr/bin/env bash
# M0: read-only inspection of the LeadFlow droplet before (or after) the
# Longview Business Archive goes on it.
#
# It changes nothing and prints no file contents: only names, versions, sizes,
# service and timer names, and a PASS/WARN summary. It never opens the Central
# Brain, Call Desk, or Premier configuration, root's own files, or any env
# file, so it cannot print a secret. Run it from the DigitalOcean web console:
#   bash /opt/longview-archive/preflight.sh        (after an install)
# or with the one-liner in README.md before installing.
#
# Exit status: 0 when install.sh would proceed, 1 when a WARN would stop it.
set -uo pipefail

MIN_FREE_GB=10
PASSES=0
WARNS=0
BLOCKERS=0

section() { printf '\n== %s\n' "$*"; }
line() { printf '  %-22s %s\n' "$1" "$2"; }
pass() {
	printf '  PASS  %s\n' "$*"
	PASSES=$((PASSES + 1))
}
warn() {
	printf '  WARN  %s\n' "$*"
	WARNS=$((WARNS + 1))
}
# A WARN that install.sh would refuse on.
blocker() {
	printf '  WARN  %s  (install.sh will refuse)\n' "$*"
	WARNS=$((WARNS + 1))
	BLOCKERS=$((BLOCKERS + 1))
}
have() { command -v "$1" >/dev/null 2>&1; }
indent() { sed 's/^/  /'; }

section "Host"
host=$(hostname 2>/dev/null || echo unknown)
line "hostname" "$host"
os_name=$(grep -E '^PRETTY_NAME=' /etc/os-release 2>/dev/null | cut -d= -f2- | tr -d '"')
line "os" "${os_name:-unknown}"
line "uptime / load" "$(uptime 2>/dev/null | sed 's/^ *//')"
line "cpus" "$(nproc 2>/dev/null || echo unknown)"
if have free; then
	printf '  memory:\n'
	free -h | indent
fi

section "Disk"
df -h / /var/lib 2>/dev/null | indent
free_kb=$(df -Pk / 2>/dev/null | awk 'NR == 2 { print $4 }')
free_kb=${free_kb:-0}

section "Software"
py_version=$(python3 --version 2>&1 || echo "python3 missing")
line "python3" "$py_version"
caddy_version=$(caddy version 2>/dev/null || echo "caddy missing")
caddy_version=${caddy_version%%$'\n'*}
line "caddy" "$caddy_version"
line "git" "$(git --version 2>/dev/null || echo "git missing")"

section "Caddy"
if [ -f /etc/caddy/Caddyfile ] &&
	grep -Eq '^[[:space:]]*import[[:space:]]+"?(/etc/caddy/)?sites/\*(\.caddy)?"?[[:space:]]*(#.*)?$' /etc/caddy/Caddyfile; then
	caddy_imports=yes
else
	caddy_imports=no
fi
line "imports sites/*.caddy" "$caddy_imports"
if [ -d /etc/caddy/sites ]; then
	printf '  files in /etc/caddy/sites (names only):\n'
	find /etc/caddy/sites -mindepth 1 -maxdepth 1 -printf '    %f\n' 2>/dev/null | sort
else
	line "/etc/caddy/sites" "missing"
fi
caddy_state=$(systemctl is-active caddy 2>/dev/null || true)
line "caddy service" "${caddy_state:-unknown}"

section "Running services (names only)"
systemctl list-units --type=service --state=running --no-pager --no-legend --plain 2>/dev/null |
	awk '{ print "    " $1 }'

section "Timers"
systemctl list-timers --all --no-pager 2>&1 | indent

section "Longview archive (already here?)"
unit_state=$(systemctl is-active longview-archive 2>/dev/null || true)
if [ -f /etc/systemd/system/longview-archive.service ]; then
	line "service" "installed (${unit_state:-unknown}); install.sh will upgrade it"
else
	line "service" "not installed"
fi
if id -u lvarchive >/dev/null 2>&1; then
	line "user lvarchive" "exists"
else
	line "user lvarchive" "not created yet"
fi
for path in /opt/longview-archive /var/lib/longview-archive /etc/caddy/sites/longview-archive.caddy; do
	if [ -e "$path" ]; then line "$path" "exists"; else line "$path" "not present"; fi
done
if [ -e /var/lib/longview-archive/PAUSE ]; then line "pause" "PAUSED (PAUSE file present)"; fi

section "Summary"
if [ "${host%%.*}" = leadflow-web ]; then
	pass "hostname is leadflow-web"
else
	blocker "hostname is '$host', not leadflow-web (install.sh accepts --any-host)"
fi
if grep -Eqx 'ID="?ubuntu"?' /etc/os-release 2>/dev/null; then
	pass "Ubuntu"
else
	blocker "not Ubuntu"
fi
if have python3 && python3 -c 'import sys, sqlite3, venv; raise SystemExit(sys.version_info < (3, 10))' 2>/dev/null; then
	pass "python3 3.10+ with sqlite3 and venv ($py_version)"
else
	blocker "python3 3.10+ with sqlite3 and venv not found ($py_version)"
fi
caddy_semver=${caddy_version%% *}
caddy_semver=${caddy_semver#v}
caddy_major=${caddy_semver%%.*}
caddy_minor=${caddy_semver#*.}
caddy_minor=${caddy_minor%%.*}
if [[ $caddy_major =~ ^[0-9]+$ && $caddy_minor =~ ^[0-9]+$ ]] &&
	((caddy_major > 2 || (caddy_major == 2 && caddy_minor >= 7))); then
	pass "Caddy 2.7 or newer ($caddy_semver; needed for the robots.txt heredoc)"
else
	blocker "Caddy 2.7 or newer not found ($caddy_version; install.sh --no-caddy skips the status page)"
fi
if [ "$caddy_imports" = yes ] && [ -d /etc/caddy/sites ]; then
	pass "Caddyfile imports sites/*.caddy"
else
	blocker "Caddyfile does not import sites/*.caddy or /etc/caddy/sites is missing"
fi
if [ "$caddy_state" = active ]; then
	pass "Caddy is running"
else
	blocker "Caddy is not running ($caddy_state)"
fi
free_gb=$((free_kb / 1024 / 1024))
if [ "$free_kb" -ge $((MIN_FREE_GB * 1024 * 1024)) ]; then
	pass "free space on /: $free_gb GB (floor $MIN_FREE_GB GB)"
else
	blocker "free space on /: $free_gb GB is under the $MIN_FREE_GB GB floor"
fi
if have git; then
	pass "git is available for the install one-liner"
else
	warn "git is missing; the install one-liner clones with git"
fi

printf '\n  %d PASS, %d WARN' "$PASSES" "$WARNS"
if [ "$BLOCKERS" -gt 0 ]; then
	printf ' (%d would stop install.sh)\n' "$BLOCKERS"
	exit 1
fi
printf '\n  Ready: install.sh would proceed.\n'
exit 0
