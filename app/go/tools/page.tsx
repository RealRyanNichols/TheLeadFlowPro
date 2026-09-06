import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Database,
  Gauge,
  Workflow,
} from "lucide-react";
import ToolStudioFunnel from "./ToolStudioFunnel";

export const metadata: Metadata = {
  title: "Interactive Tools That Create Leads | The LeadFlow Pro",
  description:
    "Build a calculator, quiz, estimator, generator, searchable archive, or lead funnel that your business owns. Start with a $97 blueprint.",
  alternates: { canonical: "https://www.theleadflowpro.com/go/tools" },
  openGraph: {
    title: "Your business needs more than a website.",
    description:
      "Build the tool, capture the lead, and own the system behind it.",
    url: "https://www.theleadflowpro.com/go/tools",
    siteName: "The LeadFlow Pro",
    images: [
      {
        url: "/images/ads/leadflow-free-website-ryan-02-square.png",
        width: 1254,
        height: 1254,
      },
    ],
    type: "website",
  },
};

const PROOF = [
  {
    icon: Gauge,
    title: "Calculators and decision tools",
    text: "ROI, price, savings, profit, grade, capacity, quote, readiness, and industry-specific calculators.",
  },
  {
    icon: Workflow,
    title: "Funnels and automation",
    text: "Forms, branching quizzes, lead routing, email follow-up, appointment paths, and owner alerts.",
  },
  {
    icon: Database,
    title: "Searchable business archives",
    text: "Niche records, resources, articles, locations, FAQs, profiles, and proof organized for people and Google.",
  },
];

export default function ToolStudioPage() {
  return (
    <main className="min-h-screen bg-[#f3efe8] text-[#34313f]">
      <section className="border-b border-[#dbd0c5] bg-[radial-gradient(circle_at_70%_10%,#ede6f3_0%,#f6e9dc_38%,#f3efe8_72%)]">
        <div className="mx-auto grid w-[min(1180px,calc(100%-32px))] gap-10 py-12 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#5135e5]">
              The LeadFlow Tool Studio
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[.94] tracking-[-.055em] text-[#20212b] sm:text-6xl lg:text-7xl">
              Your business needs more than a website.
              <span className="mt-3 block text-[#5135e5]">
                It needs something people use.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#34313f]">
              I build calculators, quizzes, estimators, generators, forms,
              funnels, searchable archives, and automation that turn attention
              into a name, phone number, email address, and clear next step.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#build-menu"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#ffb443] px-5 py-3 text-sm font-black uppercase tracking-wider text-[#20212b] hover:bg-[#ffca76]"
              >
                Build My Tool{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/tools"
                className="inline-flex min-h-12 items-center rounded-xl border border-[#dbd0c5] bg-[#fff9ef] px-5 py-3 text-sm font-black uppercase tracking-wider text-[#20212b] hover:border-[#5135e5]"
              >
                Try the live tools
              </Link>
            </div>
            <div className="mt-7 flex max-w-2xl gap-3 border-t border-[#dbd0c5] pt-5 text-sm leading-6 text-[#625f6d]">
              <BadgeCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-[#23643c]"
                aria-hidden="true"
              />
              <p>
                The $97 entry is a real blueprint with a defined deliverable.
                Finished production starts at $497. No unlimited custom software
                hidden behind a teaser price.
              </p>
            </div>
          </div>
          <figure className="overflow-hidden rounded-[28px] border border-[#5135e5] bg-[#fff9ef] shadow-2xl shadow-[#43364c]/10">
            <Image
              src="/images/ads/leadflow-free-website-ryan-02-square.png"
              alt="Ryan Nichols standing in front of an American flag beside the words Your First Website, zero dollar build fee, you own it"
              width={1254}
              height={1254}
              sizes="(max-width: 1024px) calc(100vw - 32px), 46vw"
              priority
              className="h-auto w-full"
            />
            <figcaption className="border-t border-[#dbd0c5] px-5 py-4 text-xs font-extrabold uppercase tracking-[.16em] text-[#625f6d]">
              The website is the foundation. The system is what makes it work.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="mx-auto w-[min(1180px,calc(100%-32px))] py-16 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[.22em] text-[#5135e5]">
            What I build
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.045em] text-[#20212b] sm:text-5xl">
            Build the useful thing your competitors do not have.
          </h2>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {PROOF.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-[#dbd0c5] bg-[#fff9ef] p-6"
            >
              <Icon className="h-6 w-6 text-[#5135e5]" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-extrabold text-[#20212b]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#625f6d]">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-7 grid gap-3 rounded-2xl border border-emerald-400/20 bg-[#e5eee3] p-6 text-sm leading-6 text-[#34313f] sm:grid-cols-2">
          {[
            "The client owns the approved code, data, leads, and accounts.",
            "Every paid vendor and recurring cost is disclosed before checkout.",
            "No guaranteed leads, sales, ranking, or return on ad spend.",
            "Every build has written inputs, outputs, revisions, and exclusions.",
          ].map((line) => (
            <p key={line} className="flex gap-2">
              <Check
                className="mt-1 h-4 w-4 shrink-0 text-[#23643c]"
                aria-hidden="true"
              />
              {line}
            </p>
          ))}
        </div>
      </section>

      <ToolStudioFunnel />
    </main>
  );
}
