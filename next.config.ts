import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
