import { NextResponse } from "next/server";
import { nativeOwnerOverview } from "@/lib/adminOwnerSnapshot";
import { OperatorAuthError } from "@/lib/operatoros/auth";
import { renderCommandCenter } from "@/lib/admin-workspace-renderer.mjs";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const overview = await nativeOwnerOverview(); const login = overview.viewer.login;
    let markup = renderCommandCenter({ login, name: login === "ryan" ? "Ryan Nichols" : "Patrick" }, "/admin/hub", overview.tools || {});
    markup = markup.replaceAll("/admin/hub/assets/", "/admin-workspace/").replace("<body>", '<body class="native-admin-embedded">');
    markup = markup.replace('href="/admin/hub/marketing"', 'href="/admin/overview?view=marketing" target="_top"')
      .replaceAll('href="/admin/hub/o/leadflow"', 'href="/admin/clients" target="_top"')
      .replaceAll('href="https://www.theleadflowpro.com/admin"', 'href="/admin" target="_top"')
      .replaceAll('href="https://165-227-248-110.sslip.io/dashboard"', 'href="/admin/business" target="_top"')
      .replaceAll('href="/admin/hub/rrn-', 'href="https://hub.165-227-248-110.sslip.io/hub/rrn-');
    return new NextResponse(markup, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
  } catch (error) {
    const status = error instanceof OperatorAuthError ? error.status : 503;
    return new NextResponse("Owner workspace access is unavailable. Use the native CRM or sign in with the linked owner account.", { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
