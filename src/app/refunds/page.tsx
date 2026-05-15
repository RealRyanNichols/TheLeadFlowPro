import { LegalDocumentView } from "@/components/site/LegalDocumentView";
import { REFUND_POLICY } from "@/lib/legal-documents";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: REFUND_POLICY.title,
  description: REFUND_POLICY.description,
  path: REFUND_POLICY.path,
  imageTitle: REFUND_POLICY.h1,
  imageSubtitle: "Refund rules for audits, deposits, custom builds, subscriptions, and delivered work.",
});

export default function RefundsPage() {
  return <LegalDocumentView document={REFUND_POLICY} />;
}
