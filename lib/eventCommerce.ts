import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

export const WORKSHOP_SLUG = "east-texas-ai-operator-workshop";
export const WORKSHOP_EVENT_ID = "44a7f680-1693-48f2-9ba6-0555645878fc";
export const WORKSHOP_TIME_ZONE = "America/Chicago";
export const WORKSHOP_HOLD_MINUTES = 30;

export type WorkshopEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  starts_at: string | null;
  duration_minutes: number;
  price_usd: number;
  capacity: number;
  is_published: boolean;
  sales_status: string;
  instructor_name: string;
};

export type WorkshopPolicies = {
  recording_consent_text: string;
  cancellation_policy: string;
  seat_transfer_policy: string;
  exact_address?: string;
};

export type WorkshopReadiness = {
  ready: boolean;
  blockers: string[];
};

export function createWorkshopServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function workshopSalesReadiness(
  event: Partial<WorkshopEventRow> | null,
  policies: Partial<WorkshopPolicies> | null,
  now = new Date(),
): WorkshopReadiness {
  const blockers: string[] = [];
  if (!event) return { ready: false, blockers: ["Event not found"] };
  if (!event.is_published) blockers.push("Publish the event");
  if (!event.starts_at || new Date(event.starts_at) <= now) blockers.push("Set a future date");
  if (!Number.isFinite(Number(event.price_usd)) || Number(event.price_usd) <= 0) {
    blockers.push("Set a valid paid ticket price");
  }
  if (!Number.isInteger(Number(event.capacity)) || Number(event.capacity) <= 0) {
    blockers.push("Set a valid seat capacity");
  }
  if (!policies?.exact_address?.trim()) blockers.push("Set the private arrival address");
  if (!policies?.recording_consent_text?.trim()) blockers.push("Finish recording consent");
  if (!policies?.cancellation_policy?.trim()) blockers.push("Finish cancellation policy");
  if (!policies?.seat_transfer_policy?.trim()) blockers.push("Finish seat-transfer policy");
  return { ready: blockers.length === 0, blockers };
}

export function normalizeWorkshopError(message: string | undefined): {
  status: number;
  message: string;
} {
  const value = String(message ?? "").toLowerCase();
  if (value.includes("sold_out")) {
    return { status: 409, message: "This workshop is sold out." };
  }
  if (value.includes("terms_not_accepted")) {
    return { status: 400, message: "Review and accept the workshop policies to continue." };
  }
  if (value.includes("terms_missing") || value.includes("not_open")) {
    return { status: 409, message: "Registration is not open yet." };
  }
  if (value.includes("date_not_confirmed")) {
    return { status: 409, message: "The workshop date is still being finalized." };
  }
  if (value.includes("already_confirmed")) {
    return { status: 409, message: "This seat is already confirmed." };
  }
  if (value.includes("payment_review")) {
    return { status: 409, message: "This registration needs a quick payment review." };
  }
  if (value.includes("invalid_email")) {
    return { status: 400, message: "Enter a valid email address." };
  }
  if (value.includes("invalid_full_name")) {
    return { status: 400, message: "Enter your name." };
  }
  return { status: 400, message: "We could not complete that step. Please try again." };
}

export function formatWorkshopDate(value: string | null) {
  if (!value) return "Date being finalized";
  return new Date(value).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: WORKSHOP_TIME_ZONE,
  });
}

export function workshopCalendarUrl(event: Pick<WorkshopEventRow, "title" | "starts_at" | "duration_minutes" | "city">) {
  if (!event.starts_at) return null;
  const start = new Date(event.starts_at);
  const end = new Date(start.getTime() + Number(event.duration_minutes || 90) * 60_000 + 30 * 60_000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: "Bring a charged laptop, your ChatGPT login, and one real business bottleneck. The optional founding AI Business Clinic follows the 90-minute workshop.",
    location: event.city || "Longview, Texas",
    ctz: WORKSHOP_TIME_ZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
