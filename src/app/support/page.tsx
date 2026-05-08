import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { HeartHandshake, MessageSquareText, RadioTower, ShieldCheck } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { createSeoMetadata } from "@/lib/seo-metadata";
import { prisma } from "@/lib/prisma";
import { SupportDonationForm } from "./SupportDonationForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createSeoMetadata({
  title: "Support The LeadFlow Pro",
  description:
    "Support Ryan Nichols and The LeadFlow Pro vision. Choose an amount, choose a focus area, and leave a public supporter comment.",
  path: "/support",
  imageTitle: "Support The LeadFlow Pro",
  imageSubtitle: "Help build tools, dashboards, community connectors, and proof-backed systems.",
});

type Props = { searchParams?: { donation?: string } };

export default async function SupportPage({ searchParams }: Props) {
  const donations = await (prisma as any).supportDonation.findMany({
    where: { status: "paid", showPublic: true },
    orderBy: { paidAt: "desc" },
    take: 20,
  }).catch(() => []);

  const total = donations.reduce((sum: number, donation: any) => sum + Number(donation.amountCents || 0), 0);
  const success = searchParams?.donation === "success";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fff8f1_0%,#eef9ff_44%,#fff1df_100%)] text-slate-950">
      <LightHeader />

      <main>
        <section className="relative overflow-hidden border-b border-cyan-200/70">
          <div className="absolute -right-24 -top-32 h-[520px] w-[520px] rounded-full bg-cyan-300/35 blur-3xl" />
          <div className="absolute -left-24 -bottom-40 h-[480px] w-[480px] rounded-full bg-accent-300/30 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:py-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                <HeartHandshake className="h-3.5 w-3.5" /> Support the build
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Believe in the vision, even if you are not buying a service today.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
                Some people need a service. Some people just want to help The LeadFlow Pro build
                tools, live data systems, community connectors, and proof-backed experiments that
                show business owners what is possible.
              </p>

              {success ? (
                <div className="mt-5 rounded-3xl border border-cyan-300 bg-cyan-50/90 p-5 text-cyan-950 shadow-[0_24px_60px_-34px_rgba(8,145,178,0.45)]">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                    <div>
                      <h2 className="font-semibold">Support received.</h2>
                      <p className="mt-1 text-sm leading-relaxed text-cyan-900/80">
                        If you left a public comment, it will show on the wall after Stripe confirms payment.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Stat icon={RadioTower} label="Live systems" value="Track" />
                <Stat icon={MessageSquareText} label="Support notes" value={donations.length.toString()} />
                <Stat icon={HeartHandshake} label="Public support" value={`$${Math.round(total / 100).toLocaleString()}`} />
              </div>

              <div className="mt-6 rounded-3xl border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.75)]">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  What this funds
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Live dashboards, client portals, the Stump Me build lab, community connector
                  tools, share tracking, and public experiments that turn one page, one post, or one
                  ad into measurable attention.
                </p>
              </div>
            </div>

            <SupportDonationForm />
          </div>
        </section>

        <section className="border-b border-cyan-200/70 bg-[linear-gradient(135deg,#eef9ff_0%,#fff8f1_56%,#f3eaff_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  Supporter wall
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Comments that stay live.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                Public comments show after successful payment. Ryan can hide spam or private information.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {donations.length > 0 ? donations.map((donation: any) => (
                <div key={donation.id} className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_20px_55px_-32px_rgba(15,23,42,0.45)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{donation.displayName || "Anonymous supporter"}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cyan-700">
                        {String(donation.focus || "where-needed").replaceAll("-", " ")}
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-cyan-100">
                      ${Math.round(Number(donation.amountCents || 0) / 100).toLocaleString()}
                    </div>
                  </div>
                  {donation.comment ? (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {donation.comment}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm leading-relaxed text-slate-500">
                      Supported the mission without a public note.
                    </p>
                  )}
                </div>
              )) : (
                <div className="rounded-3xl border border-dashed border-cyan-300 bg-white/70 p-6 text-sm leading-relaxed text-slate-600">
                  No public supporter comments yet. The first paid public comment will show here.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
