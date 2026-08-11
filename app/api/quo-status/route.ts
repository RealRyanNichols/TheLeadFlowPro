import { NextResponse } from "next/server";
import { LEADFLOW_FROM } from "@/lib/quo";

// Read-only identity check for the Quo (OpenPhone) side of the lead pipeline.
//
// This exists because outbound lead texts once went out under the wrong
// person's name and the wrong business logo, and there was no way to see why
// without clicking through the Quo dashboard. This endpoint answers, in one
// request: which number are we sending from, who owns it, and does that match
// the sender we intend.
//
// GET /api/quo-status?secret=<CRON_SECRET>
//
// It never returns the API key. It returns names, emails, and user ids that
// are already visible to any member of the workspace.

export const dynamic = "force-dynamic";

type QuoUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type QuoNumber = {
  id?: string;
  name?: string;
  number?: string;
  formattedNumber?: string;
  users?: QuoUser[];
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const supplied =
    url.searchParams.get("secret") ||
    (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (!cronSecret || supplied !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.QUO_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "QUO_API_KEY is not set" }, { status: 500 });
  }

  const from = process.env.QUO_FROM_NUMBER || LEADFLOW_FROM;
  const pinnedUserId = process.env.QUO_USER_ID || null;

  const r = await fetch("https://api.openphone.com/v1/phone-numbers", {
    headers: { Authorization: key },
    cache: "no-store",
  });

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, status: r.status, error: await r.text().catch(() => "") },
      { status: 502 },
    );
  }

  const payload = (await r.json()) as { data?: QuoNumber[] };
  const numbers = payload.data ?? [];

  const summary = numbers.map((n) => ({
    id: n.id,
    name: n.name,
    number: n.number ?? n.formattedNumber,
    isOurSendingNumber: (n.number ?? "") === from,
    users: (n.users ?? []).map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" "),
      email: u.email,
      role: u.role,
    })),
  }));

  const sending = summary.find((n) => n.isOurSendingNumber);
  // Quo lists the number's owner first. Without QUO_USER_ID set, that is who
  // every API-sent lead text is attributed to.
  const effectiveSender = pinnedUserId
    ? sending?.users.find((u) => u.id === pinnedUserId) ?? { id: pinnedUserId, name: "NOT ON THIS NUMBER" }
    : sending?.users[0];

  return NextResponse.json({
    ok: true,
    sendingFrom: from,
    sendingNumberFound: !!sending,
    quoUserIdPinned: pinnedUserId,
    effectiveSender: effectiveSender ?? null,
    numbers: summary,
  });
}
