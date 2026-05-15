import { LegalDocumentView } from "@/components/site/LegalDocumentView";
import { PRIVACY_POLICY } from "@/lib/legal-documents";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: PRIVACY_POLICY.title,
  description: PRIVACY_POLICY.description,
  path: PRIVACY_POLICY.path,
  imageTitle: PRIVACY_POLICY.h1,
  imageSubtitle: "Data handling, tracking, client information, and account ownership.",
});

export default function PrivacyPolicyPage() {
  return <LegalDocumentView document={PRIVACY_POLICY} />;
}
