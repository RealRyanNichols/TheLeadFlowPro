// Where the operator's other screens live. Private, owner-facing addresses
// (the DigitalOcean brain, the LeadFlow Hub, Meta Ads Manager), not public
// links; the public ones are in lib/site/external-links.ts.
//
// The brain's address is the droplet's reserved IP behind sslip.io until a
// hostname is chosen. It can be overridden without a deploy through
// LEADFLOW_BRAIN_ORIGIN (an https origin) and LEADFLOW_HUB_URL. No secret is
// involved: every one of these pages asks for its own sign-in.

import { LEADFLOW_META } from "@/lib/metaCampaignGuard";

const DEFAULT_BRAIN_ORIGIN = "https://165-227-248-110.sslip.io";
const DEFAULT_HUB_URL = "https://hub.165-227-248-110.sslip.io/hub/";

function httpsOrigin(value: string | undefined, fallback: string): string {
  const raw = (value ?? "").trim().replace(/\/+$/, "");
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && url.origin === raw) return raw;
  } catch {
    // fall through to the default
  }
  return fallback;
}

function httpsUrl(value: string | undefined, fallback: string): string {
  const raw = (value ?? "").trim();
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // fall through to the default
  }
  return fallback;
}

export type OperatorLink = { key: string; label: string; href: string; detail: string; external: boolean; ownerOnly?: boolean };

export function operatorLinks(env: Record<string, string | undefined> = process.env): OperatorLink[] {
  const brain = httpsOrigin(env.LEADFLOW_BRAIN_ORIGIN, DEFAULT_BRAIN_ORIGIN);
  const hub = httpsUrl(env.LEADFLOW_HUB_URL, DEFAULT_HUB_URL);
  return [
    { key: "uncalled", label: "Uncalled", href: "/admin/sales/uncalled", detail: "Every open lead no person has reached. Pat and Ryan both open it.", external: false },
    { key: "sales", label: "Sales desk", href: "/admin/sales", detail: "Pat's Today queue, pipeline, follow-ups and invoices.", external: false },
    { key: "business", label: "Business dashboard", href: "/admin/business", detail: "Money moves, invoices, forecast and server health, from the DigitalOcean server.", external: false },
    { key: "cash", label: "Record a payment", href: "/admin/operator/cash", detail: "A check, cash, ACH or wire, recorded by hand. It counts on this board the moment it is saved.", external: false, ownerOnly: true },
    { key: "hub", label: "LeadFlow Hub", href: hub, detail: "Every business, every client, one place on the droplet. Call Desk login.", external: true },
    { key: "calldesk", label: "Call Desk", href: `${brain}/`, detail: "The brain's call desk on the droplet.", external: true },
    { key: "fieldy", label: "Fieldy archive", href: `${brain}/fieldy`, detail: "Every recording, searchable, owner only.", external: true, ownerOnly: true },
    {
      key: "ads",
      label: "Meta Ads Manager",
      href: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${LEADFLOW_META.adAccountId}`,
      detail: "The LeadFlow ad account. Spend and learning phase live here; this board only reads.",
      external: true,
    },
    { key: "content", label: "Content Command", href: "/admin/content-command", detail: "The daily content queue and replies.", external: false },
  ];
}
