import test from "node:test";
import assert from "node:assert/strict";
import { requestOrigin } from "../lib/requestOrigin.ts";

function proxied(host: string, forwardedHost = host) {
  return new Request("http://127.0.0.1:3109/api/checkout", {
    headers: { host, "x-forwarded-host": forwardedHost, "x-forwarded-proto": "https" },
  });
}

test("self-hosted checkout and portal destinations retain each owned public host", () => {
  for (const host of ["www.theleadflowpro.com", "go.theleadflowpro.com", "theleadflowpro.com"]) {
    const origin = requestOrigin(proxied(host), { production: true });
    assert.equal(new URL("/academy/welcome", origin).href, `https://${host}/academy/welcome`);
    assert.equal(new URL("/login?next=%2Fdashboard", origin).origin, `https://${host}`);
  }
});

test("an explicit owned preview host supports proxy receipt and checkout origins", () => {
  const host = "leadflow-candidate.165-227-248-110.sslip.io";
  assert.equal(requestOrigin(proxied(host), { production: true, trustedHosts: [host] }), `https://${host}`);
});

test("forged forwarded headers cannot choose an external callback host or downgrade TLS", () => {
  const request = proxied("www.theleadflowpro.com", "attacker.example");
  request.headers.set("x-forwarded-proto", "http");
  assert.equal(requestOrigin(request, { production: true }), "https://www.theleadflowpro.com");
  for (const value of ["attacker.example", "www.theleadflowpro.com.attacker.example", "www.theleadflowpro.com@attacker.example", "www.theleadflowpro.com, attacker.example", "www.theleadflowpro.com/path"]) {
    assert.equal(requestOrigin(proxied(value), { production: true }), "https://www.theleadflowpro.com");
  }
});

test("forwarded owned host works when proxy rewrites Host to loopback", () => {
  assert.equal(requestOrigin(proxied("127.0.0.1:3109", "go.theleadflowpro.com"), { production: true }), "https://go.theleadflowpro.com");
});

test("local development supports loopback but production never emits it", () => {
  const local = new Request("http://localhost:3000/api/checkout", { headers: { host: "127.0.0.1:3000" } });
  assert.equal(requestOrigin(local, { production: false }), "http://127.0.0.1:3000");
  assert.equal(requestOrigin(local, { production: true }), "https://www.theleadflowpro.com");
});
