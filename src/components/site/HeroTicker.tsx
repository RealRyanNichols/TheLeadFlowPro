"use client";
import { useEffect, useState } from "react";

const STATS = [
  "Respond to every lead in under 60 seconds",
  "Recover 30–40% of missed calls automatically",
  "Cut ad cost per lead by ~50% with better targeting",
  "Turn 1 post into 5 pieces of content",
  "Your AI chatbot answers 24/7 — in your voice",
  "See every call, text, DM, and form in one inbox",
  "Book more jobs without lifting a finger"
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
    <span className="stat-pill bg-white/5 border border-white/10 text-ink-100 max-w-[92vw]">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inset-0 rounded-full bg-lead-500 animate-ping opacity-70" />
        <span className="relative h-2 w-2 rounded-full bg-lead-500" />
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
