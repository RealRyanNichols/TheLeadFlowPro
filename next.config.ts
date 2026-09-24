import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic local-image reads otherwise trace the whole public directory,
  // including large video/download libraries this function never reads.
  // These remain independently served public assets.
  outputFileTracingExcludes: {
    "/og/pages/*": [
      "./public/video/**/*",
      "./public/videos/**/*",
      "./public/social/**/*",
      "./public/downloads/**/*",
    ],
  },
  // The social-card route reads only these reviewed public assets at runtime.
  outputFileTracingIncludes: {
    "/og/pages/*": [
      "./public/og/unique/**/*.jpg",
      "./public/images/brand/leadflow-logo.png",
      "./public/images/academy/cards/*.svg",
      "./public/images/page-art/tools-library.png",
      "./public/images/page-art/pro-kits.png",
      "./public/images/page-art/contact.png",
      "./public/images/page-art/coffee-demo.png",
      "./public/images/ryan-wholesale-universe-warehouse-pallets-flag.jpg",
      "./public/images/ryan-wholesale-universe-owner.jpg",
      "./public/og/portfolio/premier-dental.jpg",
      "./public/og/portfolio/donandpatti.jpg",
      "./public/images/social/services-20260907.jpg",
      "./public/images/social/premier-system-20260907.jpg",
      "./public/images/social/portfolio-20260907.jpg",
      "./public/images/social/results-20260907.jpg",
      "./public/images/social/commerce-20260907.jpg",
      "./public/images/social/scoreboard-20260907.jpg",
    ],
  },
  // The free website build offer was retired on 2026-09-22. Paid ads, old
  // emails, and outside links still point at /free-build, so it answers with
  // a permanent 301 (not Next's default 308) to the services page. Next
  // forwards the query string, so utm_* tags survive the hop.
  async redirects() {
    return [
      { source: "/free-build", destination: "/services", statusCode: 301 },
      { source: "/free-build/:path*", destination: "/services", statusCode: 301 },
    ];
  },
};

export default nextConfig;
