"use client";

// Saving what a tool produced.
//
// Downloading is free and always has been the point of a free tool. None of
// these ask for a name, a phone number or an email. The only thing that asks for
// an email is having the result sent to you, or being sent the embed code, and
// that is because those genuinely need somewhere to send it.

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, type = "text/plain") {
  downloadBlob(filename, new Blob([text], { type: `${type};charset=utf-8` }));
}

/** Excel opens CSV by guessing, so quote everything and keep the BOM. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
  downloadBlob(filename, new Blob([`﻿${body}`], { type: "text/csv;charset=utf-8" }));
}

export function downloadSvg(filename: string, svg: string) {
  downloadBlob(filename, new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
}

export function downloadCanvasPng(filename: string, canvas: HTMLCanvasElement) {
  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(filename, blob);
      resolve();
    }, "image/png");
  });
}

/** Calendar files need CRLF line endings or half the calendar apps reject them. */
export function downloadIcs(filename: string, ics: string) {
  const normalized = ics.replace(/\r?\n/g, "\r\n");
  downloadBlob(filename, new Blob([normalized], { type: "text/calendar;charset=utf-8" }));
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard is blocked in some embed contexts. Fall back to a selection so
    // the user can still copy by hand rather than hitting a dead button.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Printing is how you get a PDF without shipping a PDF library to every visitor.
 * The print stylesheet in globals.css hides the site chrome, so the sheet that
 * comes out is the tool, the numbers and the assumptions.
 */
export function printResult() {
  window.print();
}
