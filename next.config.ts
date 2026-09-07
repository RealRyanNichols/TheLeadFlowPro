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
      "./public/images/social/free-build-20260907.jpg",
      "./public/images/social/scoreboard-20260907.jpg",
    ],
  },
};

export default nextConfig;
