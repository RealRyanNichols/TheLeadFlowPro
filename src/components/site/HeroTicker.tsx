"use client";
import { useEffect, useState } from "react";

const STATS = [
  "Recover 30–40% of missed calls automatically",
  "Reply to every lead in under 60 seconds",
  "Turn every missed text into booked revenue",
  "Cut your cost per lead in half with smarter targeting",
  "Turn one post into 5 pieces of content — instantly",
  "An AI chatbot that sounds like you, working 24/7",
  "Every call, text, DM, and form in one unified inbox",
  "Know the next move on every lead — before it goes cold",
  "Fill a slow week with one playbook click",
  "Stop chasing leads — start closing them",
  "Ship ad copy for IG, TikTok, and Facebook — all at once",
  "Win back dead leads with proven re-engage scripts",
  "Monday recap: who to call, what to say, what it's worth",
  "Replace every paper business card with one FlowCard",
  "Free SEO Grader — honest score in 10 seconds"
];

export function HeroTicker() {
  const [i, setI] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setI((prev) => (prev + 1) % STATS.length);
        setFading(false);
      }, 220);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="stat-pill bg-white/5 border border-white/10 text-ink-100 max-w-[92vw] text-sm md:text-base px-4 py-2">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inset-0 rounded-full bg-lead-500 animate-ping opacity-70" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-lead-500" />
      </span>
      <span
        className={
          "transition-opacity duration-200 ease-out whitespace-nowrap overflow-hidden text-ellipsis " +
          (fading ? "opacity-0" : "opacity-100")
        }
      >
        {STATS[i]}
      </span>
    </span>
  );
}
