import { LegalDocumentView } from "@/components/site/LegalDocumentView";
import { TERMS_OF_SERVICE } from "@/lib/legal-documents";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: TERMS_OF_SERVICE.title,
  description: TERMS_OF_SERVICE.description,
  path: TERMS_OF_SERVICE.path,
  imageTitle: TERMS_OF_SERVICE.h1,
  imageSubtitle: "Audits, builds, ownership, handoff, responsible use, and no outcome guarantees.",
});

export default function TermsPage() {
  return <LegalDocumentView document={TERMS_OF_SERVICE} />;
}
