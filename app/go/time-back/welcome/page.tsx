import type { Metadata } from "next";
import WelcomeFlow from "./WelcomeFlow";

// The post-purchase page for Time Back orders. Stripe sends buyers here
// after payment. One job: collect everything the build team needs to start,
// and walk the owner through granting access the official way. No passwords,
// ever. Same dark glass theme as /go/time-back.

export const metadata: Metadata = {
  title: "Welcome | Your Time Back Build Starts Here",
  description:
    "Payment received. Tell us about your business, confirm your platforms, grant official partner access, and give us your voice. No passwords, ever.",
  robots: { index: false, follow: false },
};

export default function TimeBackWelcomePage() {
  return (
    <main className="cb-page">
      <style>{`
        .tb-dark h1, .tb-dark h2, .tb-dark h3 { color: #f4f6fa !important; }
        .tb-grad-border {
          border: 1px solid transparent;
          background:
            linear-gradient(180deg, #16233d, #0d1628) padding-box,
            linear-gradient(165deg, #5b87ff8c, #ffffff24 40%, #1240e880) border-box;
        }
        .tb-price-hero {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          box-shadow: inset 0 1px 0 #ffffff1f, 0 0 50px #1240e83d;
        }
        .tb-price-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: radial-gradient(120% 60% at 50% 0%, #5b87ff2b, transparent 62%);
          pointer-events: none;
        }
        .tb-panel-glass { box-shadow: inset 0 1px 0 #ffffff14, 0 0 60px #1240e81f; }
        .tb-card-on {
          border-color: transparent;
          background:
            linear-gradient(180deg, #1d2c50, #16233f) padding-box,
            linear-gradient(150deg, #5b87ffcc, #5b87ff40 45%, #1240e8b3) border-box;
          box-shadow: inset 0 1px 0 #ffffff1f, 0 0 24px #5b87ff33;
        }
      `}</style>
      <div className="tb-dark bg-[#0a1220] pb-20">
        <WelcomeFlow />
      </div>
    </main>
  );
}
