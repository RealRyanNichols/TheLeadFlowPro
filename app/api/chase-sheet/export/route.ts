import { NextResponse } from "next/server";
import * as db from "@/lib/chaseSheet/db";
import { isResponse, requireSheet } from "@/lib/chaseSheet/server";
import { money } from "@/lib/chaseSheet/sheet";

// The owner's quotes as a CSV file. Their data leaves whenever they want it to.

export const runtime = "nodejs";

function cell(value: string | number | null): string {
  const s = value === null ? "" : String(value);
  // A leading formula character is neutralised so a spreadsheet never executes a customer's name.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET() {
  // A lapsed monthly account can still take its own quotes with it.
  const sheet = await requireSheet({ allowLapsed: true });
  if (isResponse(sheet)) return sheet;
  const [quotes, touches] = await Promise.all([db.listQuotes(sheet.client, sheet.email), db.listTouches(sheet.client, sheet.email)]);
  const touchCount = new Map<string, number>();
  for (const t of touches) touchCount.set(t.quoteId, (touchCount.get(t.quoteId) ?? 0) + 1);
  const header = ["customer", "phone", "email", "job", "amount", "sent_on", "urgency", "status", "touches_done", "next_touch", "last_touch", "won_on", "lost_on", "lost_reason", "notes"];
  const lines = [header.join(",")];
  for (const q of quotes) {
    lines.push([
      cell(q.customerName), cell(q.customerPhone), cell(q.customerEmail), cell(q.job), cell(money(q.amountCents)),
      cell(q.sentOn), cell(q.urgency), cell(q.status), cell(touchCount.get(q.id) ?? 0), cell(q.nextOn), cell(q.lastTouchOn),
      cell(q.wonOn), cell(q.lostOn), cell(q.lostReason), cell(q.notes),
    ].join(","));
  }
  return new NextResponse(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chase-sheet-${sheet.today}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
