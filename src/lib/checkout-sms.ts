import { prisma } from "@/lib/prisma";
import { cleanE164UsPhone } from "@/lib/phone";

export type SmsTemplate =
  | "LeaderboardPlaced"
  | "VoteCast"
  | "BoostLive"
  | "OfferPurchase";

export type CheckoutSmsResult = {
  status: "sent" | "failed" | "skipped_opt_out";
  message: string;
  toPhone: string | null;
  error?: string | null;
  alreadyLogged?: boolean;
};

type SendCheckoutSmsInput = {
  stripeSessionId: string;
  template: SmsTemplate;
  message: string;
  toPhone: string | null | undefined;
  smsOptOut: boolean;
};

type QuoSendResult = {
  ok: boolean;
  error?: string;
};

function quoMessagesUrl() {
  return (
    process.env.QUO_MESSAGES_URL ||
    process.env.QUO_API_URL ||
    "https://api.openphone.com/v1/messages"
  );
}

async function sendViaQuo(toPhone: string, message: string): Promise<QuoSendResult> {
  const apiKey = process.env.QUO_API_KEY;
  const from = process.env.QUO_FROM_NUMBER;
  const userId = process.env.QUO_USER_ID;

  if (!apiKey) return { ok: false, error: "QUO_API_KEY is not set" };
  if (!from) return { ok: false, error: "QUO_FROM_NUMBER is not set" };

  try {
    const res = await fetch(quoMessagesUrl(), {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
        from,
        to: [toPhone],
        ...(userId ? { userId } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Quo ${res.status}: ${body.slice(0, 220)}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendCheckoutSmsOnce(input: SendCheckoutSmsInput): Promise<CheckoutSmsResult> {
  const existing = await prisma.smsLog.findUnique({
    where: { stripeSessionId: input.stripeSessionId },
  });

  if (existing) {
    return {
      status: existing.status as CheckoutSmsResult["status"],
      message: existing.message,
      toPhone: existing.toPhone,
      error: existing.error,
      alreadyLogged: true,
    };
  }

  const normalizedPhone = cleanE164UsPhone(input.toPhone);
  const baseLog = {
    stripeSessionId: input.stripeSessionId,
    template: input.template,
    toPhone: normalizedPhone,
    message: input.message,
  };

  if (input.smsOptOut) {
    await prisma.smsLog.create({
      data: {
        ...baseLog,
        status: "skipped_opt_out",
        error: "Buyer chose no SMS receipt",
      },
    });
    return { status: "skipped_opt_out", message: input.message, toPhone: normalizedPhone };
  }

  if (!normalizedPhone) {
    await prisma.smsLog.create({
      data: {
        ...baseLog,
        status: "failed",
        error: "Missing or invalid E.164 phone",
      },
    });
    return {
      status: "failed",
      message: input.message,
      toPhone: null,
      error: "Missing or invalid E.164 phone",
    };
  }

  const sent = await sendViaQuo(normalizedPhone, input.message);
  const status: CheckoutSmsResult["status"] = sent.ok ? "sent" : "failed";

  try {
    await prisma.smsLog.create({
      data: {
        ...baseLog,
        status,
        error: sent.error ?? null,
      },
    });
  } catch {
    const logged = await prisma.smsLog.findUnique({
      where: { stripeSessionId: input.stripeSessionId },
    });
    if (logged) {
      return {
        status: logged.status as CheckoutSmsResult["status"],
        message: logged.message,
        toPhone: logged.toPhone,
        error: logged.error,
        alreadyLogged: true,
      };
    }
    throw new Error("Could not record checkout SMS log");
  }

  return {
    status,
    message: input.message,
    toPhone: normalizedPhone,
    error: sent.error ?? null,
  };
}

export function formatCentralCloseDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function yesNoSplit(yesDollars: number, noDollars: number) {
  const total = Math.max(0, yesDollars + noDollars);
  if (total === 0) return { yes: 0, no: 0 };
  const yes = Math.round((yesDollars / total) * 100);
  return { yes, no: 100 - yes };
}
