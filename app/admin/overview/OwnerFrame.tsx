"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OWNER_VIEWS, safeOwnerView } from "@/lib/adminOwnerViews";

export default function OwnerFrame({ view, detail }: { view: string; detail?: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const [height, setHeight] = useState(1100);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      if (event.data.kind === "lf-owner-height" && Number.isFinite(event.data.height)) setHeight(Math.max(700, Math.min(14000, event.data.height + 12)));
      if (event.data.kind === "lf-owner-view" && OWNER_VIEWS.includes(event.data.view)) {
        const next = safeOwnerView(event.data.view);
        const parts = String(event.data.hash || next).split("?");
        const incoming = new URLSearchParams(parts[1] || "");
        const query = new URLSearchParams(); if (next !== "today") query.set("view", next);
        const record = incoming.get("record"); const status = incoming.get("status");
        if (next === "library" && record && /^[a-zA-Z0-9_-]{1,100}$/.test(record)) query.set("record", record);
        if (next === "work" && status && ["all","open","waiting","review","done"].includes(status)) query.set("status", status);
        const suffix = query.toString(); const href = `/admin/overview${suffix ? "?" + suffix : ""}`;
        if (window.location.pathname + window.location.search !== href) router.replace(href, { scroll: false });
      }
    };
    const theme = () => frame.current?.contentWindow?.postMessage({ kind: "lf-owner-theme", theme: document.querySelector("#lf-admin-shell")?.getAttribute("data-admin-theme") || "dark" }, window.location.origin);
    const observer = new MutationObserver(theme);
    const root = document.querySelector("#lf-admin-shell");
    if (root) observer.observe(root, { attributes: true, attributeFilter: ["data-admin-theme"] });
    window.addEventListener("message", receive); frame.current?.addEventListener("load", theme); theme();
    return () => { window.removeEventListener("message", receive); frame.current?.removeEventListener("load", theme); observer.disconnect(); };
  }, [router, view]);
  return <iframe ref={frame} className="lf-admin-owner-frame" style={{ height }} src={`/admin/hub/frame#${safeOwnerView(view)}${detail || ""}`} title="LeadFlow owner command center" referrerPolicy="same-origin" />;
}
