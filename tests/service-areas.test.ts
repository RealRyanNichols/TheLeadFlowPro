import test from "node:test";
import assert from "node:assert/strict";
import {
  competing,
  conflicts,
  destination,
  distanceMiles,
  geographyOverlap,
  inquiryGeometry,
  publicTerritories,
  validateGeometry,
  validateInquiry,
  validateRegistry,
  type Registry,
  type Territory,
} from "../lib/service-areas/engine.ts";

const now = new Date("2026-10-03T12:00:00Z"),
  tyler = { lat: 32.3513, lng: -95.3011 };
const territory = (p: Partial<Territory> = {}): Territory => ({
  id: "a",
  clientName: "Private client",
  industry: "farm-ag",
  services: ["land-clearing", "earthwork"],
  exclusivity: "industry",
  stage: "protected",
  geometry: { kind: "radius", center: tyler, miles: 35 },
  centerVerified: true,
  publicGeometry: { kind: "radius", center: tyler, miles: 35 },
  publicRegion: "Tyler area",
  publicApproved: false,
  publicConsent: "",
  evidence: "Private agreement reference",
  notes: "Private operating notes",
  expiresAt: null,
  inquiryId: null,
  adRadiusMiles: null,
  adTargetingVerified: false,
  ...p,
});
test("radii cannot overlap just because a competing business is outside the first center's radius", () => {
  const a = territory(),
    b = territory({
      id: "b",
      geometry: {
        kind: "radius",
        center: destination(tyler, 60, 90),
        miles: 35,
      },
      publicGeometry: null,
    });
  assert.ok(
    distanceMiles(tyler, (b.geometry as { center: typeof tyler }).center) > 35,
  );
  assert.equal(conflicts(b, [a], now)[0].blocking, true);
  assert.throws(
    () => validateRegistry({ version: 1, territories: [a, b] }, now),
    /conflicts/,
  );
});
test("shrinking 50 to 35 can release an outer area but still checks both client radii", () => {
  const candidate = territory({
    id: "b",
    geometry: { kind: "radius", center: destination(tyler, 60, 90), miles: 20 },
    publicGeometry: null,
  });
  assert.equal(
    conflicts(
      candidate,
      [territory({ geometry: { kind: "radius", center: tyler, miles: 50 } })],
      now,
    ).length,
    1,
  );
  assert.equal(conflicts(candidate, [territory()], now).length, 0);
});
test("different trades can share geography; earthmoving competes across category names", () => {
  assert.equal(
    competing(
      territory(),
      territory({ industry: "electrical", services: ["electrical"] }),
    ),
    false,
  );
  assert.equal(
    competing(
      territory(),
      territory({ industry: "oil-gas", services: ["earthwork"] }),
    ),
    true,
  );
  assert.equal(
    competing(
      territory({ services: ["hay"] }),
      territory({ services: ["ponds"] }),
    ),
    true,
  );
  assert.equal(
    competing(
      territory({ exclusivity: "services", services: ["hay"] }),
      territory({ exclusivity: "services", services: ["ponds"] }),
    ),
    false,
  );
});
test("statewide and national scope restricts local competitors, including a radius crossing a state border", () => {
  assert.equal(
    geographyOverlap(
      { kind: "states", states: ["TX"] },
      { kind: "radius", center: tyler, miles: 35 },
    ),
    "overlap",
  );
  assert.equal(
    geographyOverlap(
      { kind: "states", states: ["LA"] },
      { kind: "radius", center: tyler, miles: 10 },
    ),
    "separate",
  );
  assert.equal(
    geographyOverlap(
      { kind: "states", states: ["LA"] },
      { kind: "radius", center: { lat: 32.5075, lng: -94.045 }, miles: 25 },
    ),
    "overlap",
  );
  assert.equal(
    geographyOverlap(
      { kind: "national" },
      { kind: "states", states: ["AK", "HI"] },
    ),
    "overlap",
  );
  assert.equal(
    geographyOverlap(
      { kind: "states", states: ["TX"] },
      { kind: "states", states: ["LA"] },
    ),
    "separate",
  );
});
test("unknown existing agreements fail closed and cannot be bypassed by renamed industries with matching services", () => {
  const pending = territory({
    id: "pending",
    stage: "review",
    geometry: { kind: "unknown" },
    centerVerified: false,
  });
  assert.equal(conflicts(territory(), [pending], now)[0].overlap, "review");
  assert.throws(
    () =>
      validateRegistry(
        { version: 1, territories: [pending, territory()] },
        now,
      ),
    /conflicts/,
  );
});
test("interest is not a reservation and expired holds release their restriction", () => {
  const interest = territory({
    id: "interest",
    stage: "interest",
    expiresAt: "2026-10-20T12:00:00Z",
  });
  assert.equal(conflicts(territory(), [interest], now)[0].blocking, false);
  assert.doesNotThrow(() =>
    validateRegistry({ version: 1, territories: [interest, territory()] }, now),
  );
  const old = territory({
    id: "old",
    stage: "held",
    expiresAt: "2026-10-02T12:00:00Z",
  });
  assert.equal(conflicts(territory(), [old], now).length, 0);
});
test("public projection excludes private bases, names, notes, evidence, and ad settings", () => {
  const t = territory({
    id: "private-client-id",
    publicApproved: true,
    publicConsent: "Approved anonymous display",
    geometry: { kind: "radius", center: destination(tyler, 2, 90), miles: 35 },
  });
  const result = publicTerritories({ version: 1, territories: [t] }, now);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].geometry, t.publicGeometry);
  for (const word of [
    "private-client-id",
    "Private client",
    "Private operating notes",
    "Private agreement reference",
    "adRadiusMiles",
    "centerVerified",
    "publicConsent",
  ])
    assert.equal(JSON.stringify(result).includes(word), false);
  assert.equal(
    publicTerritories({ version: 1, territories: [territory()] }, now).length,
    0,
  );
});
test("expired, released and unconfirmed records never create public scarcity", () => {
  const common = { publicApproved: true, publicConsent: "Approved display" };
  const registry: Registry = {
    version: 1,
    territories: [
      territory({
        ...common,
        stage: "held",
        expiresAt: "2026-10-02T12:00:00Z",
      }),
      territory({ ...common, id: "b", stage: "released" }),
      territory({ ...common, id: "c", stage: "review" }),
    ],
  };
  assert.equal(publicTerritories(registry, now).length, 0);
});
test("protection requires a verified base and evidence; temporary holds need expiration", () => {
  assert.throws(
    () =>
      validateRegistry(
        { version: 1, territories: [territory({ centerVerified: false })] },
        now,
      ),
    /Verify/,
  );
  assert.throws(
    () =>
      validateRegistry(
        { version: 1, territories: [territory({ evidence: "" })] },
        now,
      ),
    /evidence/,
  );
  assert.throws(
    () =>
      validateRegistry(
        { version: 1, territories: [territory({ stage: "held" })] },
        now,
      ),
    /expiration/,
  );
  assert.throws(
    () =>
      validateRegistry(
        {
          version: 1,
          territories: [territory({ publicApproved: true, publicConsent: "" })],
        },
        now,
      ),
    /permission/,
  );
});
test("invalid shapes, NaN, unknown states and ocean operating bases are rejected", () => {
  assert.throws(() => validateGeometry({ kind: "states", states: ["XX"] }));
  assert.throws(() =>
    validateGeometry({ kind: "radius", center: tyler, miles: NaN }),
  );
  assert.throws(() =>
    validateGeometry({
      kind: "radius",
      center: { lat: 25, lng: -80 },
      miles: 35,
    }),
  );
  assert.throws(() =>
    validateGeometry({ kind: "radius", center: tyler, miles: 0 }),
  );
});
test("a public display cannot turn a local agreement into statewide or larger-radius protection", () => {
  assert.throws(
    () =>
      validateRegistry(
        {
          version: 1,
          territories: [
            territory({ publicGeometry: { kind: "states", states: ["TX"] } }),
          ],
        },
        now,
      ),
    /agreed scope/,
  );
  assert.throws(
    () =>
      validateRegistry(
        {
          version: 1,
          territories: [
            territory({
              publicGeometry: { kind: "radius", center: tyler, miles: 50 },
            }),
          ],
        },
        now,
      ),
    /agreed scope/,
  );
  assert.doesNotThrow(() =>
    validateRegistry(
      {
        version: 1,
        territories: [
          territory({
            publicGeometry: {
              kind: "radius",
              center: destination(tyler, 2, 90),
              miles: 35,
            },
          }),
        ],
      },
      now,
    ),
  );
});
const inquiry = {
  requestId: "12345678-1234-4234-8234-123456789012",
  name: "Test operator",
  business: "Test business",
  email: "operator@example.com",
  industry: "farm-ag",
  services: ["hay"],
  market: "Tyler, TX",
  scope: "local",
  states: [],
  miles: 35,
  publicConsent: false,
  contactConsent: true,
};
test("area inquiries require contact consent, reject invented services, and do not opt into public display by default", () => {
  assert.equal(validateInquiry(inquiry).publicConsent, false);
  assert.throws(
    () => validateInquiry({ ...inquiry, contactConsent: false }),
    /permission/,
  );
  assert.throws(
    () => validateInquiry({ ...inquiry, services: ["mortgage"] }),
    /services/,
  );
  assert.deepEqual(inquiryGeometry(validateInquiry(inquiry)), {
    kind: "radius",
    center: tyler,
    miles: 35,
  });
  assert.deepEqual(
    inquiryGeometry(validateInquiry({ ...inquiry, market: "Another market" })),
    { kind: "unknown" },
  );
});
