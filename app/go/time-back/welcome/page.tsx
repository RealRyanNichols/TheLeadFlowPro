import type { Metadata } from "next";
import WelcomeFlow from "./WelcomeFlow";
import PurchasePing from "@/components/PurchasePing";

// The post-purchase page for Time Back orders. Stripe sends buyers here
// after payment. One job: collect everything the build team needs to start,
// and walk the owner through granting access the official way. No passwords,
// ever. Same warm palette as /go/time-back.

export const metadata: Metadata = {
  title: "Welcome | Your Time Back Build Starts Here",
  description:
    "Payment received. Tell us about your business, confirm your platforms, grant official partner access, and give us your voice. No passwords, ever.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TimeBackWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  return (
    <main className="cb-page">
      <PurchasePing sessionId={sessionId} />
      <style>{`
        .tb-grad-border {
          border: 1px solid transparent;
          background:
            linear-gradient(180deg, #fff9ef, #f6e9dc) padding-box,
            linear-gradient(165deg, #dbd0c5, #ede6f3 40%, #dbd0c5) border-box;
        }
        .tb-price-hero {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          box-shadow: inset 0 1px 0 #ffffff1f, 0 16px 40px #43364c14;
        }
        .tb-price-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: radial-gradient(120% 60% at 50% 0%, #5135e52b, transparent 62%);
          pointer-events: none;
        }
        .tb-panel-glass { box-shadow: inset 0 1px 0 #ffffff14, 0 12px 32px #43364c0f; }
        .tb-card-on {
          border-color: transparent;
          background:
            linear-gradient(180deg, #ede6f3, #f6e9dc) padding-box,
            linear-gradient(150deg, #5135e5, #a18add 45%, #5135e5) border-box;
          box-shadow: inset 0 1px 0 #ffffff1f, 0 8px 20px #43364c14;
        }
      `}</style>
      <div className="tb-warm bg-[#f3efe8] pb-20">
        <WelcomeFlow />
      </div>
    </main>
  );
}
