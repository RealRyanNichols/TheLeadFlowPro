import { emptyPacket, renderPacket } from "@/lib/sellerproof/packet";
export function GET() {
  const p = {
    ...emptyPacket("12345678-1234-4234-8234-123456789012"),
    business: "Example Store (fictional sample)",
    orderId: "EXAMPLE-1001",
    disputeId: "EXAMPLE-DISPUTE",
    amount: "149.00",
    deadline: "2026-10-20",
    description: "Fictional example: a digital template package.",
    statement:
      "This sample shows how to organize a response. All entries are fictional and must be replaced with your own documented facts.",
    events: [
      {
        date: "2026-10-01",
        description: "Example purchase recorded.",
        source: "E1",
      },
      {
        date: "2026-10-02",
        description:
          "Example account access recorded. Access alone does not establish the user's identity.",
        source: "E2",
      },
    ],
    evidence: [
      {
        type: "Receipt" as const,
        title: "Example payment receipt",
        fileName: "example-receipt.pdf",
        date: "2026-10-01",
        note: "Fictional receipt showing a $149.00 purchase. Original file would be attached separately.",
      },
      {
        type: "Usage or access" as const,
        title: "Example activity record",
        fileName: "example-activity.pdf",
        date: "2026-10-02",
        note: "Fictional activity record showing access to the template download. This does not independently prove who accessed the account.",
      },
    ],
  };
  return new Response(renderPacket(p), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}
