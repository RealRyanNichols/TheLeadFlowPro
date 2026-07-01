import { NextResponse } from "next/server";
import { getPublicWidgetConfig } from "@/lib/leadflow-widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanWidgetId(value: string) {
  return value.replace(/\.js$/i, "").replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 120);
}

export async function GET(
  req: Request,
  { params }: { params: { widgetId: string } },
) {
  const widgetId = cleanWidgetId(params.widgetId);
  const widget = await getPublicWidgetConfig(widgetId);
  if (!widget || widget.status !== "active") {
    return new NextResponse("/* LeadFlow widget not found or inactive. */", {
      status: 404,
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const origin = new URL(req.url).origin;
  const escapedId = JSON.stringify(widget.slug || widgetId);
  const script = `
(function () {
  var widgetId = ${escapedId};
  var baseUrl = ${JSON.stringify(origin)};
  var containerId = "leadflow-widget-" + widgetId;
  var container = document.getElementById(containerId) || document.querySelector("[data-leadflow-widget='" + widgetId + "']");
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    document.currentScript && document.currentScript.insertAdjacentElement("afterend", container);
  }
  if (!container || container.getAttribute("data-leadflow-mounted") === "true") return;
  container.setAttribute("data-leadflow-mounted", "true");
  container.style.width = "100%";
  container.style.maxWidth = container.getAttribute("data-max-width") || "760px";
  container.style.margin = container.style.margin || "0 auto";

  var frame = document.createElement("iframe");
  var page = window.location.href;
  var domain = window.location.hostname;
  frame.src = baseUrl + "/widgets/" + encodeURIComponent(widgetId) + "/embed?domain=" + encodeURIComponent(domain) + "&page=" + encodeURIComponent(page);
  frame.title = "LeadFlow widget";
  frame.loading = "lazy";
  frame.style.width = "100%";
  frame.style.minHeight = container.getAttribute("data-min-height") || "620px";
  frame.style.border = "0";
  frame.style.borderRadius = container.getAttribute("data-radius") || "14px";
  frame.style.overflow = "hidden";
  frame.setAttribute("allow", "clipboard-write");
  container.appendChild(frame);

  function anonymousId() {
    try {
      var key = "leadflow.widgetAnonymousId";
      var existing = window.localStorage.getItem(key);
      if (existing) return existing;
      var generated = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "lfw_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      window.localStorage.setItem(key, generated);
      return generated;
    } catch (error) {
      return "";
    }
  }

  try {
    navigator.sendBeacon && navigator.sendBeacon(
      baseUrl + "/api/leadflow/widgets/event",
      new Blob([JSON.stringify({
        widgetId: widgetId,
        eventName: "widget_loaded",
        anonymousUserId: anonymousId(),
        sourceDomain: domain,
        pageUrl: page,
        properties: { route: "/embedded-widget", cta: "embed_script_loaded" }
      })], { type: "application/json" })
    );
  } catch (error) {}
}());
`;

  return new NextResponse(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
