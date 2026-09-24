# Today's calls in the central brain

Status: ready to install. Nothing on the droplet has been changed yet.

## What it does

The central brain on the DigitalOcean droplet has a Command page with a menu:
Dashboard, Ads Brain, Call desk. This adds one more link, **Today's calls**,
next to Dashboard. It opens the Call Closer in the LeadFlow back office:

    https://www.theleadflowpro.com/admin/call-sheet/next

That page picks the next person to call, opens their call card, and after
each save offers the next call. The back office stays on Vercel. Calls are
logged there through the signed-in person's own permissions, the same as on
a phone. The first time, you sign in to the back office once in that browser.

The installer changes one static file, `public/command.html`. It does not
read or write lead data, does not touch `server.js`, the database, the Ads
Brain timer or any secret, and sends nothing to anyone.

## Install

On the droplet, as root, from a checkout of this repository:

```bash
sudo sh deploy/call-closer/install.sh
```

What it does, in order:

1. Stops with no changes if `/opt/brain/public/command.html` is missing.
2. Stops with no changes if the link is already there, so running it twice
   is safe.
3. Stops with no changes unless the Dashboard link appears exactly once, so
   it never edits a page it does not recognise. In that case it prints the
   address to add by hand.
4. Copies the page to `command.html.bak.call-closer-<time>`.
5. Adds the link right after Dashboard, checks that it landed exactly once,
   and only then replaces the page.

The page is served as a file, so there is nothing to restart. Reload
Command and the link is there.

## Undo

Copy the printed backup over `public/command.html`:

```bash
sudo cp -p /opt/brain/public/command.html.bak.call-closer-<time> /opt/brain/public/command.html
```

## Why a link and not a copy

The brain reads LeadFlow through the read-only `tlfp_reader` role and, by
its own rules, never writes to Supabase. Logging a call writes a note, a
stage and a follow-up time, so it belongs in the back office, where every
write is checked on the server. A link keeps one Call Closer, with one set
of rules and one history, reachable from both places.

If the brain's own Call desk should show the list inline instead of linking
out, that needs the brain's source code in a repository this project can
read. It is not in either repository today.
