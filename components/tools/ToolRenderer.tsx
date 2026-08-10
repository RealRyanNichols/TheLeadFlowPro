import MissedCallCalculator from "./MissedCallCalculator";
import ReviewLinkTool from "./ReviewLinkTool";
import RentReceiptCalculator from "./RentReceiptCalculator";

export default function ToolRenderer({ slug }: { slug: string }) {
  switch (slug) {
    case "missed-call-calculator":
      return <MissedCallCalculator />;
    case "google-review-link":
      return <ReviewLinkTool />;
    case "rent-receipt":
      return <RentReceiptCalculator />;
    default:
      return null;
  }
}
