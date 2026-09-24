#!/usr/bin/env sh
# Adds a "Today's calls" link to the central brain's Command menu on the
# DigitalOcean droplet, next to Dashboard, Ads Brain and Call desk. The link
# opens the Call Closer in the LeadFlow back office, which stays on Vercel:
# calls are logged there, through the signed-in person's own permissions.
# Nothing here reads or writes lead data, and nothing is sent to anyone.
#
# Run as root on the droplet from a checkout of this repository:
#   sudo sh deploy/call-closer/install.sh
#
# Safe to run twice: it does nothing when the link is already there, keeps a
# timestamped copy of command.html before changing it, and puts that copy
# back if the result is not exactly one new link. To undo it, copy the
# printed backup over public/command.html.
set -eu

if [ "$(id -u)" -ne 0 ] && [ "${CALL_CLOSER_LINK_TEST:-}" != "1" ]; then
  echo "Run this installer as root on the LeadFlow DigitalOcean droplet." >&2
  exit 1
fi

BRAIN_DIR=${BRAIN_DIR:-/opt/brain}
PAGE="$BRAIN_DIR/public/command.html"
TARGET="https://www.theleadflowpro.com/admin/call-sheet/next"
ANCHOR='<a href="/dashboard">Dashboard</a>'
LINK="<a href=\"$TARGET\" rel=\"noopener\">Today\&#39;s calls</a>"

if [ ! -f "$PAGE" ]; then
  echo "No command page at $PAGE. Nothing changed." >&2
  exit 1
fi

if grep -Fq "href=\"$TARGET\"" "$PAGE"; then
  echo "Today's calls is already in the Command menu. Nothing changed."
  exit 0
fi

anchors=$(grep -Fo "$ANCHOR" "$PAGE" | wc -l | tr -d ' ')
if [ "$anchors" != "1" ]; then
  echo "Expected the Dashboard link exactly once in $PAGE, found $anchors. Nothing changed." >&2
  echo "Add this link to the Command menu by hand instead: $TARGET" >&2
  exit 1
fi

stamp=$(date -u +%Y%m%d-%H%M%S)
backup="$PAGE.bak.call-closer-$stamp"
cp -p "$PAGE" "$backup"

sed "s|$ANCHOR|$ANCHOR$LINK|" "$backup" > "$PAGE.tmp"
added=$(grep -Fo "href=\"$TARGET\"" "$PAGE.tmp" | wc -l | tr -d ' ')
if [ "$added" != "1" ]; then
  rm -f "$PAGE.tmp"
  echo "The link did not land exactly once. $PAGE is unchanged." >&2
  exit 1
fi
cat "$PAGE.tmp" > "$PAGE"
rm -f "$PAGE.tmp"

echo "Today's calls added to the Command menu."
echo "Backup: $backup"
echo "The page is a static file, so there is nothing to restart. Reload Command to see it."
