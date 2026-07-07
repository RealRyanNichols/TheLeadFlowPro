// src/app/connect.js/route.ts
//
// The LeadFlow Pro website connector — served at /connect.js.
// A business drops one tag on their site:
//
//   <script src="https://www.theleadflowpro.com/connect.js"
//           data-key="SITE_KEY" data-industry="mortgage"></script>
//
// It fires a view pixel, then renders a LeadFlow funnel/questionnaire — inline
// into <div id="leadflow-connect"></div> if present, otherwise as a floating
// launcher. Submissions POST to /api/connect/collect (this file bakes in the
// absolute endpoint so it works cross-origin on the buyer's site).

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");

function script(endpoint: string): string {
  return `/* The LeadFlow Pro connector — theleadflowpro.com */
(function () {
  "use strict";
  var ENDPOINT = ${JSON.stringify(endpoint)};
  var s = document.currentScript || (function () {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) if ((all[i].src || "").indexOf("connect.js") > -1) return all[i];
    return null;
  })();
  var KEY = s && s.getAttribute("data-key") || "";
  var INDUSTRY = (s && s.getAttribute("data-industry") || "").toLowerCase();
  var TITLE = s && s.getAttribute("data-title") || "Get matched, fast";
  if (!KEY) { try { console.warn("[LeadFlow] connect.js needs data-key"); } catch (e) {} }

  function post(payload) {
    payload.key = KEY; payload.url = location.href; payload.referrer = document.referrer || "";
    payload.ts = new Date().toISOString();
    try {
      if (payload.type === "view" && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], { type: "application/json" }));
        return Promise.resolve({ ok: true });
      }
    } catch (e) {}
    return fetch(ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true
    }).then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); });
  }

  // 1) view pixel
  post({ type: "view" });

  var QUESTIONS = {
    mortgage: "What are you looking to do?|Buy a home|Refinance|Pull cash out",
    "real-estate": "What are you looking to do?|Buy|Sell|Both",
    ecommerce: "What do you need most?|More traffic|Better conversion|Sourcing",
    "default": "What do you need most?|More leads|A better funnel|Done-for-you help"
  };
  var Q = (QUESTIONS[INDUSTRY] || QUESTIONS["default"]).split("|");
  var qLabel = Q[0], qOpts = Q.slice(1);

  var P = "lf-" + Math.random().toString(36).slice(2, 7);
  var css = document.createElement("style");
  css.textContent =
    "." + P + "-w{font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0c1730;max-width:380px}" +
    "." + P + "-c{background:#fff;border:1px solid rgba(12,24,51,.12);border-radius:16px;padding:18px;box-shadow:0 20px 50px -24px rgba(12,24,51,.4)}" +
    "." + P + "-t{font-weight:800;font-size:17px;margin:0 0 4px}" +
    "." + P + "-s{color:#5a6a86;margin:0 0 14px;font-size:12.5px}" +
    "." + P + "-l{display:block;font-weight:600;font-size:12px;margin:10px 0 4px;color:#3b4a68}" +
    "." + P + "-i{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid rgba(12,24,51,.16);border-radius:10px;font:inherit}" +
    "." + P + "-o{display:flex;flex-wrap:wrap;gap:6px}" +
    "." + P + "-o button{flex:1 1 auto;padding:8px 10px;border:1px solid rgba(12,24,51,.16);background:#f4f6fb;border-radius:9px;font:inherit;font-weight:600;cursor:pointer}" +
    "." + P + "-o button[aria-pressed=true]{background:#0d8fd6;border-color:#0d8fd6;color:#fff}" +
    "." + P + "-b{width:100%;margin-top:14px;padding:11px;border:0;border-radius:10px;background:#0c1730;color:#fff;font:inherit;font-weight:800;cursor:pointer}" +
    "." + P + "-fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;padding:13px 18px;border:0;border-radius:999px;background:#0d8fd6;color:#fff;font:700 14px system-ui;cursor:pointer;box-shadow:0 14px 34px -12px rgba(13,143,214,.7)}" +
    "." + P + "-modal{position:fixed;right:18px;bottom:74px;z-index:2147483000}" +
    "." + P + "-ok{color:#128a55;font-weight:700}";
  document.head.appendChild(css);

  var chosen = "";
  function form() {
    var w = document.createElement("div");
    w.className = P + "-w";
    w.innerHTML =
      '<div class="' + P + '-c">' +
      '<p class="' + P + '-t">' + esc(TITLE) + '</p>' +
      '<p class="' + P + '-s">Source-backed. Reviewed. No spam.</p>' +
      '<label class="' + P + '-l">' + esc(qLabel) + '</label>' +
      '<div class="' + P + '-o">' + qOpts.map(function (o) { return '<button type="button" data-v="' + esc(o) + '">' + esc(o) + '</button>'; }).join("") + '</div>' +
      '<label class="' + P + '-l">Name</label><input class="' + P + '-i" data-f="name" autocomplete="name">' +
      '<label class="' + P + '-l">Email</label><input class="' + P + '-i" data-f="email" type="email" autocomplete="email">' +
      '<button class="' + P + '-b" data-go>Get matched</button>' +
      '<div data-msg></div>' +
      '</div>';
    w.querySelectorAll("." + P + "-o button").forEach(function (b) {
      b.addEventListener("click", function () {
        w.querySelectorAll("." + P + "-o button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); chosen = b.getAttribute("data-v");
      });
    });
    w.querySelector("[data-go]").addEventListener("click", function () {
      var name = (w.querySelector('[data-f=name]') || {}).value || "";
      var email = (w.querySelector('[data-f=email]') || {}).value || "";
      var msg = w.querySelector("[data-msg]");
      if (!email || email.indexOf("@") < 0) { msg.innerHTML = '<p style="color:#c0392b;font-size:12px;margin:10px 0 0">Enter a valid email.</p>'; return; }
      post({ type: "lead", name: name, email: email, industry: INDUSTRY, answer: chosen, question: qLabel }).then(function () {
        w.querySelector("." + P + "-c").innerHTML = '<p class="' + P + '-t">You\\'re in.</p><p class="' + P + '-ok">We\\'ll be in touch with matched, source-backed leads.</p>';
      });
    });
    return w;
  }
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function mount() {
    var inline = document.getElementById("leadflow-connect");
    if (inline) { inline.appendChild(form()); return; }
    var fab = document.createElement("button");
    fab.className = P + "-fab"; fab.textContent = "Get leads";
    var open = false, modal;
    fab.addEventListener("click", function () {
      open = !open;
      if (open) { modal = document.createElement("div"); modal.className = P + "-modal"; modal.appendChild(form()); document.body.appendChild(modal); fab.textContent = "Close"; }
      else if (modal) { modal.remove(); fab.textContent = "Get leads"; }
    });
    document.body.appendChild(fab);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
`;
}

export async function GET() {
  return new Response(script(`${SITE_URL}/api/connect/collect`), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
