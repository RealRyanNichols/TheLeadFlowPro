#!/usr/bin/env sh
# Retired September 24, 2026. The Content Command worker ships with the site:
# see deploy/droplet/install.sh and docs/infrastructure/droplet.md.
#
# This script used to turn the firewall on with only SSH allowed, which would
# block HTTPS for the central brain and the site on the shared droplet.
echo "Retired. Use deploy/droplet/install.sh (docs/infrastructure/droplet.md)." >&2
exit 1
