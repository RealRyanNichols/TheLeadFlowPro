import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
export const metadata = PRIVATE_PAGE_METADATA;

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { getTrainingAccess } from "@/lib/access";
import { renderPage } from "@/factory/template/components/Site";
import { siteRoutes, validateClientConfig, type ClientConfig } from "@/factory/template/lib/config";
import "@/factory/template/styles/site.css";

// Admin-only preview of a factory client site, rendered from the JSON in
// factory/clients/. Not indexed, not linked from the public site, and the
// form is disabled: a preview never routes a lead anywhere. The real site
// ships as its own app in the client's Vercel account (docs/engines/7.1).

export const dynamic = "force-dynamic";

const CLIENTS_DIR = join(process.cwd(), "factory", "clients");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function loadClient(slug: string): ClientConfig | null {
  if (!SLUG.test(slug)) return null;
  const files = readdirSync(CLIENTS_DIR);
  if (!files.includes(`${slug}.json`)) return null;
  const config = JSON.parse(readFileSync(join(CLIENTS_DIR, `${slug}.json`), "utf8")) as ClientConfig;
  return validateClientConfig(config).length === 0 ? config : null;
}

export default async function FactoryPreview({ params }: { params: Promise<{ client: string; page?: string[] }> }) {
  const { isAdmin } = await getTrainingAccess();
  if (!isAdmin) notFound();

  const { client, page } = await params;
  const config = loadClient(client);
  if (!config) notFound();

  const path = `/${(page ?? []).join("/")}`;
  const route = siteRoutes(config).find((r) => r.href === path);
  if (!route) notFound();

  const base = `/factory/preview/${config.slug}`;
  return renderPage(route.key, { config, path, base, formAction: `${base}${path}`, preview: true });
}
