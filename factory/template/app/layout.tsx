import type { Metadata } from "next";
import "../styles/site.css";
import { loadConfig } from "../lib/load";

export function generateMetadata(): Metadata {
  const c = loadConfig();
  return {
    metadataBase: new URL(c.seo.siteUrl),
    title: { default: c.seo.title, template: `%s | ${c.business.name}` },
    description: c.seo.description,
    openGraph: { siteName: c.business.name, type: "website" },
    robots: c.launch.status === "live" ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const c = loadConfig();
  return (
    <html lang="en">
      <head>
        {c.analytics.ga4Id ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${c.analytics.ga4Id}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${c.analytics.ga4Id}');` }} />
          </>
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
