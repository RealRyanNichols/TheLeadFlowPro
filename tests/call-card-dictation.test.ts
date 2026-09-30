import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { withSpokenText } from "../app/admin/call-sheet/CallOutcomePanel.tsx";
import { NEXT_STEP_NOTE_MAX } from "../lib/callCloser.ts";

// The call card's note has a tap-to-talk button (components/DictationButton.tsx).
// Spoken words are added to the end of the note, never replace it, stop at
// the note's limit, and are not kept while a save is in flight.

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

function importsOf(text: string): string[] {
  return [...text.matchAll(/(?:^|\n)\s*import\s+(?:type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g)].map((m) => m[1]);
}

test("call card note: tap-to-talk adds to the end, never replaces, and stops at the limit", () => {
  assert.equal(withSpokenText("", "they want a quote"), "they want a quote");
  assert.equal(withSpokenText("Talked.", "  wants a quote Friday  "), "Talked. wants a quote Friday");
  assert.equal(withSpokenText("Talked.   ", "then asked about price"), "Talked. then asked about price");
  assert.equal(withSpokenText("Keep this", "   "), "Keep this", "silence changes nothing");
  // A new line Ryan started is kept.
  assert.equal(withSpokenText("Line one\n", "line two"), "Line one\nline two");
  assert.equal(withSpokenText("Line one\n  ", "line two"), "Line one\nline two");
  const long = "x".repeat(NEXT_STEP_NOTE_MAX - 3);
  assert.equal(withSpokenText(long, "more words").length, NEXT_STEP_NOTE_MAX);
});

test("call card note: the mic sits with the note, inside the lock that freezes the form during a save", () => {
  const panel = src("app/admin/call-sheet/CallOutcomePanel.tsx");
  assert.ok(importsOf(panel).includes("@/components/DictationButton"));
  const lock = panel.slice(panel.indexOf("<SavingLock busy={busy}>"), panel.indexOf("</SavingLock>"));
  const mic = lock.indexOf("<DictationButton");
  assert.ok(mic > 0 && mic < lock.indexOf("id={ids.note}"), "the mic is by the note's label, inside the lock");
  assert.match(lock, /onText=\{\(spoken\) => \{\s*if \(busy\) return;\s*setNote\(\(current\) => withSpokenText\(current, spoken\)\);/);
  // A 44px square, like every other target on the card.
  assert.match(src("components/DictationButton.tsx"), /\bh-11 w-11\b/);
});

test("call card note: Save with the mic still on stops the mic and waits, so the last words are never cut off", () => {
  const panel = src("app/admin/call-sheet/CallOutcomePanel.tsx");
  const from = panel.slice(panel.indexOf("async function save("));
  const save = from.slice(0, from.indexOf("\n  }\n"));
  const held = save.indexOf("if (dictating) {");
  assert.ok(held > 0 && held < save.indexOf("JSON.stringify(body)"), "the hold comes before the note is read for saving");
  assert.match(save, /if \(dictating\) \{\s*micRef\.current\?\.stop\(\);\s*setMicHeld\(true\);\s*return;\s*\}/);
  // The mic reports itself on until its last words have arrived, and the line by Save says what to do.
  assert.match(panel, /onListeningChange=\{\(on\) => \{\s*setDictating\(on\);/);
  assert.match(panel, /The mic is off\. Check the note, then tap Save the call\./);
  // Save's own rule is unchanged: off while an outcome is missing, busy, or in the sample.
  assert.match(panel, /disabled=\{sample \|\| busy \|\| !outcome\}/);

  const button = src("components/DictationButton.tsx");
  assert.match(button, /export const STOP_GRACE_MS = 3000;/);
  // "Listening" ends on the browser's end event (or after the grace period), never the moment stop is tapped.
  assert.match(button, /rec\.onend = \(\) => finish\(rec\);/);
  const stop = button.slice(button.indexOf("function stop() {"), button.indexOf("\n  }\n", button.indexOf("function stop() {")));
  assert.match(stop, /setMic\("stopping"\);\s*rec\.stop\(\);\s*graceRef\.current = setTimeout\(\(\) => finish\(rec\), STOP_GRACE_MS\);/);
  assert.ok(!/setMic\("idle"\)/.test(stop), "stop alone never reports the mic off");
});
