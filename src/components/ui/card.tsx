import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "panel" | "shell" | "dashboard" | "flat";

const cardVariants: Record<CardVariant, string> = {
  panel: "lead-panel",
  shell: "lead-shell",
  dashboard: "rounded-lg border border-white/10 bg-[#060a11]/90 shadow-2xl shadow-black/35",
  flat: "rounded-lg border border-white/10 bg-white/[0.035]",
};

export function Card({
  as: Tag = "section",
  variant = "panel",
  className,
  children,
}: {
  as?: "section" | "article" | "div";
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn(cardVariants[variant], className)} data-component="Card" data-variant={variant}>
      {children}
    </Tag>
  );
}
