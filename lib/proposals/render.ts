// The branded, print-ready page for a proposal. Standalone HTML so Ryan can
// print it to PDF from the browser or paste the text. Every string that
// came from a person is escaped.

import { offer } from "../site/offers";
import type { Proposal } from "./build";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const list = (items: string[]) => `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;

export function renderProposalHtml(p: Proposal, opts: { sample?: boolean } = {}): string {
  const title = `Proposal for ${p.preparedFor.business ?? p.preparedFor.name}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>
  :root { --ink: #0a1220; --muted: #4b5563; --line: #dfe3ea; --blue: #1240e8; --bg: #ffffff; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 Inter, system-ui, sans-serif; }
  .page { width: min(820px, calc(100% - 32px)); margin: 0 auto; padding: 40px 0 64px; }
  h1 { font-size: 30px; line-height: 1.15; letter-spacing: -.02em; margin: 0 0 6px; }
  h2 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: var(--blue); margin: 32px 0 8px; }
  .meta { color: var(--muted); font-size: 14px; }
  blockquote { margin: 12px 0; padding: 12px 16px; border-left: 4px solid var(--blue); background: #f3f5fb; font-style: italic; }
  ul { margin: 6px 0; padding-left: 20px; }
  li { margin: 4px 0; }
  .price { border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; margin: 8px 0; }
  .price strong { font-size: 20px; }
  .sample { background: #b45309; color: #fff; padding: 8px 12px; border-radius: 8px; font-weight: 700; margin-bottom: 16px; }
  .missing { border: 1px solid #f5c2c7; background: #fff5f5; border-radius: 12px; padding: 14px 16px; margin: 16px 0; }
  .missing h3 { margin: 0 0 6px; font-size: 15px; color: #9b1c1c; }
  footer { margin-top: 40px; color: var(--muted); font-size: 13px; border-top: 1px solid var(--line); padding-top: 16px; }
  @media print { .missing, .sample, .noprint { display: none; } .page { width: 100%; padding: 0; } body { font-size: 13px; } }
</style>
</head>
<body>
<main class="page">
  ${opts.sample ? `<div class="sample">Sample proposal built from a fictional intake. Not a real client.</div>` : ""}
  ${p.missing.length ? `<div class="missing"><h3>Fix before sending</h3>${list(p.missing)}</div>` : ""}
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Prepared for ${escapeHtml(p.preparedFor.name)} by ${escapeHtml(p.preparedBy.operator)}, ${escapeHtml(p.preparedBy.name)}. ${escapeHtml(p.date)}. Valid until ${escapeHtml(p.validUntil)}.</p>

  <h2>What you told us</h2>
  ${p.problem.quote ? `<blockquote>${escapeHtml(p.problem.quote)}</blockquote>` : ""}
  ${list(p.problem.facts)}

  <h2>Recommended</h2>
  ${list(p.recommended.map((r) => `${r.name}: ${r.why}`))}

  ${p.modules.length ? `<h2>Modules</h2>${list(p.modules.map((m) => m.label))}` : ""}

  <h2>Deliverables</h2>
  ${p.deliverables.map((d) => `<p><strong>${escapeHtml(d.source)}</strong></p>${list(d.items)}`).join("")}

  <h2>What you own</h2>
  ${list(p.clientOwns)}

  <h2>Costs you pay vendors directly</h2>
  ${list(p.vendorCosts)}

  ${p.notIncluded.length ? `<h2>Not included</h2>${list(p.notIncluded)}` : ""}

  <h2>Price</h2>
  ${p.price.map((pr) => `<div class="price"><strong>${escapeHtml(pr.label)}</strong> ${escapeHtml(offer(pr.offerId).name)}<br><span class="meta">${escapeHtml(pr.terms)}</span></div>`).join("")}

  <h2>To accept</h2>
  <ol>${p.acceptance.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ol>

  <footer>${escapeHtml(p.preparedBy.legal)}. ${escapeHtml(p.preparedBy.email)}. ${escapeHtml(p.preparedBy.phone)}.</footer>
</main>
</body>
</html>
`;
}
