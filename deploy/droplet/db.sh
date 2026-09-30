#!/usr/bin/env bash
# The LeadFlow Pro's own database on the droplet: Postgres 17 in a Docker
# container beside the site, backed up every night with a copy in The LeadFlow
# Pro's Google Drive (decided Sep 28, 2026; docs/infrastructure/database.md).
# deploy.sh never starts or restarts it. Run as root:
#
#   db.sh setup           One time. Starts the database (empty), turns on the
#                         nightly backup and the weekly restore check, then
#                         takes and checks a first backup.
#   db.sh drive-link      One time. Links the backups to The LeadFlow Pro's
#                         Google Drive (one Google sign-in, in any browser).
#   db.sh backup          Take a backup now, and copy it to Google Drive. A
#                         timer runs this every night at 3:15 AM Central. The
#                         newest 14 are kept here, 30 days of them in Drive.
#   db.sh restore-check   Restore the newest backup into a scratch copy, check
#                         it, then delete the copy. The live database is not
#                         touched. A timer runs this Sundays at 4:15 AM Central.
#   db.sh restore <file>  Replace the live database with a backup. Saves a
#                         fresh backup first, and asks you to type a phrase.
#   db.sh off             Stop the database and its timers. Keeps the data and
#                         the backups. "db.sh setup" turns it back on.
#   db.sh status          Same as check.sh.

set -euo pipefail
export LC_ALL=C

APP_DIR="/opt/theleadflowpro"
CONF_DIR="/etc/theleadflowpro"
# Root-only folder for the database password and the Google Drive sign-in. No
# container mounts it (the cron container mounts CONF_DIR, so nothing secret
# of the database's goes there).
SECRETS_DIR="/etc/theleadflowpro-db"
PASS_FILE="$SECRETS_DIR/db-password"
BACKUP_DIR="/var/backups/theleadflowpro/db"
CHECK_FILE="$BACKUP_DIR/last-restore-check"
LOCK_FILE="/run/lock/theleadflowpro-db.lock"
VOLUME="theleadflowpro_db-data"
DB="leadflow"
KEEP=14
BACKUP_MIN_FREE_MB=1024
SETUP_MIN_FREE_MB=2048
SETUP_MIN_MEMORY_MB=300
# The Google Drive copy (db.sh drive-link). Its access covers only the files
# it creates, and its sign-in stays in DRIVE_CONF (root only).
DRIVE_CONF="$SECRETS_DIR/rclone.conf"
DRIVE_REMOTE="leadflow-drive"
DRIVE_FOLDER="LeadFlow Pro database backups"
DRIVE_KEEP_DAYS=30
DRIVE_COPY_TIMEOUT=900
DRIVE_FILE="$BACKUP_DIR/last-drive-copy"
DRIVE_LOCK="/run/lock/theleadflowpro-drive-link.lock"
UNITS="theleadflowpro-db-backup.service theleadflowpro-db-backup.timer theleadflowpro-db-restore-check.service theleadflowpro-db-restore-check.timer"
TIMERS="theleadflowpro-db-backup.timer theleadflowpro-db-restore-check.timer"
LAST_BACKUP=""
PRUNE=1
# A backup that takes longer than this has hung (the whole database dumps in
# seconds today), so it stops and frees the lock instead of blocking every
# later backup.
DUMP_TIMEOUT=900
SITE_STOPPED=""

say() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok  %s\n' "$*"; }
note() { printf '   ..  %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo $0 $*"

# The database has its own compose profile, so every command here names it.
COMPOSE=(docker compose -f "$APP_DIR/deploy/droplet/compose.yml" --profile db)
# The site's containers, stopped for the few seconds a restore swaps databases.
SITE=(docker compose -f "$APP_DIR/deploy/droplet/compose.yml" --profile worker)

confirm() {
  local answer=""
  printf '\n   Type %s to continue: ' "$1"
  read -r answer || true
  [ "$answer" = "$1" ] || die "Not confirmed. Nothing changed."
}

free_mb() { df -Pm "$1" | awk 'NR==2 {print $4}'; }
memory_available_mb() { awk '/^MemAvailable:/ {print int($2 / 1024)}' /proc/meminfo; }

db_id() { "${COMPOSE[@]}" ps -q db 2>/dev/null || true; }

db_running() {
  local id
  id=$(db_id)
  [ -n "$id" ] && [ "$(docker inspect -f '{{.State.Running}}' "$id" 2>/dev/null)" = "true" ]
}

wait_healthy() {
  local id status
  for _ in $(seq 1 60); do
    id=$(db_id)
    status=""
    [ -z "$id" ] || status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$id" 2>/dev/null || true)
    [ "$status" = "healthy" ] && return 0
    sleep 2
  done
  return 1
}

# psql inside the container, over its own socket, as the admin account.
# Warnings and errors still show; routine notices ("does not exist, skipping") do not.
sql() { "${COMPOSE[@]}" exec -T -e "PGOPTIONS=-c client_min_messages=warning" db psql -X -q -t -A -v ON_ERROR_STOP=1 -U postgres -d "${2:-postgres}" -c "$1"; }

# Tables listed in a backup, and tables in a database, to compare after a restore.
tables_in_backup() { "${COMPOSE[@]}" exec -T db pg_restore --list < "$1" | awk '$4 == "TABLE" && $5 != "DATA" && $5 != "ATTACH"' | wc -l | tr -d ' '; }
tables_in() { sql "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')" "$1"; }

# One backup or restore at a time (the nightly timer and a manual run can
# meet). Commands that ask for a phrase take it after the phrase, so a prompt
# left open never holds up the nightly backup.
lock() {
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    note "another backup or restore is running; waiting up to 10 minutes"
    flock -w 600 9 || die "Still busy after 10 minutes. Nothing changed. Try again later."
  fi
}

# Backups are named by Central time down to the second, so name order is age order.
backups() {
  local f
  for f in "$BACKUP_DIR"/leadflow-*.dump; do [ -e "$f" ] && printf '%s\n' "$f"; done
  return 0
}

newest_backup() { backups | tail -n 1; }

backup_name() { printf '%s/leadflow-%s.dump' "$BACKUP_DIR" "$(TZ=America/Chicago date +%Y-%m-%d-%H%M%S)"; }

# Every failure below stops with die, and every step is checked on its own, so
# this also behaves when it runs inside an "if" (where bash ignores set -e).
do_backup() {
  db_running || die "The database is not running (db.sh setup starts it). No backup was taken."
  install -d -m 700 "$BACKUP_DIR" || die "Could not create $BACKUP_DIR. No backup was taken."
  local free file tmp
  free=$(free_mb "$BACKUP_DIR") || die "Could not read the free disk space. No backup was taken."
  [ "$free" -ge "$BACKUP_MIN_FREE_MB" ] || die "Only $free MB free for backups; $BACKUP_MIN_FREE_MB MB needed. No backup was taken, and the older ones are untouched."
  # A name is never reused: an existing backup is never overwritten.
  file=$(backup_name)
  while [ -e "$file" ]; do sleep 1; file=$(backup_name); done
  tmp="$file.partial"
  rm -f "$BACKUP_DIR"/*.partial
  if ! timeout "$DUMP_TIMEOUT" "${COMPOSE[@]}" exec -T db pg_dump --lock-wait-timeout=120s -U postgres -d "$DB" -Fc > "$tmp"; then
    rm -f "$tmp"
    die "The backup failed, or took longer than $((DUMP_TIMEOUT / 60)) minutes. The older backups are untouched."
  fi
  # A quick check that the file is whole enough to list its contents. The
  # Sunday restore check is the full proof: it restores the newest backup.
  if ! timeout 300 "${COMPOSE[@]}" exec -T db pg_restore --list < "$tmp" > /dev/null; then
    rm -f "$tmp"
    die "The new backup did not read back, so it was deleted. The older backups are untouched."
  fi
  if ! { chmod 600 "$tmp" && mv "$tmp" "$file"; }; then
    rm -f "$tmp"
    die "Could not save the backup file. The older backups are untouched."
  fi
  LAST_BACKUP="$file"
  if [ "$PRUNE" -eq 1 ]; then
    local all=() i
    mapfile -t all < <(backups)
    for ((i = 0; i < ${#all[@]} - KEEP; i++)); do rm -f -- "${all[$i]}"; done
    ok "saved $(basename "$file") ($(du -h "$file" | cut -f1)); keeping the newest $KEEP in $BACKUP_DIR"
  else
    ok "saved $(basename "$file") ($(du -h "$file" | cut -f1)); older backups stay until the next nightly backup"
  fi
}

drive_linked() { command -v rclone > /dev/null 2>&1 && [ -f "$DRIVE_CONF" ] && grep -q '^token = ' "$DRIVE_CONF"; }

record_drive() {
  install -d -m 700 "$BACKUP_DIR"
  printf '%s %s %s\n' "$1" "$(TZ=America/Chicago date '+%Y-%m-%d %H:%M CT')" "$2" > "$DRIVE_FILE"
}

# Copies one backup to Google Drive, then removes Drive copies older than
# DRIVE_KEEP_DAYS (they go to Drive's trash, which Google empties after 30
# days). rclone checks the size and checksum of what it uploads. A failed copy
# leaves the backup on this droplet as it is.
do_drive_copy() {
  local file="$1" name
  name=$(basename "$file")
  if ! drive_linked; then
    note "Google Drive copy: not linked yet (db.sh drive-link)"
    return 0
  fi
  if ! timeout "$DRIVE_COPY_TIMEOUT" rclone --config "$DRIVE_CONF" copyto "$file" "$DRIVE_REMOTE:$DRIVE_FOLDER/$name" --retries 3 --low-level-retries 10; then
    record_drive FAILED "$name"
    die "The backup is saved on this droplet, but its Google Drive copy failed. The next backup tries again."
  fi
  record_drive ok "$name"
  ok "copied $name to Google Drive (\"$DRIVE_FOLDER\")"
  timeout 300 rclone --config "$DRIVE_CONF" delete "$DRIVE_REMOTE:$DRIVE_FOLDER" --max-depth 1 --include 'leadflow-*.dump' --min-age "${DRIVE_KEEP_DAYS}d" ||
    note "could not remove Drive copies older than $DRIVE_KEEP_DAYS days; the next backup tries again"
}

# Installs rclone from Ubuntu's packages. NEEDRESTART_SUSPEND keeps Ubuntu's
# package tools from restarting the droplet's other services along the way.
install_rclone() {
  local out apt=(env NEEDRESTART_SUSPEND=1 DEBIAN_FRONTEND=noninteractive apt-get -y -q)
  out=$(mktemp)
  if "${apt[@]}" install --no-install-recommends rclone > "$out" 2>&1; then rm -f "$out"; return 0; fi
  if "${apt[@]}" update > "$out" 2>&1 && "${apt[@]}" install --no-install-recommends rclone > "$out" 2>&1; then rm -f "$out"; return 0; fi
  tail -n 5 "$out" >&2
  rm -f "$out"
  return 1
}

record_check() {
  install -d -m 700 "$BACKUP_DIR"
  printf '%s %s %s (%s)\n' "$1" "$(TZ=America/Chicago date '+%Y-%m-%d %H:%M CT')" "${2:+$(basename "$2")}" "$3" > "$CHECK_FILE"
}

# Record a failed check (so check.sh shows it), then stop.
check_failed() { record_check FAILED "$1" "$2"; die "$3"; }

do_restore_check() {
  local file expected got
  file=$(newest_backup)
  [ -n "$file" ] || check_failed "" "no backup yet" "No backup to check yet. Take one: db.sh backup"
  db_running || check_failed "$file" "database not running" "The database is not running (db.sh setup starts it)."
  expected=$(tables_in_backup "$file") || check_failed "$file" "did not read back" "$(basename "$file") did not read back. The live database is untouched. Send this output to Claude."
  { sql "DROP DATABASE IF EXISTS restore_check WITH (FORCE)" && sql "CREATE DATABASE restore_check"; } ||
    check_failed "$file" "could not make the scratch copy" "Could not make the scratch copy (is the disk full?). The live database is untouched."
  if ! "${COMPOSE[@]}" exec -T db pg_restore -U postgres -d restore_check --exit-on-error --no-owner < "$file"; then
    sql "DROP DATABASE IF EXISTS restore_check WITH (FORCE)" || true
    check_failed "$file" "did not restore" "$(basename "$file") did not restore. The live database is untouched. Send this output to Claude."
  fi
  got=$(tables_in restore_check) || got="?"
  sql "DROP DATABASE IF EXISTS restore_check WITH (FORCE)" || note "the scratch copy restore_check is left over; the next check removes it"
  [ "$got" = "$expected" ] ||
    check_failed "$file" "$got of $expected tables" "$(basename "$file") restored only $got of its $expected tables. The live database is untouched. Send this output to Claude."
  record_check ok "$file" "$got tables"
  ok "$(basename "$file") restores cleanly ($got tables); the scratch copy is deleted"
}

# Starts again whatever a restore stopped. Also runs if the restore stops early.
start_site_again() {
  [ -n "$SITE_STOPPED" ] || return 0
  # shellcheck disable=SC2086 # a list of service names
  if "${SITE[@]}" start $SITE_STOPPED; then
    ok "started again: $SITE_STOPPED"
  else
    printf '\n!! Could not start %s again. Run: docker compose -f %s start %s\n' "$SITE_STOPPED" "$APP_DIR/deploy/droplet/compose.yml" "$SITE_STOPPED" >&2
  fi
  SITE_STOPPED=""
}

do_restore() {
  local file="${1:-}"
  [ -n "$file" ] && [ -f "$file" ] || die "Say which backup: db.sh restore <file>. They are in $BACKUP_DIR."
  db_running || die "The database is not running (db.sh setup starts it)."
  "${COMPOSE[@]}" exec -T db pg_restore --list < "$file" > /dev/null 2>&1 || die "$file is not a readable backup. Nothing changed."
  # Held open from here on, so a nightly backup that rotates this file out
  # while the prompt waits cannot take it away from the restore.
  exec 8< "$file"
  cat <<EOF
   This replaces the whole live database with $(basename "$file").
   First it saves a backup of what is there now (the undo). Then it builds the
   restored copy beside the live one and swaps the two, so the site, the
   scheduled jobs and the worker stop only for the swap, a few seconds. The
   replaced database is kept as ${DB}_before_restore until the next restore.
EOF
  confirm "REPLACE THE DATABASE"
  lock
  [ -e "$file" ] || note "$(basename "$file") was rotated out by a backup that ran meanwhile; restoring the copy opened before the prompt"
  say "Backup of the database as it is now (the undo)"
  # No pruning here: the backup being restored may be the oldest one kept.
  PRUNE=0
  do_backup
  local undo="$LAST_BACKUP" running
  say "Restore into a copy beside the live database"
  sql "DROP DATABASE IF EXISTS ${DB}_restoring WITH (FORCE)"
  sql "CREATE DATABASE ${DB}_restoring"
  if ! "${COMPOSE[@]}" exec -T db pg_restore -U postgres -d "${DB}_restoring" --exit-on-error <&8; then
    sql "DROP DATABASE IF EXISTS ${DB}_restoring WITH (FORCE)" || true
    die "$(basename "$file") did not restore, so nothing was swapped. The live database is unchanged."
  fi
  ok "restored into ${DB}_restoring ($(tables_in "${DB}_restoring") tables)"
  say "Swap"
  # Clear the way before anything stops, so a failure here leaves the site running.
  sql "DROP DATABASE IF EXISTS ${DB}_before_restore WITH (FORCE)" ||
    die "Could not clear the old ${DB}_before_restore, so nothing was swapped. The live database is unchanged."
  running=$("${SITE[@]}" ps --status running --services 2>/dev/null | grep -xE 'web|cron|worker' | paste -sd' ' - || true)
  if [ -n "$running" ]; then
    SITE_STOPPED="$running"
    trap start_site_again EXIT
    # shellcheck disable=SC2086 # a list of service names
    "${SITE[@]}" stop $running
  fi
  sql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB' AND pid <> pg_backend_pid()" > /dev/null
  # One transaction: the site's database is never missing, even for a moment.
  sql "BEGIN; ALTER DATABASE $DB RENAME TO ${DB}_before_restore; ALTER DATABASE ${DB}_restoring RENAME TO $DB; COMMIT;" ||
    die "The swap failed, so the live database is unchanged. The restored copy is ${DB}_restoring. Send this output to Claude."
  start_site_again
  trap - EXIT
  ok "the live database is now $(basename "$file")"
  ok "undo: db.sh restore $undo (the replaced database is also kept as ${DB}_before_restore)"
}

do_off() {
  cat <<EOF
   This stops the database and its timers. The data stays in its Docker
   volume and the backups stay in $BACKUP_DIR; "db.sh setup" turns it back
   on. Once the site reads the database (phase B on), the parts that use it
   stop working while it is off.
EOF
  confirm "TURN THE DATABASE OFF"
  lock
  if db_running; then
    say "Final backup"
    # Waits at most two minutes: the data stays in the volume either way.
    DUMP_TIMEOUT=120
    if ! (do_backup); then
      note "no last backup (see above). Turning off anyway: the data stays in the volume, and the earlier backups are kept"
    fi
  fi
  say "Stop"
  # shellcheck disable=SC2086 # a list of unit names
  systemctl disable --now $TIMERS > /dev/null 2>&1 || true
  "${COMPOSE[@]}" stop db
  "${COMPOSE[@]}" rm -f db > /dev/null
  ok "the database is off. Its data is kept in the Docker volume $VOLUME, and the backups in $BACKUP_DIR"
}

do_drive_link() {
  cat <<EOF
   This links the nightly backups to The LeadFlow Pro's Google Drive. After
   each backup, a copy goes to the folder "$DRIVE_FOLDER" there, and copies
   older than $DRIVE_KEEP_DAYS days are removed from it. It needs one Google
   sign-in, as The LeadFlow Pro's account, in any browser. The access it asks
   for covers only the files this link creates, and the sign-in stays on this
   droplet ($DRIVE_CONF, root only).
EOF
  confirm "LINK GOOGLE DRIVE"
  # One link at a time. The backup lock is taken only at the very end, so a
  # sign-in left open never holds up the nightly backup.
  exec 7>"$DRIVE_LOCK"
  flock -n 7 || die "Another db.sh drive-link is running. Finish or close it first."
  if ! command -v rclone > /dev/null 2>&1; then
    say "Installing rclone (it copies files to Google Drive)"
    install_rclone || die "Could not install rclone. Nothing changed."
  fi
  install -d -m 700 "$SECRETS_DIR"
  DRIVE_NEW="$DRIVE_CONF.new"
  # Leftovers of a try that was killed outright (they may hold a sign-in).
  rm -f "$SECRETS_DIR"/.drive-link.* "$DRIVE_NEW"*
  local url google back waited=0
  # The new link is made in a file of its own and replaces an earlier link
  # only once it works. rclone's output repeats the sign-in, so it goes to a
  # root-only file that is deleted as soon as rclone finishes. rclone gives up
  # after 20 minutes even if this script is killed, and holds none of its locks.
  DRIVE_LOG=$(mktemp -p "$SECRETS_DIR" .drive-link.XXXXXX)
  (umask 077 && exec timeout 1200 rclone --config "$DRIVE_NEW" config create "$DRIVE_REMOTE" drive scope drive.file config_is_local true > "$DRIVE_LOG" 2>&1 7>&- 9>&-) &
  DRIVE_PID=$!
  # "|| true": under set -e a failed kill (rclone already gone) would end the
  # trap before the clean-up.
  trap 'kill "$DRIVE_PID" 2>/dev/null || true; wait "$DRIVE_PID" 2>/dev/null || true; rm -f "$DRIVE_LOG" "$DRIVE_NEW"*' EXIT
  for _ in $(seq 1 20); do
    url=$(grep -oE 'http://127\.0\.0\.1:53682/auth\?state=[A-Za-z0-9_-]+' "$DRIVE_LOG" | head -n 1 || true)
    [ -n "$url" ] && break
    sleep 1
  done
  if [ -z "$url" ]; then
    # No sign-in exists yet, so rclone's own reason is safe to show.
    sed 's/^/   rclone: /' "$DRIVE_LOG" | tail -n 5 >&2
    die "The Google sign-in did not start. Nothing was linked."
  fi
  google=$(curl -s -o /dev/null -w '%{redirect_url}' "$url" || true)
  case "$google" in
    https://accounts.google.com/*"scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&"*) ;;
    *) die "The Google sign-in did not ask for the narrow access this link needs, so nothing was linked. Send this output to Claude." ;;
  esac
  cat <<EOF

   1. Open this link in a browser, on any computer or phone, and sign in as
      The LeadFlow Pro's Google account (hello@theleadflowpro.com):

$google

   2. Press Allow. The browser then shows a page that does not load, with an
      address starting http://127.0.0.1:53682/. That is expected.
   3. Copy that whole address from the address bar, paste it here and press
      Enter within 15 minutes. It is not shown on screen.

EOF
  printf '   Address: '
  read -rs -t 900 back || back=""
  printf '\n'
  [[ "$back" =~ ^http://127\.0\.0\.1:53682/\?[A-Za-z0-9._~%/+=\&-]+$ ]] ||
    die "That is not the address from the sign-in, so nothing was linked. Run db.sh drive-link again."
  # Handed to curl on its standard input, so the one-time code never shows in
  # the droplet's process list.
  printf 'url = "%s"\n' "$back" | curl -s -o /dev/null --max-time 60 -K - || true
  while kill -0 "$DRIVE_PID" 2>/dev/null && [ "$waited" -lt 60 ]; do sleep 1; waited=$((waited + 1)); done
  kill "$DRIVE_PID" 2>/dev/null || true
  wait "$DRIVE_PID" 2>/dev/null || true
  rm -f "$DRIVE_LOG"
  grep -q '^token = ' "$DRIVE_NEW" 2>/dev/null ||
    die "Google did not accept the sign-in, so nothing was linked. Run db.sh drive-link again."
  chmod 600 "$DRIVE_NEW"
  say "Checking the link"
  rclone --config "$DRIVE_NEW" mkdir "$DRIVE_REMOTE:$DRIVE_FOLDER" ||
    die "Google accepted the sign-in, but the folder \"$DRIVE_FOLDER\" could not be made in Google Drive, so nothing was linked. Send this output to Claude."
  # Swapped in under the backup lock, so no backup is copying meanwhile.
  lock
  mv -f "$DRIVE_NEW" "$DRIVE_CONF"
  trap - EXIT
  drive_linked || die "The link was saved but rclone cannot use it. Send this output to Claude."
  ok "linked: backups will be copied to \"$DRIVE_FOLDER\" in The LeadFlow Pro's Google Drive"
  local newest
  newest=$(newest_backup)
  if [ -n "$newest" ]; then do_drive_copy "$newest"; fi
}

do_setup() {
  [ -f "$CONF_DIR/web.env" ] || die "$CONF_DIR/web.env is missing. Run install.sh first."
  docker compose version > /dev/null 2>&1 || die "docker compose is missing. Run install.sh first."
  command -v systemctl > /dev/null 2>&1 || die "systemd is missing; the backup timers need it. Nothing changed."
  local free memory existing=0
  free=$(free_mb "$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || echo /)")
  memory=$(memory_available_mb)
  docker volume inspect "$VOLUME" > /dev/null 2>&1 && existing=1
  [ "$free" -ge "$SETUP_MIN_FREE_MB" ] || die "Only $free MB of disk free; the database and its backups need $SETUP_MIN_FREE_MB MB. Nothing changed."
  [ "$memory" -ge "$SETUP_MIN_MEMORY_MB" ] || die "Only $memory MB of memory available; the database needs $SETUP_MIN_MEMORY_MB MB. Nothing changed. Free some memory, or resize the droplet, first."
  if [ "$existing" -eq 1 ]; then
    cat <<EOF
   This turns The LeadFlow Pro's database back on, with the data it
   already has (Docker volume $VOLUME), along with its nightly
   backup and weekly restore check.
   ($free MB of disk free, $memory MB of memory available.)
EOF
  else
    cat <<EOF
   This creates The LeadFlow Pro's own database on this droplet:
     - Postgres 17 in a container named db. No port is opened on the
       droplet, so the internet cannot reach it.
     - A password in $PASS_FILE (root only, never shown).
     - A backup every night at 3:15 AM Central; the newest $KEEP are kept in
       $BACKUP_DIR.
     - A restore check every Sunday at 4:15 AM Central.
   It starts empty. Nothing in the site uses it yet, and the brain's own
   database is not touched. ($free MB of disk free, $memory MB of memory available.)
EOF
  fi
  confirm "CREATE THE DATABASE"
  lock

  say "Password"
  install -d -m 700 "$SECRETS_DIR"
  if [ -s "$PASS_FILE" ]; then
    ok "kept the existing $PASS_FILE"
  else
    (umask 077 && od -An -N24 -tx1 /dev/urandom | tr -d ' \n' > "$PASS_FILE")
    ok "created $PASS_FILE (not shown)"
  fi
  chown root:root "$PASS_FILE"
  chmod 600 "$PASS_FILE"

  say "Database"
  "${COMPOSE[@]}" up -d db || die "The database did not start (see the lines above; often the image download). The password file is kept for the next try."
  wait_healthy || die "The database did not report healthy within two minutes. Logs: docker compose -f $APP_DIR/deploy/droplet/compose.yml --profile db logs db"
  ok "running Postgres $(sql 'SHOW server_version'), database $DB ($(sql "SELECT pg_size_pretty(pg_database_size('$DB'))"))"

  say "Timers"
  local unit
  for unit in $UNITS; do install -m 644 "$APP_DIR/deploy/droplet/systemd/$unit" "/etc/systemd/system/$unit"; done
  systemctl daemon-reload
  # shellcheck disable=SC2086 # a list of unit names
  systemctl enable --now $TIMERS
  ok "nightly backup (3:15 AM Central) and Sunday restore check (4:15 AM Central) are on"

  say "Backup"
  do_backup
  say "Restore check (the live database is not touched)"
  do_restore_check
  if drive_linked; then
    say "Google Drive copy"
    (do_drive_copy "$LAST_BACKUP") || note "the Google Drive copy failed; the backup is on this droplet, and tonight's backup tries again"
  else
    note "Google Drive copy: not linked yet (db.sh drive-link)"
  fi

  if [ "$existing" -eq 1 ]; then
    printf '\nDone. The database is back on, with its data, and backed up.\n'
  else
    printf '\nDone. The database is running, empty, and backed up. Nothing in the site uses\nit yet.\n'
  fi
  printf 'Check on it any time: sudo %s/deploy/droplet/check.sh\n' "$APP_DIR"
}

case "${1:-}" in
  setup) say "Set up the database"; do_setup ;;
  backup) lock; say "Backup"; do_backup; do_drive_copy "$LAST_BACKUP" ;;
  drive-link) say "Link the backups to Google Drive"; do_drive_link ;;
  restore-check) lock; say "Restore check (the live database is not touched)"; do_restore_check ;;
  restore) say "Restore"; do_restore "${2:-}" ;;
  off) say "Turn the database off (the data and backups are kept)"; do_off ;;
  status) exec "$APP_DIR/deploy/droplet/check.sh" ;;
  *) sed -n '2,22p' "$0"; exit 2 ;;
esac
