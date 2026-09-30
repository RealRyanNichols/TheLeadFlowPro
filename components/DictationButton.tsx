"use client";

// Tap-to-talk for note fields. Uses the browser's built-in speech
// recognition (Chrome, Edge, Safari). On browsers without it, renders
// nothing, so the form works exactly as before. A 44px square, so it is an
// easy thumb target on a phone. Used on the Sales Desk lead page and the
// call card's note.
//
// The browser hands over the last words a moment after it is told to stop,
// so "listening" stays true until it says it has finished (its end event),
// or STOP_GRACE_MS after a stop if a browser never sends one. A form that
// must not save half a sentence can wait for onListeningChange(false), and
// can stop the mic itself through the ref's stop().

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Mic, Square } from "lucide-react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/** What a form can ask of the mic. */
export type DictationHandle = {
  /** Stop listening. Words already spoken still arrive through onText before listening ends. */
  stop: () => void;
};

/** How long to wait for the browser's end event after a stop before treating the mic as off. */
export const STOP_GRACE_MS = 3000;

function getRecognizer(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "en-US";
  r.continuous = true;
  r.interimResults = false;
  return r;
}

type MicState = "idle" | "listening" | "stopping";

export default function DictationButton({
  onText,
  onListeningChange,
  ref,
}: {
  onText: (text: string) => void;
  /** True when listening starts; false once the browser has handed over the last words and stopped. */
  onListeningChange?: (listening: boolean) => void;
  ref?: Ref<DictationHandle>;
}) {
  const [supported, setSupported] = useState(false);
  const [mic, setMic] = useState<MicState>("idle");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const onListeningRef = useRef(onListeningChange);
  onListeningRef.current = onListeningChange;

  useEffect(() => {
    setSupported(getRecognizer() !== null);
    return () => {
      recRef.current?.stop();
      if (graceRef.current) clearTimeout(graceRef.current);
    };
  }, []);

  useEffect(() => {
    onListeningRef.current?.(mic !== "idle");
  }, [mic]);

  /** The browser has finished (or stopped answering): the mic is off. */
  function finish(rec: SpeechRecognitionLike) {
    if (recRef.current !== rec) return;
    if (graceRef.current) clearTimeout(graceRef.current);
    graceRef.current = null;
    recRef.current = null;
    setMic("idle");
  }

  function stop() {
    const rec = recRef.current;
    if (!rec || graceRef.current) return;
    setMic("stopping");
    rec.stop();
    graceRef.current = setTimeout(() => finish(rec), STOP_GRACE_MS);
  }

  // The handle stays the same object; it always runs this render's stop.
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useImperativeHandle(ref, () => ({ stop: () => stopRef.current() }), []);

  if (!supported) return null;

  function toggle() {
    if (mic === "listening") {
      stop();
      return;
    }
    if (mic === "stopping") return;
    const rec = getRecognizer();
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onTextRef.current(result[0].transcript.trim());
      }
    };
    rec.onend = () => finish(rec);
    rec.onerror = () => finish(rec);
    rec.start();
    setMic("listening");
  }

  const on = mic !== "idle";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mic === "stopping" ? "Finishing dictation" : on ? "Stop dictation" : "Dictate a note"}
      aria-busy={mic === "stopping" || undefined}
      title={on ? "Stop dictation" : "Talk to text"}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
        on
          ? "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]"
          : "border-[var(--line-strong)] text-[var(--muted)] hover:border-[var(--accent-line)] hover:text-[var(--blue)]"
      }`}
    >
      {on ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
