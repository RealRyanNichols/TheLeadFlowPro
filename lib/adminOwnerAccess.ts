import { parseDashboardUsers } from "./businessDashboard";

/** Reuse the existing native-admin owner mapping; never infer owner access from an admin role alone. */
export function ownerDashboardLoginFor(email: string | null | undefined, mapping = process.env.BUSINESS_DASHBOARD_USERS): "pat" | "ryan" | null {
  const login = email ? parseDashboardUsers(mapping).get(email.trim().toLowerCase()) : null;
  return login === "pat" || login === "ryan" ? login : null;
}

