"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_INPUT, drawNext, newShuffleState, normalizeInput } from "@/lib/postCreator/ideas/engine";
import { planMonth } from "@/lib/postCreator/ideas/plan";
import type { EngineInput, IdeaCard, PlanCadence, PlanDay, ShuffleState } from "@/lib/postCreator/ideas/types";
import { makeSeed, readSetup, readShuffle, storageAvailable, writeSetup, writeShuffle } from "./storage";

// The one shuffle the idea machine and the month planner share, so a planned
// month and the next tap of Next idea never show the same idea.
//
// Free mode (the public page) reads the setup fields from this browser and
// saves every change back. Paid mode (the buyer app) takes its settings from
// the saved business profile and never writes them here. Either way the
// shuffle position is kept in this browser only, and nothing leaves it.
//
// Storage is read after the first render, so the server and the browser draw
// the same thing (the "Shuffling ideas..." state) until the browser is ready.

export type PostCreatorMode = "free" | "paid";

export type PostCreatorContextValue = {
  mode: PostCreatorMode;
  input: EngineInput;
  setInput(next: EngineInput): void;
  state: ShuffleState | null;
  /** The next idea for the current settings, or null before the browser is ready. */
  draw(): { card: IdeaCard; wrapped: boolean } | null;
  /** A month of ideas from `start` (YYYY-MM-DD), or null before the browser is ready. */
  plan(start: string, cadence: PlanCadence): PlanDay[] | null;
  /** False when this browser will not keep anything (private browsing or storage off). */
  storageOk: boolean;
  ready: boolean;
  /** True once there is a trade to draw for: always in paid mode, after the first pick in free mode. */
  picked: boolean;
};

const PostCreatorContext = createContext<PostCreatorContextValue | null>(null);

export default function ShuffleProvider({
  mode,
  initialInput,
  children,
}: {
  mode: PostCreatorMode;
  initialInput?: EngineInput;
  children: ReactNode;
}) {
  const [input, setInputState] = useState<EngineInput>(
    () => normalizeInput(mode === "paid" && initialInput ? initialInput : DEFAULT_INPUT).input,
  );
  const [state, setState] = useState<ShuffleState | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState(mode === "paid");

  // Event handlers read these, so two quick taps never draw from a stale state.
  const inputRef = useRef(input);
  const stateRef = useRef<ShuffleState | null>(null);

  useEffect(() => {
    const ok = storageAvailable();
    const saved = ok ? readShuffle() : null;
    const shuffle = saved ?? newShuffleState(makeSeed());
    if (!saved) writeShuffle(shuffle);
    stateRef.current = shuffle;
    setState(shuffle);
    setStorageOk(ok);
    if (mode === "free") {
      const setup = readSetup();
      if (setup) {
        inputRef.current = setup;
        setInputState(setup);
        setPicked(true);
      }
    }
    setReady(true);
  }, [mode]);

  // Paid mode follows the profile: a saved change in Settings reaches the
  // machine without a reload. Keyed on the value, not the object, so a parent
  // that rebuilds the same settings on every render changes nothing.
  const initialKey = mode === "paid" && initialInput ? JSON.stringify(initialInput) : "";
  useEffect(() => {
    if (!initialKey) return;
    const next = normalizeInput(JSON.parse(initialKey)).input;
    inputRef.current = next;
    setInputState(next);
  }, [initialKey]);

  const setInput = useCallback(
    (raw: EngineInput) => {
      const next = normalizeInput(raw).input;
      inputRef.current = next;
      setInputState(next);
      setPicked(true);
      if (mode === "free") writeSetup(next);
    },
    [mode],
  );

  const commit = useCallback((next: ShuffleState) => {
    stateRef.current = next;
    setState(next);
    writeShuffle(next);
  }, []);

  const draw = useCallback(() => {
    const current = stateRef.current;
    if (!current) return null;
    const next = drawNext(inputRef.current, current);
    commit(next.state);
    return { card: next.card, wrapped: next.wrapped };
  }, [commit]);

  const plan = useCallback(
    (start: string, cadence: PlanCadence) => {
      const current = stateRef.current;
      if (!current) return null;
      const result = planMonth(inputRef.current, current, start, cadence);
      if (result.days.length) commit(result.state);
      return result.days;
    },
    [commit],
  );

  const value = useMemo<PostCreatorContextValue>(
    () => ({ mode, input, setInput, state, draw, plan, storageOk, ready, picked }),
    [mode, input, setInput, state, draw, plan, storageOk, ready, picked],
  );

  return <PostCreatorContext.Provider value={value}>{children}</PostCreatorContext.Provider>;
}

/** The shared idea machine state. Only inside a ShuffleProvider. */
export function usePostCreator(): PostCreatorContextValue {
  const ctx = useContext(PostCreatorContext);
  if (!ctx) throw new Error("usePostCreator must be used inside a ShuffleProvider.");
  return ctx;
}

/** The same, or null outside a ShuffleProvider, for parts that also work on their own. */
export function useOptionalPostCreator(): PostCreatorContextValue | null {
  return useContext(PostCreatorContext);
}
