#!/usr/bin/env sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root on the LeadFlow DigitalOcean droplet." >&2
  exit 1
fi

SOURCE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BRAIN_DIR=/opt/brain

for file in ads-brain-worker.js logic.cjs ads.js schema.sql ads-brain.service ads-brain.timer server-registration.patch command-navigation.patch; do
  test -f "$SOURCE_DIR/$file"
done
test -f "$SOURCE_DIR/public/ads.html"
test -f /etc/brain/ads_brain_ed25519
test -f /etc/brain/ads_brain_ed25519.pub

install -m 0755 "$SOURCE_DIR/ads-brain-worker.js" "$BRAIN_DIR/ads-brain-worker.js"
install -m 0644 "$SOURCE_DIR/logic.cjs" "$BRAIN_DIR/ads-brain-logic.cjs"
install -m 0644 "$SOURCE_DIR/ads.js" "$BRAIN_DIR/ads.js"
install -m 0644 "$SOURCE_DIR/public/ads.html" "$BRAIN_DIR/public/ads.html"
install -m 0644 "$SOURCE_DIR/ads-brain.service" /etc/systemd/system/ads-brain.service
install -m 0644 "$SOURCE_DIR/ads-brain.timer" /etc/systemd/system/ads-brain.timer

node --check "$BRAIN_DIR/ads-brain-worker.js"
node --check "$BRAIN_DIR/ads-brain-logic.cjs"
node --check "$BRAIN_DIR/ads.js"

. /etc/brain/env
psql "$BRAIN_URL" -v ON_ERROR_STOP=1 -f "$SOURCE_DIR/schema.sql"

if ! grep -Fq "require('./ads').register" "$BRAIN_DIR/server.js"; then
  stamp=$(date -u +%Y%m%d-%H%M%S)
  cp -p "$BRAIN_DIR/server.js" "$BRAIN_DIR/server.js.bak.ads-brain-$stamp"
  patch -d "$BRAIN_DIR" -p0 < "$SOURCE_DIR/server-registration.patch"
fi
if ! grep -Fq 'href="/ads"' "$BRAIN_DIR/public/command.html"; then
  stamp=$(date -u +%Y%m%d-%H%M%S)
  cp -p "$BRAIN_DIR/public/command.html" "$BRAIN_DIR/public/command.html.bak.ads-brain-$stamp"
  patch -d "$BRAIN_DIR" -p0 < "$SOURCE_DIR/command-navigation.patch"
fi
node --check "$BRAIN_DIR/server.js"

systemctl daemon-reload
systemctl enable --now ads-brain.timer
systemctl restart brain-api.service
systemctl start ads-brain.service

systemctl is-active --quiet brain-api.service
systemctl is-active --quiet ads-brain.timer
curl -fsS http://127.0.0.1:3000/healthz | grep -Fxq ok
echo "Ads Brain installed in observe only mode."
