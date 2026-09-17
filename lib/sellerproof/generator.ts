// The SellerProof generator: structured intake in, an assembled packet out.
//
// Everything printed comes from what the seller typed. An empty field is
// rendered as a labelled gap and listed under "missing", never filled in.
// Files never pass through here: an evidence item may carry the name, size,
// and SHA-256 fingerprint of the original the seller attaches in their
// provider's dashboard, computed in their browser, so the packet can name
// exactly which file goes with which entry. Document preparation only.

import { DISCLAIMER, EVIDENCE_TYPES, REVIEW_ITEMS, emptyPacket, evidenceChecklist, packetGaps, purchaseErrors, responseDraft, type Attachment, type Packet } from "./packet";

export const PREPARATION_NOTICE = "SellerProof prepares documents from the facts you enter. It is not legal advice, it does not verify evidence, and it never submits a dispute for you.";

export type PacketSection = {
  id: "response" | "timeline" | "evidence" | "attachments" | "missing" | "review";
  title: string;
  /** Plain text, already assembled. */
  body: string;
  /** Number of labelled gaps inside this section. */
  gaps: number;
};

export type AssembledPacket = {
  sections: PacketSection[];
  missing: string[];
  completeness: Completeness;
  attachments: AttachmentLine[];
  disclaimer: string;
};

export type Completeness = {
  /** 0 to 100, from the four intake areas below. Never a prediction of the outcome. */
  score: number;
  areas: { key: "order" | "communications" | "delivery_or_use" | "policy"; label: string; present: boolean; how: string }[];
};

export type AttachmentLine = {
  ref: string;
  title: string;
  fileName: string | null;
  attached: Attachment | null;
  /** What the seller still has to do for this item. */
  todo: string | null;
};

/** How complete the intake is across the four things every dispute response leans on. */
export function intakeCompleteness(p: Packet): Completeness {
  const has = (type: (typeof EVIDENCE_TYPES)[number]) => p.evidence.some((e) => e.type === type && !!e.title && !!e.note);
  const orderPresent = !!p.orderId && !!p.amount && Number(p.amount) > 0 && !!p.description && has("Receipt");
  const commsPresent = has("Customer messages");
  const deliveryPresent = p.productType === "Physical goods" ? has("Delivery") : has("Usage or access");
  const policyPresent = has("Terms or policy");
  const areas: Completeness["areas"] = [
    { key: "order", label: "Order", present: orderPresent, how: "Order reference, amount, what was bought, and a receipt entry with a description." },
    { key: "communications", label: "Communications", present: commsPresent, how: "A customer-messages entry that says what the conversation shows, with dates." },
    { key: "delivery_or_use", label: p.productType === "Physical goods" ? "Delivery" : "Usage or access", present: deliveryPresent, how: p.productType === "Physical goods" ? "Carrier or delivery records for this order." : "Dated access, download, completion, or service records." },
    { key: "policy", label: "Policy", present: policyPresent, how: "The terms or policy the customer saw at purchase." },
  ];
  const score = Math.round((areas.filter((a) => a.present).length / areas.length) * 100);
  return { score, areas };
}

/** Which original file goes with which evidence entry, and what is still owed. */
export function attachmentManifest(p: Packet): AttachmentLine[] {
  return p.evidence.map((e, i) => {
    const ref = `E${i + 1}`;
    const attached = e.attached ?? null;
    const fileName = attached?.name ?? (e.fileName || null);
    let todo: string | null = null;
    if (!e.title || !e.note) todo = "Describe the source before naming a file for it.";
    else if (!fileName) todo = "Name the original file you will upload to your provider.";
    else if (!attached) todo = "Fingerprint the file in the builder so the packet names the exact copy you upload.";
    return { ref, title: e.title || "[Untitled evidence]", fileName, attached, todo };
  });
}

export function formatFingerprint(a: Attachment): string {
  const kb = a.size >= 1_048_576 ? `${(a.size / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(a.size / 1024))} KB`;
  return `${a.name} (${kb}, SHA-256 ${a.sha256.slice(0, 12)}…${a.sha256.slice(-8)})`;
}

const count = (text: string) => (text.match(/\[[^\]]+\]/g) ?? []).length;

export function assemblePacket(p: Packet): AssembledPacket {
  const missing = packetGaps(p);
  const draft = responseDraft(p);
  const [head, ...rest] = draft.split("\n\nTimeline supplied by merchant\n");
  const timelineAndEvidence = rest.join("\n\nTimeline supplied by merchant\n");
  const [timeline, evidence] = timelineAndEvidence.split("\n\nEvidence index\n");
  const manifest = attachmentManifest(p);
  const attachmentsBody = manifest.length
    ? manifest.map((m) => `${m.ref}. ${m.title}: ${m.attached ? formatFingerprint(m.attached) : m.fileName ?? "[no file named]"}${m.todo ? ` — ${m.todo}` : ""}`.replace(" — ", ". ")).join("\n")
    : "[No evidence entered.]";
  const sections: PacketSection[] = [
    { id: "response", title: "Merchant response", body: head, gaps: count(head) },
    { id: "timeline", title: "Timeline supplied by merchant", body: timeline ?? "[No timeline entered.]", gaps: count(timeline ?? "[x]") },
    { id: "evidence", title: "Evidence index", body: evidence ?? "[No evidence entered.]", gaps: count(evidence ?? "[x]") },
    { id: "attachments", title: "Files you attach yourself", body: attachmentsBody, gaps: manifest.filter((m) => m.todo).length },
    { id: "missing", title: "Missing before you submit", body: missing.length ? missing.map((m) => `- ${m}`).join("\n") : "Nothing flagged by the checklist. Authenticity and acceptance are not verified.", gaps: missing.length },
    { id: "review", title: "Before you submit", body: REVIEW_ITEMS.map((r, i) => `${i + 1}. ${r}`).join("\n"), gaps: 0 },
  ];
  return { sections, missing, completeness: intakeCompleteness(p), attachments: manifest, disclaimer: `${DISCLAIMER} ${PREPARATION_NOTICE}` };
}

/** Purchase readiness in plain words: what the seller must enter before the paid export makes sense. */
export function readinessSummary(p: Packet): { ready: boolean; blockers: string[] } {
  const blockers = purchaseErrors(p);
  return { ready: blockers.length === 0, blockers };
}

/** The fictional sample every public page shows. No real business, order, or person. */
export function samplePacket(): Packet {
  return {
    ...emptyPacket("12345678-1234-4234-8234-123456789012"),
    business: "Example Store (fictional sample)",
    orderId: "EXAMPLE-1001",
    disputeId: "EXAMPLE-DISPUTE",
    amount: "149.00",
    deadline: "2026-10-20",
    description: "Fictional example: a digital template package.",
    statement: "This sample shows how to organize a response. All entries are fictional and must be replaced with your own documented facts.",
    events: [
      { date: "2026-10-01", description: "Example purchase recorded.", source: "E1" },
      { date: "2026-10-02", description: "Example account access recorded. Access alone does not establish the user's identity.", source: "E2" },
    ],
    evidence: [
      {
        type: "Receipt",
        title: "Example payment receipt",
        fileName: "example-receipt.pdf",
        date: "2026-10-01",
        note: "Fictional receipt showing a $149.00 purchase. Original file would be attached separately.",
        attached: { name: "example-receipt.pdf", size: 48_211, type: "application/pdf", sha256: "0000000000000000000000000000000000000000000000000000000000000000" },
      },
      {
        type: "Usage or access",
        title: "Example activity record",
        fileName: "example-activity.pdf",
        date: "2026-10-02",
        note: "Fictional activity record showing access to the template download. This does not independently prove who accessed the account.",
      },
    ],
  };
}

export { evidenceChecklist };
