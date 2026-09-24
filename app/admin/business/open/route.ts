import { NextResponse, type NextRequest } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";
import {
  businessSsoUrl,
  dashboardUserFor,
  mintBusinessTicket,
  readBusinessDashboardConfig,
} from "@/lib/businessDashboard";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function goTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303, headers: NO_STORE });
}

/**
 * Opens the Business dashboard in its own tab, already signed in. Admins only.
 * Every open signs a fresh one-time ticket, so this link can be clicked again
 * and again but a copied dashboard address never signs anyone in twice.
 */
export async function GET(request: NextRequest) {
  let email: string | undefined;
  try {
    ({
      user: { email },
    } = await requireOperatorAdmin());
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return goTo(new URL(error.status === 401 ? "/login?next=/admin/business" : "/dashboard", request.url));
    }
    throw error;
  }

  const config = readBusinessDashboardConfig();
  const dashboardUser = config ? dashboardUserFor(config, email) : null;
  if (!config || !dashboardUser) return goTo(new URL("/admin/business", request.url));

  return goTo(businessSsoUrl(config.origin, mintBusinessTicket(dashboardUser, config.secret), "tab"));
}
