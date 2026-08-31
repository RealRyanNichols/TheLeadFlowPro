import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function ChatGPTCourseWelcomePage() {
  return (
    <main className="cb-page">
      <section className="cb-band">
        <div className="cb-shell" style={{ maxWidth: 760, paddingTop: 96, paddingBottom: 96, textAlign: "center" }}>
          <CheckCircle2 aria-hidden="true" style={{ width: 48, height: 48, color: "#13735d", marginBottom: 18 }} />
          <p className="cb-eyebrow">Payment received</p>
          <h1>Now connect your login to The ChatGPT Operator.</h1>
          <p>Use the exact email address from checkout. Your course access is attached to that email after Stripe confirms the payment.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
            <Link className="cb-btn cb-btn--primary" href="/login?next=/training/chatgpt-operator">Create or open your login</Link>
            <Link className="cb-btn cb-btn--ghost" href="/training/chatgpt-operator">Open the course</Link>
          </div>
          <p style={{ marginTop: 24, color: "#52627e", fontSize: 13 }}>If access has not appeared yet, wait one minute and refresh. The same instructions will be sent by email.</p>
        </div>
      </section>
    </main>
  );
}
