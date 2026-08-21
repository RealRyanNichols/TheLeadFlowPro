"use client";

// Arms the scroll-entrance system for /go/time-back. Elements opt in with
// data-tbr (reveal alone) or data-tbr-group (children stagger in). Without
// JavaScript nothing is ever hidden, and prefers-reduced-motion never arms.

import { useEffect } from "react";

export default function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tbr], [data-tbr-group]"),
    );
    if (!targets.length) return;
    document.body.classList.add("tb-armed");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("tb-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    targets.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      document.body.classList.remove("tb-armed");
    };
  }, []);
  return null;
}
