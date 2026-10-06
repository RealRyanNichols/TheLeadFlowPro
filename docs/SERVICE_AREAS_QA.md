# Service-area QA — October 3, 2026

## Droplet persistence verification

The focused command passed all 31 tests:

```bash
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs --test tests/service-areas.test.ts tests/service-area-inquiry-retry.test.ts tests/service-area-store.test.ts tests/service-area-http.test.ts
```

Coverage includes summed-radius overlaps; shared services across industries; state borders; nationwide scope; unresolved commitments; non-reserving interest; expiration; anonymous projection; public-scope inflation rejection; identical retries; fresh IDs for corrections; and separate private publication consent.

Private-store tests use temporary directories and synthetic data only. They verify 0700/0600 permissions, idempotent initialization, disk reload, simultaneous operator revision conflicts, audit snapshots, genuine concurrent child-process writes, retry/dedup under lock, separately preserved corrections, daily limits, no CRM-delivery claim, consent validation under the same lock, and fail-closed behavior for corruption, exposed permissions, symlinks, missing initialization, and interrupted locks.

HTTP tests run the real route handlers with synthetic authenticated/storage boundaries. They verify bounded reads and early cancellation, omitted/false Content-Length headers, UTF-8 byte limits, exact-size acceptance, split multibyte decoding, malformed/failed streams, same-origin and admin denial, honeypot/consent rejection, and preserved private success/CAS/store failure statuses.

No live record, database migration, outbound communication, or ad-platform edit is part of these tests. The feature's persistence/API imports no Supabase client. It reuses only the site's existing authenticated operator boundary.

## Release checks

Scoped formatting/lint and the exact current-source production build must pass before activation. Full-suite totals and deployed acceptance belong in the final release receipt; previous prototype totals and legacy PostgreSQL fixtures do not prove this filesystem backend.

Desktop/mobile visual QA covers industry filtering, local/Texas/U.S. views, zoom/reset, AK/HI insets, form errors, preview no-send behavior, and overflow. Both design-preview routes must return 404 in production. Public production HTML and static assets must exclude private identities, operating bases, source evidence, and bootstrap records.

Hosted acceptance remains: the private directory and systemd writable path, external reviewed commitment initialization, existing sign-in and ordinary-user denial, operator save/reload, a synthetic request through an isolated candidate store, verified anonymous projection/expiration, backup/restore, and the real-domain route after activation. A saved private request is not CRM delivery, contact, payment, or reservation.
