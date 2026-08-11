"use client";

// The Longview Mall walk. Ryan explaining business to a stranger, unscripted.
// It is the strongest trust asset on the site, so it sits directly under the
// hero on the ad landing page: people meet the man before they meet the form.
//
// Click to play on purpose. Nothing from facebook.com loads until the visitor
// asks for it, so the page this ad pays for stays fast and does not ship a
// third party tracker to every cold click. The poster is a real frame from the
// video, self hosted, so the card shows a handshake instead of a black box
// even before anyone taps. Swap FB_REEL_URL for a self hosted MP4 the day we
// have the original file and this stops depending on Meta at all.

import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";

const VIDEO_ID = "1869359370397748";

// Humans get the reel link. The embed does NOT: plugins/video.php renders a
// black box for /reel/ URLs and plays fine for watch/?v= URLs. Tested both on
// the live site. Do not "simplify" this back to one URL.
const FB_REEL_URL = `https://www.facebook.com/reel/${VIDEO_ID}`;
const FB_WATCH_URL = `https://www.facebook.com/watch/?v=${VIDEO_ID}`;
const EMBED_SRC = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
  FB_WATCH_URL
)}&show_text=false&autoplay=true&width=400&height=711`;

export default function MallWalkVideo({ onStart }: { onStart?: () => void }) {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="mx-auto mt-12 w-[min(1000px,100%-40px)]">
      <div className="text-center">
        <p className="text-xs font-black tracking-[0.2em] text-sky-300">
          BEFORE YOU DECIDE, MEET ME
        </p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          I walked the Longview Mall and explained business
          <br className="hidden sm:block" /> the way people can actually see it.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          No script. No studio. Just me talking to a business owner the same way I
          will talk to you. If you like how I think here, you will like what I
          build for you.
        </p>
      </div>

      <div className="mt-7 flex justify-center">
        <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <div className="relative aspect-[9/16] w-full">
            {playing ? (
              <iframe
                src={EMBED_SRC}
                className="absolute inset-0 h-full w-full"
                style={{ border: "none", overflow: "hidden" }}
                scrolling="no"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                title="Ryan Nichols walking the Longview Mall talking business"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Play the Longview Mall walk video"
                className="group absolute inset-0 block h-full w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/proof/mall-walk-poster.jpg"
                  alt="Ryan Nichols shaking hands with a business owner inside the Longview Mall"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35" />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-500 shadow-[0_0_50px_-5px_rgba(14,165,233,0.9)] transition group-hover:scale-110">
                    <Play
                      aria-hidden="true"
                      className="ml-1 h-9 w-9 fill-white text-white"
                    />
                  </span>
                </span>
                <span className="absolute inset-x-0 bottom-0 px-5 pb-5 text-center">
                  <span className="block text-lg font-extrabold text-white drop-shadow">
                    Watch the mall walk
                  </span>
                  <span className="mt-1 block text-xs font-semibold tracking-wide text-slate-300">
                    8 min 39 sec · sound on
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-slate-400">
        Watched it and you are in?{" "}
        <button
          type="button"
          onClick={onStart}
          className="font-bold text-sky-300 underline"
        >
          Start your free build
        </button>{" "}
        or text me at{" "}
        <a href="tel:+19035008898" className="font-bold text-sky-300 underline">
          (903) 500-8898
        </a>
        .
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">
        Trouble playing it here?{" "}
        <a
          href={FB_REEL_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-slate-400 underline"
        >
          Watch it on Facebook
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
      </p>
    </section>
  );
}
