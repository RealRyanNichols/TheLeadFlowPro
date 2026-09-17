"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  GraduationCap,
  Megaphone,
  Wrench,
} from "lucide-react";
import { track } from "@/lib/analytics/client";

// The homepage chooser. Two answers, four doors. The workshop door reads the
// featured event's state from the server so it never advertises a date that
// has already passed, and the agency door is the "run it for me" lane that
// sits beside the free website, never in front of it.

export type NextStepEvent = {
  status: "upcoming" | "sold_out" | "past";
  shortDate: string;
  detailsHref: string;
};

const needs = [
  {
    id: "customers",
    title: "I need more customers",
    detail: "A better website, more inquiries, and follow-up that gets done.",
  },
  {
    id: "time",
    title: "I need more time back",
    detail: "Less repetitive work. A simpler way to run the business.",
  },
  {
    id: "learn",
    title: "I want to learn how",
    detail: "Make sense of the tools and put one of them to work.",
  },
] as const;
type Need = (typeof needs)[number]["id"];

export default function NextStepGuide({ event }: { event: NextStepEvent }) {
  const [need, setNeed] = useState<Need | null>(null);

  const workshopDetail =
    event.status === "past"
      ? "Join the list for the next Longview workshop, or start with the free lesson."
      : event.status === "sold_out"
        ? `The ${event.shortDate} workshop is sold out. Join the list for the next date.`
        : `Bring one real task to the ${event.shortDate} Longview workshop.`;
  const workshopHref = event.status === "upcoming" ? event.detailsHref : "#next-workshop";

  const help = [
    {
      id: "build",
      title: "Build it for me",
      detail: "Tell us what is getting stuck. We’ll help you scope the next step.",
      icon: Wrench,
      href:
        need === "customers"
          ? "/free-build?utm_source=website&utm_medium=next_step"
          : "/diagnostic?utm_source=website&utm_medium=next_step",
    },
    {
      id: "agency",
      title: "Run it for me",
      detail: "Ads, content, follow-up, and media handled in accounts you own.",
      icon: Megaphone,
      href: "/agency?utm_source=website&utm_medium=next_step",
    },
    {
      id: "together",
      title: "Show me in person",
      detail: workshopDetail,
      icon: Compass,
      href: workshopHref,
    },
    {
      id: "self",
      title: "Let me learn at my pace",
      detail: "Start with a free lesson, then choose a focused course.",
      icon: GraduationCap,
      href: "/chatgpt/free",
    },
  ] as const;

  return (
    <div className="lf-next-guide" aria-live="polite">
      <div className="lf-guide-top">
        <span>{need ? "02 / HOW YOU WANT HELP" : "01 / WHAT YOU NEED"}</span>
        {need && (
          <button type="button" onClick={() => setNeed(null)}>
            <ArrowLeft size={16} aria-hidden="true" /> Change answer
          </button>
        )}
      </div>
      <h3>
        {need
          ? "Good. How would you like to move forward?"
          : "Could you use a hand with one of these?"}
      </h3>
      <div className={`lf-choice-grid${need ? " lf-choice-grid--four" : ""}`}>
        {need
          ? help.map(({ id, title, detail, icon: Icon, href }) => (
              <Link
                className="lf-choice"
                key={id}
                href={href}
                onClick={() => track("qualifier_result", { label: `${need}:${id}` })}
                data-cta="qualifier_result"
                data-cta-placement={`${need}:${id}`}
              >
                <Icon aria-hidden="true" />
                <strong>{title}</strong>
                <span>{detail}</span>
                <b>
                  Take this next step <ArrowRight size={17} aria-hidden="true" />
                </b>
              </Link>
            ))
          : needs.map((item) => (
              <button
                className="lf-choice"
                type="button"
                key={item.id}
                onClick={() => {
                  setNeed(item.id);
                  track("qualifier_answer", { label: item.id });
                }}
                data-cta="qualifier_answer"
                data-cta-placement={item.id}
              >
                <Check aria-hidden="true" />
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <b>
                  Yes, that’s me <ArrowRight size={17} aria-hidden="true" />
                </b>
              </button>
            ))}
      </div>
      <p className="lf-guide-note">
        No technical knowledge needed. Choose what matters to you. Any free
        website application is reviewed for fit and scope.
      </p>
    </div>
  );
}
