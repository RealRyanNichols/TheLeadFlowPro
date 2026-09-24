#!/usr/bin/env bash
# Build and start The LeadFlow Pro on the droplet. Run as root:
#
#   sudo /opt/theleadflowpro/deploy/droplet/deploy.sh            # latest main
#   sudo /opt/theleadflowpro/deploy/droplet/deploy.sh <commit>   # a specific commit
#
# 1. Moves the checkout to the requested commit.
# 2. Builds the image. The build runs the same gate as Vercel (calculations,
#    facts, tools, visuals, social, next build); if it fails, nothing changes
#    and the running site keeps serving.
# 3. Starts the new image and waits for /api/health to report the new commit.
#    If it does not within two minutes, it puts the previous image back.
# 4. Checks a handful of pages, then restarts the cron and worker containers
#    so they run the new code. The cron container stays idle until cutover.

set -euo pipefail

APP_DIR="/opt/theleadflowpro"
CONF_DIR="/etc/theleadflowpro"
ENV_FILE="$CONF_DIR/web.env"
SITE="http://127.0.0.1:3100"
REF="${1:-origin/main}"
IMAGE="theleadflowpro-web"

say() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok  %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo $0"
[ -f "$ENV_FILE" ] || die "$ENV_FILE is missing. Run install.sh first."
chmod 600 "$ENV_FILE"

say "Settings"
missing=""
for key in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY CRON_SECRET RESEND_API_KEY UNSUBSCRIBE_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
  grep -qE "^${key}=.+" "$ENV_FILE" || missing="$missing $key"
done
[ -z "$missing" ] || die "Empty in $ENV_FILE:$missing"
ok "required values present (values not shown)"

say "Code"
cd "$APP_DIR"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "$APP_DIR has local edits. Stash or reset them first."
PREV_SHA=$(git rev-parse HEAD)
git fetch -q --depth 50 origin main
git checkout -q --detach "$REF"
# On any failure below, the checkout goes back with the image: the cron
# container reads vercel.json from this checkout every minute.
restore_code() { git -C "$APP_DIR" checkout -q --detach "$PREV_SHA"; }
GIT_SHA=$(git rev-parse --short=7 HEAD)
export GIT_SHA
ok "at $GIT_SHA: $(git log -1 --format=%s)"

COMPOSE=(docker compose -f "$APP_DIR/deploy/droplet/compose.yml")
[ -f "$CONF_DIR/compose-profiles" ] && export COMPOSE_PROFILES="$(tr -d '[:space:]' < "$CONF_DIR/compose-profiles")"

say "Build (runs the full gate; takes several minutes)"
had_previous=0
if docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then
  docker tag "$IMAGE:latest" "$IMAGE:previous"
  had_previous=1
fi
if ! "${COMPOSE[@]}" build web; then
  [ "$had_previous" -eq 1 ] && docker tag "$IMAGE:previous" "$IMAGE:latest"
  restore_code
  die "Build or gate failed. The running site was not touched."
fi
ok "built $IMAGE:latest for $GIT_SHA"

say "Start"
"${COMPOSE[@]}" up -d --no-build web
healthy=0
for _ in $(seq 1 60); do
  if curl -fsS "$SITE/api/health" 2>/dev/null | grep -q "\"commit\":\"$GIT_SHA\""; then healthy=1; break; fi
  sleep 2
done
if [ "$healthy" -ne 1 ]; then
  if [ "$had_previous" -eq 1 ]; then
    docker tag "$IMAGE:previous" "$IMAGE:latest"
    "${COMPOSE[@]}" up -d --no-build web
    restore_code
    die "$GIT_SHA did not come up healthy. Put the previous image back. Logs: docker compose -f $APP_DIR/deploy/droplet/compose.yml logs web"
  fi
  die "$GIT_SHA did not come up healthy. Logs: docker compose -f $APP_DIR/deploy/droplet/compose.yml logs web"
fi
ok "web is serving $GIT_SHA on $SITE"

say "Pages"
failed=""
for path in / /tools /chase-sheet /sellerproof /login /sitemap.xml /robots.txt; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: www.theleadflowpro.com' -H 'X-Forwarded-Proto: https' "$SITE$path")
  printf '   %s  %s\n' "$code" "$path"
  case "$code" in 2* | 3*) ;; *) failed="$failed $path" ;; esac
done
[ -z "$failed" ] || echo "   !! these pages did not answer 2xx/3xx:$failed (the site stays up; look before cutover)"

say "Cron and worker"
"${COMPOSE[@]}" up -d --no-build --force-recreate cron
[ -n "${COMPOSE_PROFILES:-}" ] && "${COMPOSE[@]}" up -d --no-build --force-recreate worker
if [ -f "$CONF_DIR/cron-enabled" ]; then ok "cron is ON (runs the vercel.json schedule)"; else ok "cron is idle until cutover.sh crons-on"; fi

docker image prune -f >/dev/null
printf '\nLive on the droplet: %s\n' "$GIT_SHA"
