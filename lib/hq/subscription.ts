import { sendOwnerEmail } from "./channels";
import * as db from "./server";
import { customerIdOf, planFromSubscription, type StripeSubscriptionLike } from "./stripe";
import { HQ_PLAN } from "./types";

// The Stripe side of the plugin subscription, called from the shared
// webhook before any of the one-time purchase logic. Two things matter:
// a completed subscription checkout ties the Stripe customer and
// subscription to the workspace, and every subscription lifecycle event
// after that keeps the workspace plan in step with Stripe. Stripe retries
// and delivers out of order, so an event only wins if it is newer than the
// last one applied.

type StripeEvent = { type?: unknown; created?: unknown; data?: { object?: unknown } };

/** True when the event belonged to the plugin and was handled here. */
export async function handleHqStripeEvent(client: db.Db, event: StripeEvent, stripeKey: string | undefined): Promise<boolean> {
  const type = typeof event.type === "string" ? event.type : "";
  const object = (event.data?.object && typeof event.data.object === "object" ? event.data.object : {}) as Record<string, unknown>;
  const eventAt = typeof event.created === "number" && Number.isFinite(event.created) ? Math.floor(event.created) : Math.floor(Date.now() / 1000);

  if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
    const metadata = (object.metadata && typeof object.metadata === "object" ? object.metadata : {}) as Record<string, unknown>;
    if (metadata.kind !== HQ_PLAN.kind || object.mode !== "subscription") return false;
    const workspaceId = typeof metadata.workspace_id === "string" ? metadata.workspace_id : "";
    const ws = workspaceId ? await db.getWorkspaceById(client, workspaceId) : null;
    if (!ws) {
      // A workspace deleted between checkout and webhook is not a reason to
      // make Stripe retry forever. Log it and acknowledge.
      console.error(`Plugin checkout for missing workspace ${workspaceId || "(none)"}; session ${String(object.id ?? "")}`);
      return true;
    }
    const customerId = customerIdOf(object as { customer?: string | { id?: string } });
    const subscriptionId = typeof object.subscription === "string" ? object.subscription : typeof (object.subscription as { id?: string })?.id === "string" ? (object.subscription as { id: string }).id : null;
    // The checkout session does not carry the subscription's status. Read it
    // from Stripe so a trial starts as a trial and a paid start is active.
    let plan = planFromSubscription({ status: ws.trial_used_at ? "active" : "trialing", trial_end: ws.trial_used_at ? null : Math.floor(Date.now() / 1000) + HQ_PLAN.trialDays * 86_400 });
    if (subscriptionId && stripeKey) {
      const sub = await fetchSubscription(stripeKey, subscriptionId);
      if (sub) plan = planFromSubscription(sub);
    }
    const first = ws.plan === "none" || ws.plan === "canceled";
    await db.updateWorkspace(client, ws.id, {
      stripe_customer_id: customerId ?? ws.stripe_customer_id,
      stripe_subscription_id: subscriptionId ?? ws.stripe_subscription_id,
      trial_used_at: ws.trial_used_at ?? (plan.plan === "trial" ? new Date().toISOString() : null),
      stripe_event_at: Math.max(ws.stripe_event_at, eventAt),
      ...plan,
    });
    await db.recordEvent(client, ws.id, { kind: "system", detail: `Plan started (${plan.subscription_status})`, actor: "stripe", dedupeKey: `stripe:checkout:${String(object.id ?? subscriptionId ?? eventAt)}` });
    if (first) {
      await sendOwnerEmail(
        { ...ws, ...plan },
        `Your ${HQ_PLAN.name} is on`,
        [
          `${ws.name} is live on the ${HQ_PLAN.name}.`,
          plan.plan === "trial" && plan.trial_ends_at ? `Your free trial runs through ${new Date(plan.trial_ends_at).toDateString()}. Cancel any time from HQ before then and you will not be charged.` : "",
          "",
          "Three things to do now:",
          "1. Connect the plugin to ChatGPT or Claude: https://www.theleadflowpro.com/hq/plugin",
          "2. Point your website form at your lead endpoint: https://www.theleadflowpro.com/hq/settings",
          "3. Turn on the instant reply and set your response target.",
          "",
          "Your morning brief starts tomorrow.",
        ]
          .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
          .join("\n"),
        `hq-welcome-${ws.id}`,
      );
    }
    return true;
  }

  if (type.startsWith("customer.subscription.")) {
    const sub = object as StripeSubscriptionLike;
    const metadata = (sub.metadata && typeof sub.metadata === "object" ? sub.metadata : {}) as Record<string, unknown>;
    let ws = typeof metadata.workspace_id === "string" ? await db.getWorkspaceById(client, metadata.workspace_id) : null;
    if (!ws && typeof sub.id === "string") ws = await db.findWorkspaceByStripe(client, "stripe_subscription_id", sub.id);
    if (!ws) return false;
    // An older event than the last one applied is a retry or a reorder.
    if (eventAt < ws.stripe_event_at) return true;
    // A different subscription than the one on file only matters if it is
    // the newer one (a restart after a cancel); an old one's late events
    // must not clobber the live plan.
    if (ws.stripe_subscription_id && typeof sub.id === "string" && sub.id !== ws.stripe_subscription_id && type !== "customer.subscription.created") return true;
    const plan = type === "customer.subscription.deleted" ? planFromSubscription({ ...sub, status: "canceled" }) : planFromSubscription(sub);
    await db.updateWorkspace(client, ws.id, {
      ...plan,
      stripe_subscription_id: typeof sub.id === "string" ? sub.id : ws.stripe_subscription_id,
      stripe_customer_id: customerIdOf(sub) ?? ws.stripe_customer_id,
      trial_used_at: ws.trial_used_at ?? (plan.plan === "trial" ? new Date().toISOString() : null),
      stripe_event_at: eventAt,
    });
    if (plan.plan !== ws.plan) {
      await db.recordEvent(client, ws.id, { kind: "system", detail: `Plan is now ${plan.plan} (${plan.subscription_status})`, actor: "stripe" });
      const key = `${typeof sub.id === "string" ? sub.id : ws.id}-${plan.subscription_status}`;
      if (plan.plan === "canceled") {
        await sendOwnerEmail(ws, `${ws.name}: plan ended`, `The ${HQ_PLAN.name} for ${ws.name} has ended. The engine is paused: no instant replies, alerts, briefs, or drafts until it restarts.\n\nRestart any time: https://www.theleadflowpro.com/hq/billing\nYour leads and history stay put.`, `hq-ended-${key}`);
      } else if (plan.plan === "past_due") {
        await sendOwnerEmail(ws, `${ws.name}: payment did not go through`, `Stripe could not charge the card on file for the ${HQ_PLAN.name}. The engine keeps running for now. Update the card here: https://www.theleadflowpro.com/hq/billing`, `hq-pastdue-${key}-${plan.current_period_end ?? eventAt}`);
      }
    }
    return true;
  }

  return false;
}

async function fetchSubscription(key: string, id: string): Promise<StripeSubscriptionLike | null> {
  try {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as StripeSubscriptionLike;
  } catch {
    return null;
  }
}
