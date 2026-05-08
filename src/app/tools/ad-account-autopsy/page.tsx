import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  CheckCircle2,
  MousePointerClick,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { AdAccountAutopsyTool } from "./AdAccountAutopsyTool";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Facebook Ad Account Autopsy — The LeadFlow Pro",
  description:
    "Use the free Ad Account Autopsy to see whether your ads are scaling, leaking, or disconnected from follow-up, booking, sales, and owner-visible data.",
  path: "/tools/ad-account-autopsy",
  imageTitle: "Ad Account Autopsy",
  imageSubtitle: "Find the leak between ad spend, clicks, leads, bookings, sales, and follow-up.",
});

const BUILDS = [
  "Ad source trail from campaign to booked call",
  "Missed-call and form follow-up automation",
  "Owner dashboard showing leads, speed, status, and sales movement",
  "Landing-page fixes that remove confusion before the click dies",
];

export default function AdAccountAutopsyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/pulse" />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #fff8f1 0%, #eef9ff 42%, #f3eaff 72%, #fff1df 100%)",
            }}
          />
          <div aria-hidden className="absolute -right-24 -top-32 h-[520px] w-[520px] rounded-full bg-cyan-300/35 blur-3xl" />
          <div aria-hidden className="absolute -bottom-40 -left-24 h-[480px] w-[480px] rounded-full bg-accent-300/35 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-10">
            <Link
              href="/pulse"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-800 hover:text-cyan-950"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Live Pulse
            </Link>

            <div className="mt-5 grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                  <BarChart3 className="h-3.5 w-3.5" /> Free data tool
                </div>
                <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                  Facebook ads do not fail at the click.{" "}
                  <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                    They fail in the system after the click.
                  </span>
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-slate-700">
                  Put in rough numbers from an ad account. This shows whether the money trail is
                  connected or whether the business is buying traffic that dies in forms, calls,
                  texts, slow replies, or invisible follow-up.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_30px_80px_-36px_rgba(15,23,42,0.72)]">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                  What Ryan builds from this
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {BUILDS.map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm leading-relaxed text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #eaf9ff 0%, #fff8f1 48%, #f8fbff 100%)",
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-10">
            <AdAccountAutopsyTool />
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 md:grid-cols-3">
            <InfoCard
              Icon={MousePointerClick}
              title="Clicks are not customers"
              body="An ad account can show a click, but the business needs to know whether the click became a lead, call, booking, checkout, or dead end."
            />
            <InfoCard
              Icon={Bot}
              title="Automation has to be owned"
              body="The follow-up system should live inside your accounts, your CRM, your calendar, your phone flow, and your reporting."
            />
            <InfoCard
              Icon={ShieldCheck}
              title="No percentage grab"
              body="You pay Ryan to build and implement the system. Your leads, ads, follow-up, and sales process stay yours."
            />
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function InfoCard({
  Icon,
  title,
  body,
}: {
  Icon: typeof Zap;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50/60 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)]">
      <Icon className="h-6 w-6 text-cyan-700" />
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
