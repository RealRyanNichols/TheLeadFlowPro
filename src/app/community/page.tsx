import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  HandHeart,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = createSeoMetadata({
  title: "Community Connector — The LeadFlow Pro",
  description:
    "A practical East Texas connector page for people looking for work, side jobs, leads, and local opportunities. Private submissions are reviewed before anything is shared.",
  path: "/community",
  imageTitle: "Community Connector",
  imageSubtitle: "Connecting people who need work with people who need help.",
});

type CommunityPageProps = {
  searchParams?: { submitted?: string };
};

const STEPS = [
  "Tell us if you need work or have work to offer.",
  "Give enough detail to make the connection useful.",
  "Ryan reviews it before anything private gets shared publicly.",
  "If there is a fit, the connection moves toward a real conversation.",
];

const EXAMPLES = [
  "Odd jobs and side work",
  "Local hiring leads",
  "Weekend projects",
  "Church or ministry needs",
  "Small business help",
  "Skilled trade referrals",
  "Cleaning, moving, hauling",
  "Admin, phone, social, or content help",
];

export default function CommunityPage({ searchParams }: CommunityPageProps) {
  const submitted = searchParams?.submitted === "1";

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #fff8f1 0%, #eef9ff 38%, #f3eaff 72%, #fff1df 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-28 -top-32 h-[520px] w-[520px] rounded-full bg-cyan-300/35 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-40 -left-24 h-[480px] w-[480px] rounded-full bg-accent-300/30 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:py-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                <HandHeart className="h-3.5 w-3.5" /> Community connector
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Connect people who need work with people who need help.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
                The LeadFlow Pro is about moving people from no money, wrong money, or no
                connections into better connections, better knowledge, and better opportunities.
                This page is a simple local connector for that.
              </p>

              {submitted ? (
                <div className="mt-5 rounded-3xl border border-cyan-300 bg-cyan-50/90 p-5 text-cyan-950 shadow-[0_24px_60px_-34px_rgba(8,145,178,0.45)]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                    <div>
                      <h2 className="font-semibold">Submission received.</h2>
                      <p className="mt-1 text-sm leading-relaxed text-cyan-900/80">
                        Ryan can review it. Nothing private is published automatically.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {STEPS.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur"
                  >
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-cyan-200">
                      {index + 1}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <CommunityConnectorForm />
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  What belongs here
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Real help, real work, real connections.
                </h2>
                <p className="mt-3 text-slate-700">
                  This is not a gossip board and not a handout wall. It is a reviewed connector:
                  people who need a chance to work, and people who need honest help, can meet in a
                  more organized way.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {EXAMPLES.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4 text-sm font-semibold text-slate-800"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-3">
            <ValueCard
              Icon={ShieldCheck}
              title="Reviewed first"
              body="Names, phone numbers, screenshots, and private needs do not get published automatically."
            />
            <ValueCard
              Icon={Users}
              title="Connection focused"
              body="The goal is practical: work leads, hiring leads, side jobs, referrals, and useful introductions."
            />
            <ValueCard
              Icon={Sparkles}
              title="Can become a tool"
              body="If the data shows people use it, Ryan can turn it into a live board, job map, SMS list, or local opportunity tracker."
            />
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function CommunityConnectorForm() {
  return (
    <form
      action="/api/community-connect"
      method="POST"
      className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.38)] backdrop-blur"
    >
      <VisitorIdField />
      <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
        <BriefcaseBusiness className="h-3.5 w-3.5" /> Start here
      </div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">Tell us what connection you need.</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Keep it simple, but give enough detail to help Ryan make a useful connection.
      </p>

      <div className="mt-5 grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <RadioCard name="requestType" value="need-work" title="I need work" body="Side jobs, leads, odd jobs, local work, or a chance to earn." defaultChecked />
          <RadioCard name="requestType" value="offer-work" title="I have work" body="I need help, I am hiring, or I know an opportunity." />
        </div>

        <TextField name="fullName" label="Your name" placeholder="First and last" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="email" label="Email" placeholder="you@example.com" type="email" required />
          <TextField name="phone" label="Phone" placeholder="+1 903 000 0000" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="city" label="City / area" placeholder="Longview, Harleton, Marshall..." />
          <TextField name="workType" label="Type of work or lead" placeholder="Moving, cleaning, admin, sales, weekend work..." required />
        </div>
        <TextArea
          name="details"
          label="What do you need people to know?"
          placeholder="If you need work, say what you can do and when. If you have work, say what you need done, where, and whether it pays."
          required
        />
        <TextArea
          name="availability"
          label="Availability, pay range, or timing"
          placeholder="Example: evenings and weekends, this week only, $15-$25/hr, project-based, call first, text only."
        />

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <input
            type="checkbox"
            name="acknowledgment"
            value="yes"
            required
            className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span>
            I understand this is a community connection request, not a guarantee of work, money,
            hiring, safety, or outcome. I also understand private details are reviewed before any
            public sharing.
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-950 via-brand-950 to-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:from-brand-950 hover:to-slate-950"
        >
          Send the connection request <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function RadioCard({
  name,
  value,
  title,
  body,
  defaultChecked,
}: {
  name: string;
  value: string;
  title: string;
  body: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-50">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      <span className="block text-sm font-semibold text-slate-950">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{body}</span>
    </label>
  );
}

function TextField({
  name,
  label,
  placeholder,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        name={name}
        rows={4}
        maxLength={1800}
        required={required}
        placeholder={placeholder}
        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function ValueCard({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <Icon className="h-6 w-6 text-cyan-200" />
      <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}
