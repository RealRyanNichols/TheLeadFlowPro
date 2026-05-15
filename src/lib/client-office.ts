import { prisma } from "@/lib/prisma";
import { getOfferWorkload, formatHours } from "@/lib/workload";

export type ClientOfficeUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type ClientWorkOrder = {
  id: string;
  clientName: string;
  publicLabel: string | null;
  offerSlug: string | null;
  title: string;
  status: string;
  estimatedHours: number;
  completedHours: number;
  deliveryGuaranteeDays: number | null;
  dueAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClientPublicIntake = {
  id: string;
  fullName: string;
  email: string;
  businessName: string | null;
  businessUrl: string | null;
  budgetTier: string;
  biggestGoal: string | null;
  biggestBlocker: string | null;
  routedTo: string | null;
  handled: boolean;
  createdAt: Date;
};

export const CLIENT_STATUS_COPY: Record<
  string,
  { label: string; tone: string; body: string }
> = {
  intake_needed: {
    label: "Intake needed",
    tone: "border-accent-400/40 bg-accent-500/10 text-accent-200",
    body: "Ryan needs the account links, context, files, or first message before the work can start.",
  },
  pending_review: {
    label: "Ryan review",
    tone: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
    body: "Your update is in Ryan's review queue. He has to approve customer-facing work before it goes out.",
  },
  in_progress: {
    label: "In progress",
    tone: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
    body: "Ryan is actively working the order or the machines are running through the work package.",
  },
  waiting_on_client: {
    label: "Waiting on you",
    tone: "border-accent-400/40 bg-accent-500/10 text-accent-200",
    body: "Something is missing from the client side: links, files, access, feedback, or a decision.",
  },
  delivered: {
    label: "Delivered",
    tone: "border-white/15 bg-white/10 text-white",
    body: "Ryan has delivered the work product. Keep follow-up questions tight and specific.",
  },
  completed: {
    label: "Completed",
    tone: "border-white/10 bg-white/5 text-ink-200",
    body: "The order is complete and archived in the office.",
  },
  canceled: {
    label: "Canceled",
    tone: "border-rose-400/40 bg-rose-500/10 text-rose-200",
    body: "This order is no longer active.",
  },
};

export const DEFAULT_STATUS_COPY = {
  label: "Open",
  tone: "border-white/15 bg-white/10 text-white",
  body: "This order is open in the client office.",
};

export function clientNeedsForOffer(slug: string | null | undefined): string[] {
  switch (slug) {
    case "quick-look":
      return [
        "Business name, website, and the offer you want attention on",
        "Social handles for business and personal accounts Ryan should review",
        "One sentence on what feels stuck right now",
        "Screenshots or links to any posts, ads, or pages you want included",
      ];
    case "decision-sprint":
      return [
        "The decision you need made in the next 30 days",
        "Any transcripts, notes, documents, screenshots, recordings, or links Ryan should load into the case file",
        "Your preferred call windows and the best phone number",
        "The result you want from the action worksheet",
      ];
    case "business-audit":
      return [
        "Website, funnel, social accounts, ad accounts, and current offer links",
        "Sales process notes: how leads come in, who follows up, and where they fall off",
        "Screenshots, reports, or dashboards showing real traffic, leads, or sales",
        "The main business constraint Ryan should audit first",
      ];
    case "working-session":
      return [
        "The one deliverable that must ship during the session",
        "All current assets, logins, copy, files, and examples needed to build it",
        "The decision-maker who can approve changes in real time",
        "Any hard deadline or launch constraint",
      ];
    case "sprint-4-week":
      return [
        "The 30-day target: content engine, website, funnel, dashboard, or lead-flow system",
        "Access list for social accounts, site, CRM, ads, files, and analytics",
        "Brand voice examples and posts you like or hate",
        "Weekly approval cadence so work does not sit idle",
      ];
    case "power-bundle":
      return [
        "All four platform handles and current login/access path",
        "Brand voice, offer, audience, and wrong-fit list",
        "Existing photos, videos, clips, posts, testimonials, and product shots",
        "Weekly approval rhythm for posts, replies, and reports",
      ];
    case "fb-ads":
      return [
        "Meta Business Manager, Page, ad account, pixel, and landing page access",
        "Budget, offer, target geography, and lead qualification rules",
        "Creative assets, testimonials, before/after examples, or proof posts",
        "Follow-up process for every lead Meta sends you",
      ];
    case "light-retainer":
    case "monthly-operator":
    case "annual-advisor":
      return [
        "Current business scoreboard and the decisions Ryan should watch",
        "Calendar rhythm for calls, async updates, and approvals",
        "Links to docs, dashboards, offers, funnels, accounts, and active projects",
        "The owner-level constraint that must not get lost in the noise",
      ];
    default:
      return [
        "Business/account links Ryan should review",
        "Files, screenshots, documents, recordings, or notes tied to the order",
        "What you want fixed first",
        "How Ryan should send the finished work back to you",
      ];
  }
}

export function remainingHours(order: Pick<ClientWorkOrder, "estimatedHours" | "completedHours">) {
  return Math.max(0, Number(order.estimatedHours || 0) - Number(order.completedHours || 0));
}

export function progressPercent(order: Pick<ClientWorkOrder, "estimatedHours" | "completedHours">) {
  if (!order.estimatedHours || order.estimatedHours <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((order.completedHours / order.estimatedHours) * 100)));
}

export function dueLabel(dueAt: Date | null): string {
  if (!dueAt) return "Ongoing";
  return dueAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function orderHoursLabel(order: Pick<ClientWorkOrder, "estimatedHours" | "completedHours">) {
  return `${formatHours(remainingHours(order))} left of ${formatHours(order.estimatedHours || 0)}`;
}

export function clientCanSeeWorkOrder(order: Pick<ClientWorkOrder, "clientName" | "notes">, user: ClientOfficeUser) {
  const email = user.email.toLowerCase();
  const notes = (order.notes || "").toLowerCase();
  return (
    notes.includes(`user_id:${user.id.toLowerCase()}`) ||
    notes.includes(`buyer_email:${email}`) ||
    order.clientName.toLowerCase() === email
  );
}

export function extractClientUpdates(notes: string | null | undefined) {
  if (!notes) return [];
  return notes
    .split(/--- (Client|Ryan) update /)
    .slice(1)
    .reduce<Array<{ author: "Client" | "Ryan"; stamp: string; body: string }>>(
      (updates, part, index, chunks) => {
        if (part !== "Client" && part !== "Ryan") return updates;
        const chunk = chunks[index + 1] || "";
        const [stampPart, ...rest] = chunk.split("---");
        const body = rest.join("---").trim();
        if (body.length > 0) {
          updates.push({
            author: part,
            stamp: stampPart.trim(),
            body,
          });
        }
        return updates;
      },
      [],
    )
    .slice(-8)
    .reverse();
}

export function extractClientOnlyUpdates(notes: string | null | undefined) {
  if (!notes) return [];
  return notes
    .split("--- Client update ")
    .slice(1)
    .map((chunk) => {
      const [stampPart, ...rest] = chunk.split("---");
      return {
        author: "Client" as const,
        stamp: stampPart.trim(),
        body: rest.join("---").trim(),
      };
    })
    .filter((update) => update.body.length > 0)
    .slice(-5)
    .reverse();
}

export function clientActionForOrder(order: ClientWorkOrder | null) {
  if (!order) {
    return {
      label: "Pick a paid entry point",
      body: "No active work order is linked yet. Start the router, request a build blueprint, or book the fit call.",
      href: "/start",
      cta: "Start router",
    };
  }

  if (order.status === "intake_needed" || order.status === "waiting_on_client") {
    return {
      label: "Send Ryan the missing context",
      body: "This order cannot move cleanly until account links, files, decisions, screenshots, or notes are attached.",
      href: `/dashboard/work/${order.id}`,
      cta: "Send update",
    };
  }

  if (order.status === "pending_review") {
    return {
      label: "Ryan review is next",
      body: "Your update is in the review queue. Ryan has to approve customer-facing work before it is delivered.",
      href: `/dashboard/work/${order.id}`,
      cta: "View order",
    };
  }

  if (order.status === "in_progress") {
    return {
      label: "Work block is active",
      body: "Ryan is in the work or the machines are running through research, parsing, build, edits, or worksheet assembly.",
      href: `/dashboard/work/${order.id}`,
      cta: "Check progress",
    };
  }

  if (order.status === "delivered") {
    return {
      label: "Review the delivery",
      body: "Open the order, check the files or notes, and send tight follow-up questions if something needs one more pass.",
      href: `/dashboard/work/${order.id}`,
      cta: "Open delivery",
    };
  }

  return {
    label: "Open the work order",
    body: "Review the latest status, hours, due date, and next action.",
    href: `/dashboard/work/${order.id}`,
    cta: "Open order",
  };
}

export function extractLatestClientUpdates(orders: ClientWorkOrder[], limit = 6) {
  return orders
    .flatMap((order) =>
      extractClientUpdates(order.notes).map((update) => ({
        ...update,
        orderId: order.id,
        orderTitle: order.title,
      })),
    )
    .slice(0, limit);
}

export async function getClientWorkOrders(user: ClientOfficeUser): Promise<ClientWorkOrder[]> {
  const email = user.email.toLowerCase();
  try {
    return await (prisma as any).workOrder.findMany({
      where: {
        OR: [
          { notes: { contains: `user_id:${user.id}` } },
          { notes: { contains: `buyer_email:${email}` } },
          { notes: { contains: user.email } },
          { clientName: { equals: user.email, mode: "insensitive" } },
        ],
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    });
  } catch {
    return [];
  }
}

export async function getClientWorkOrderById(id: string, user: ClientOfficeUser): Promise<ClientWorkOrder | null> {
  try {
    const order = await (prisma as any).workOrder.findUnique({ where: { id } });
    if (!order || !clientCanSeeWorkOrder(order, user)) return null;
    return order;
  } catch {
    return null;
  }
}

export async function getClientIntakes(user: ClientOfficeUser): Promise<ClientPublicIntake[]> {
  try {
    return await prisma.publicIntake.findMany({
      where: { email: { equals: user.email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        businessName: true,
        businessUrl: true,
        budgetTier: true,
        biggestGoal: true,
        biggestBlocker: true,
        routedTo: true,
        handled: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}

export function offerWorkloadNote(slug: string | null | undefined) {
  const workload = getOfferWorkload(slug);
  return workload?.workloadNote || "Ryan will map the work, load the evidence/context, and keep the order tied to real capacity.";
}
