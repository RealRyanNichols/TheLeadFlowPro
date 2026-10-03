import type { NextConfig } from "next";

// The droplet image (deploy/droplet/Dockerfile) sets NEXT_OUTPUT=standalone so
// the build emits a self-contained server. Vercel builds leave it unset.
const standalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  // Bound build concurrency on the shared droplet. A custom webpack callback
  // disables Next's default build-worker choice, so preserve it explicitly.
  experimental: {
    cpus: 1,
    webpackBuildWorker: true,
    webpackMemoryOptimizations: true,
  },
  // Every validated release is a fresh checkout. Its webpack cache would never
  // be reused, and can occupy hundreds of MB on the shared production host.
  // Runtime/ISR caches and the development cache remain enabled.
  webpack(config, { dev }) {
    if (!dev) config.cache = false;
    return config;
  },
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
      "./public/images/social/scoreboard-20260907.jpg",
    ],
  },
  // The free website build offer was retired on 2026-09-22. Paid ads, old
  // emails, and outside links still point at /free-build, so it answers with
  // a permanent 301 (not Next's default 308) to the services page. Next
  // forwards the query string, so utm_* tags survive the hop.
  async redirects() {
    return [
      // An old paid free-build session's success_url: keep the buyer on a
      // confirmation page (it verifies session_id), not a sales page.
      {
        source: "/free-build/welcome",
        destination: "/thank-you",
        statusCode: 301,
      },
      { source: "/free-build", destination: "/services", statusCode: 301 },
      {
        source: "/free-build/:path*",
        destination: "/services",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
