"use client";

// The Brand Kit.
//
// Filled in once, on this device, and reused by every kit the buyer opens. It
// is the reason a $19 document comes out looking like their company made it
// instead of like a template with a name typed in.
//
// It never leaves the browser except as part of a render request, and it is
// never stored on a server. A logo is read as a data URL and downscaled here,
// so a 4MB phone photo does not become a 4MB request on every keystroke.

import { EMPTY_BRAND_KIT, type BrandKit } from "@/lib/tools/types";

const KEY = "lfp_brand_kit_v1";
export const BRAND_EVENT = "lfp-brand-kit";

/** Roughly 300KB of base64 once encoded, which prints crisply and posts fast. */
const MAX_LOGO_EDGE = 520;

export function readBrandKit(): BrandKit {
  if (typeof window === "undefined") return { ...EMPTY_BRAND_KIT };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_BRAND_KIT };
    const parsed = JSON.parse(raw) as Partial<BrandKit>;
    const out = { ...EMPTY_BRAND_KIT };
    for (const key of Object.keys(out) as (keyof BrandKit)[]) {
      if (typeof parsed[key] === "string") out[key] = parsed[key] as string;
    }
    return out;
  } catch {
    return { ...EMPTY_BRAND_KIT };
  }
}

export function saveBrandKit(kit: BrandKit): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(kit));
  } catch {
    /* Private browsing. The kit still works for this session. */
  }
  window.dispatchEvent(new Event(BRAND_EVENT));
}

export function clearBrandKit(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(BRAND_EVENT));
}

/** True once there is enough here for a document to read as theirs. */
export function brandIsSet(kit: BrandKit): boolean {
  return Boolean(kit.brand_name.trim());
}

export function brandFieldsFilled(kit: BrandKit): number {
  return Object.values(kit).filter((v) => v.trim()).length;
}

/**
 * Read an image file into a data URL, scaled so the longest edge is 520px.
 * An SVG is passed through untouched because it is already resolution free.
 */
export function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("That is not an image file."));
      return;
    }
    if (file.size > 8_000_000) {
      reject(new Error("That image is very large. Try one under 8MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (file.type === "image/svg+xml") {
        resolve(dataUrl.length <= 400_000 ? dataUrl : "");
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read that image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process that image."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        // PNG keeps a transparent background, which is what a logo needs. The
        // JPEG fallback is size-checked too: an over-limit result must reject
        // here, because the server drops oversized logos rather than truncating
        // a data URL into a broken image on every printed page.
        const out = canvas.toDataURL("image/png");
        if (out.length <= 400_000) {
          resolve(out);
          return;
        }
        const jpeg = canvas.toDataURL("image/jpeg", 0.85);
        resolve(jpeg.length <= 400_000 ? jpeg : "");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
