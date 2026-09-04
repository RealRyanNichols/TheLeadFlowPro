"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  GraduationCap,
  Wrench,
} from "lucide-react";
import { track } from "@/lib/analytics/client";

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
const help = [
  {
    id: "build",
    title: "Build it for me",
    detail:
      "Tell us what is getting stuck. We’ll help you scope the next step.",
    icon: Wrench,
  },
  {
    id: "together",
    title: "Show me in person",
    detail: "Bring one real task to the September 17 Longview workshop.",
    icon: Compass,
  },
  {
    id: "self",
    title: "Let me learn at my pace",
    detail: "Start with a free lesson, then choose a focused course.",
    icon: GraduationCap,
  },
] as const;

export default function NextStepGuide() {
  const [need, setNeed] = useState<Need | null>(null);
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
      <div className="lf-choice-grid">
        {need
          ? help.map(({ id, title, detail, icon: Icon }) => {
              const href =
                id === "together"
                  ? "https://workshop.theleadflowpro.com/"
                  : id === "self"
                    ? "/chatgpt/free"
                    : need === "customers"
                      ? "/free-build?utm_source=website&utm_medium=next_step"
                      : "/diagnostic?utm_source=website&utm_medium=next_step";
              return (
                <Link
                  className="lf-choice"
                  key={id}
                  href={href}
                  onClick={() =>
                    track("qualifier_result", { label: `${need}:${id}` })
                  }
                >
                  <Icon aria-hidden="true" />
                  <strong>{title}</strong>
                  <span>{detail}</span>
                  <b>
                    Take this next step{" "}
                    <ArrowRight size={17} aria-hidden="true" />
                  </b>
                </Link>
              );
            })
          : needs.map((item) => (
              <button
                className="lf-choice"
                type="button"
                key={item.id}
                onClick={() => {
                  setNeed(item.id);
                  track("qualifier_answer", { label: item.id });
                }}
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
