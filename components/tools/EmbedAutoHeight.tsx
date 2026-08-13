"use client";

// Reports the embed's real content height to the host page so the snippet's
// script can size the iframe, instead of the fixed height clipping tall tools
// and leaving gaps under short ones. The message carries the slug and a pixel
// count, never anything the user typed. Target origin is "*" because embeds run
// on websites we cannot know in advance; the host script verifies OUR origin
// before it trusts the number.

import { useEffect, useRef, type ReactNode } from "react";

export default function EmbedAutoHeight({ slug, children }: { slug: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.parent === window) return;

    let last = 0;
    let frame = 0;

    const post = () => {
      frame = 0;
      // The parent overlay is the scroll container. Measure our own content and
      // add its padding back, because the overlay's scrollHeight never shrinks
      // below the iframe viewport and would leave the gap in place.
      const scroller = el.parentElement;
      let pad = 0;
      if (scroller) {
        const cs = window.getComputedStyle(scroller);
        pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      }
      const height = Math.ceil(el.offsetHeight + pad);
      if (Math.abs(height - last) < 2) return;
      last = height;
      window.parent.postMessage({ type: "leadflowpro:embed-height", slug, height }, "*");
    };

    // Collapse a burst of layout changes into one message per frame.
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(post);
    };

    post();
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [slug]);

  return <div ref={ref}>{children}</div>;
}
