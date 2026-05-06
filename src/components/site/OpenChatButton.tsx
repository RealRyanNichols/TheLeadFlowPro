"use client";

import type { ReactNode } from "react";

export function OpenChatButton({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("leadflow:open-chat"))}
      className={className}
    >
      {children}
    </button>
  );
}
