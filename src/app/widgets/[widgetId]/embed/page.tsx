import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicWidgetConfig } from "@/lib/leadflow-widgets";
import { WidgetEmbedClient } from "./WidgetEmbedClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LeadFlow Widget Embed",
  robots: {
    index: false,
    follow: false,
  },
};

function cleanSearch(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value || "";
  return raw.slice(0, 1200);
}

export default async function WidgetEmbedPage({
  params,
  searchParams,
}: {
  params: { widgetId: string };
  searchParams: { domain?: string | string[]; page?: string | string[] };
}) {
  const widget = await getPublicWidgetConfig(params.widgetId);
  if (!widget || widget.status !== "active") notFound();

  return (
    <main className="min-h-screen bg-transparent p-0">
      <WidgetEmbedClient
        widget={widget}
        sourceDomain={cleanSearch(searchParams.domain)}
        pageUrl={cleanSearch(searchParams.page) || "https://www.theleadflowpro.com/widgets"}
      />
    </main>
  );
}
