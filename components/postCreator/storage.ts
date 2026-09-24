// Post Creator: what the free idea machine keeps in this browser.
//
// Three things live in localStorage and nowhere else: the shuffle (a seed and
// a place per set of settings, so a reload picks up where it left off), the
// setup fields, and the ideas and drafts the owner saved. None of it is sent
// to a server.
//
// Private browsing, a full disk, or a blocked storage setting makes
// localStorage throw, so every read and write here is guarded and returns a
// safe default instead. The idea machine keeps working without storage; it
// just cannot keep its place after the tab closes. Saved items fall back to
// memory for the life of the tab.

import { normalizeInput, parseShuffleState } from "@/lib/postCreator/ideas/engine";
import type { EngineInput, ShuffleState } from "@/lib/postCreator/ideas/types";

export const STORAGE_KEYS = {
  shuffle: "lfp_post_creator_shuffle_v1",
  setup: "lfp_post_creator_setup_v1",
  saved: "lfp_post_creator_saved_v1",
} as const;

export type SavedItem = { id: string; savedAt: string; kind: "idea" | "draft"; title: string; text: string };

/** The most saved items kept. The oldest go first. */
export const MAX_SAVED = 200;

/** Fired on window whenever this tab changes the saved list, so every list on the page can reload. */
export const SAVED_EVENT = "lfp-post-creator-saved";

const TITLE_MAX = 200;
const TEXT_MAX = 6000;
const PROBE_KEY = "lfp_post_creator_probe";

// Saved items when storage refuses them, so Save still works until the tab closes.
let memorySaved: SavedItem[] = [];

function store(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function drop(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    // Nothing to clear when storage is off.
  }
}

function announceSaved(): void {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(SAVED_EVENT));
  } catch {
    // A list that misses one update reloads on the next change.
  }
}

/** True when this browser lets the page keep anything between visits. */
export function storageAvailable(): boolean {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(PROBE_KEY, "1");
    s.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** A random 32-bit seed for a fresh shuffle. */
export function makeSeed(): number {
  try {
    const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    if (c && typeof c.getRandomValues === "function") {
      const buf = new Uint32Array(1);
      c.getRandomValues(buf);
      return buf[0] >>> 0;
    }
  } catch {
    // Fall through to Math.random.
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

export function readShuffle(): ShuffleState | null {
  const raw = read(STORAGE_KEYS.shuffle);
  return raw ? parseShuffleState(raw) : null;
}

export function writeShuffle(s: ShuffleState): boolean {
  return write(STORAGE_KEYS.shuffle, JSON.stringify(s));
}

/** The saved setup fields, cleaned, or null when nothing (or nothing readable) is saved. */
export function readSetup(): EngineInput | null {
  const raw = read(STORAGE_KEYS.setup);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return normalizeInput(parsed).input;
  } catch {
    return null;
  }
}

export function writeSetup(i: EngineInput): boolean {
  return write(STORAGE_KEYS.setup, JSON.stringify(normalizeInput(i).input));
}

function isSavedItem(x: unknown): x is SavedItem {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.savedAt === "string" &&
    (r.kind === "idea" || r.kind === "draft") &&
    typeof r.title === "string" &&
    typeof r.text === "string"
  );
}

/** Saved ideas and drafts, newest first. */
export function readSaved(): SavedItem[] {
  const raw = read(STORAGE_KEYS.saved);
  if (raw === null) return memorySaved.slice();
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedItem).slice(0, MAX_SAVED) : [];
  } catch {
    return [];
  }
}

function persistSaved(list: SavedItem[]): SavedItem[] {
  memorySaved = write(STORAGE_KEYS.saved, JSON.stringify(list)) ? [] : list.slice();
  announceSaved();
  return list;
}

function newId(): string {
  return `${Date.now().toString(36)}-${makeSeed().toString(36)}`;
}

/**
 * Save an idea or a draft at the top of the list and return the new list.
 * Saving the same text again moves it to the top instead of keeping two.
 */
export function saveItem(i: Omit<SavedItem, "id" | "savedAt">): SavedItem[] {
  const item: SavedItem = {
    id: newId(),
    savedAt: new Date().toISOString(),
    kind: i.kind === "draft" ? "draft" : "idea",
    title: String(i.title ?? "").slice(0, TITLE_MAX),
    text: String(i.text ?? "").slice(0, TEXT_MAX),
  };
  const rest = readSaved().filter((s) => !(s.kind === item.kind && s.title === item.title && s.text === item.text));
  return persistSaved([item, ...rest].slice(0, MAX_SAVED));
}

export function removeSaved(id: string): SavedItem[] {
  return persistSaved(readSaved().filter((s) => s.id !== id));
}

export function clearSaved(): void {
  drop(STORAGE_KEYS.saved);
  memorySaved = [];
  announceSaved();
}
