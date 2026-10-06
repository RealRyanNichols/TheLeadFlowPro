import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET as contentOffer } from "../app/offers/power-bundle/route.ts";
import { GET as operatorOffer } from "../app/offers/monthly-operator/route.ts";
import { GET as leaderboard } from "../app/leaderboard/route.ts";
import { GET as leadAudit } from "../app/lead-leak-audit/route.ts";
import { GET as contractor } from "../app/industries/contractor-leads/route.ts";
import { GET as realEstate } from "../app/industries/real-estate-leads/route.ts";
import { GET as mortgage } from "../app/industries/mortgage-leads/route.ts";

describe("reviewed legacy public destinations", () => {
  const handlers = [
    ["/offers/power-bundle", "/agency/content", contentOffer],
    ["/offers/monthly-operator", "/operatoros", operatorOffer],
    ["/leaderboard", "/scoreboard", leaderboard],
    ["/lead-leak-audit", "/diagnostic", leadAudit],
    ["/industries/contractor-leads", "/tools/collections/home-services", contractor],
    ["/industries/real-estate-leads", "/tools/collections/real-estate", realEstate],
    ["/industries/mortgage-leads", "/tools/collections/mortgage-lending", mortgage],
  ] as const;
  it("uses permanent exact redirects without transferring queries or setting cookies", async () => {
    for (const [path, destination, handler] of handlers) {
      for (const query of ["", "?utm_source=old-ad", "?product=retired&request=example", "?email=private%40example.com&name=Example", "?next=https%3A%2F%2Fexample.com%2Fother"]) {
        const request = new Request(`https://www.theleadflowpro.com${path}${query}`);
        const response = (handler as (request?: Request) => Response)(request);
        assert.equal(response.status, 308, path);
        assert.equal(response.headers.get("Location"), `https://www.theleadflowpro.com${destination}`, path);
        assert.equal(response.headers.get("Referrer-Policy"), "no-referrer", path);
        assert.equal(response.headers.get("Set-Cookie"), null, path);
        assert.equal(await response.text(), "", path);
      }
    }
  });
});
