import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/sales", "/api", "/account", "/auth"],
      },
    ],
    sitemap: "https://www.theleadflowpro.com/sitemap.xml",
  };
}
