import { NextResponse } from "next/server";

// The board as a home-screen app: Pat on October 3 asked for it "added to
// the Chrome home screen as an app". This manifest opens straight on the
// board; the sign-in is the site's own. No data, no secret, no push.

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      name: "LeadFlow Command Center",
      short_name: "Command",
      description: "Lead to cash on one screen: who to call now, promises due, money on the table.",
      start_url: "/admin/command-center",
      scope: "/admin/",
      display: "standalone",
      background_color: "#f3efe8",
      theme_color: "#5135e5",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
