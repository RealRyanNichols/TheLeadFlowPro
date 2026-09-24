import type { NextConfig } from "next";

// The droplet image (deploy/droplet/Dockerfile) sets NEXT_OUTPUT=standalone so
// the build emits a self-contained server. Vercel builds leave it unset.
const standalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  ...(standalone ? { output: "standalone" as const } : {}),
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
      "./public/images/social/free-build-20260907.jpg",
      "./public/images/social/scoreboard-20260907.jpg",
    ],
    // The Longview directory and the sitemap read the committed publish
    // export and the removal list at request time.
    "/longview/**": ["./content/longview-directory/*.json"],
    "/sitemap.xml": ["./content/longview-directory/*.json"],
  },
};

export default nextConfig;
