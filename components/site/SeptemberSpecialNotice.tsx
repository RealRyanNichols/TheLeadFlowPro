"use client";

import { usd } from "@/lib/site/prices";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PRICE_CENTS, ENDS_AT, STARTS_AT } from "@/lib/septemberSpecial";

export default function SeptemberSpecialNotice() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (now === null || now >= Date.parse(ENDS_AT)) return null;
  const upcoming = now < Date.parse(STARTS_AT);
  return (
    <Link href="/september-special" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#1240e8] px-5 py-3 text-center text-xs font-bold leading-5 text-white sm:text-sm">
      <span>September special: {usd(PRICE_CENTS / 100)} one time · 5 businesses</span>
      <span className="font-medium">{upcoming ? "Opens tonight at 6 p.m. Central" : "Start checkout by Sept. 24 at 6 p.m. Central"} →</span>
    </Link>
  );
}
