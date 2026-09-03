"use client";

import { useRef, useState } from "react";
import { Check, ImageUp, Trash2 } from "lucide-react";
import { clearBrandKit, readLogoFile, saveBrandKit } from "@/lib/brandKit";
import type { BrandKit } from "@/lib/tools/types";

// Step one of every kit. Filled in once, remembered on this device, reused by
// every other kit. Nothing here is uploaded or stored on a server.

const FIELDS: { id: keyof BrandKit; label: string; placeholder: string; type?: string }[] = [
  { id: "brand_name", label: "Business name", placeholder: "Kirby Plumbing" },
  { id: "brand_phone", label: "Phone", placeholder: "(903) 555-0142", type: "tel" },
  { id: "brand_email", label: "Email", placeholder: "office@kirbyplumbing.com", type: "email" },
  { id: "brand_site", label: "Website", placeholder: "kirbyplumbing.com" },
  { id: "brand_city", label: "City you serve", placeholder: "Longview, Texas" },
];

const SWATCHES = ["#1240E8", "#0B5A33", "#B3261E", "#5B3BC4", "#0E6F96", "#9A4A12", "#0E1A2E"];

export default function BrandKitPanel({
  kit,
  onChange,
}: {
  kit: BrandKit;
  onChange: (next: BrandKit) => void;
}) {
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(id: keyof BrandKit, value: string) {
    const next = { ...kit, [id]: value };
    onChange(next);
    saveBrandKit(next);
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setLogoError(null);
    try {
      const dataUrl = await readLogoFile(file);
      if (!dataUrl) {
        setLogoError("That file is too big once encoded. Try a smaller logo.");
        return;
      }
      set("brand_logo", dataUrl);
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Could not read that file.");
    }
  }

  return (
    <div className="pro-brand">
      <div className="pro-brand-head">
        <div>
          <h3>Your brand kit</h3>
          <p>
            Fill this in once. Every kit on this site uses it, and it stays in this browser.
            Nothing here is uploaded.
          </p>
        </div>
        {kit.brand_name.trim() ? (
          <button
            type="button"
            className="pro-brand-clear"
            onClick={() => {
              clearBrandKit();
              onChange({
                brand_name: "",
                brand_phone: "",
                brand_email: "",
                brand_site: "",
                brand_city: "",
                brand_color: "",
                brand_logo: "",
              });
            }}
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>

      <div className="pro-brand-grid">
        {FIELDS.map((f) => (
          <label key={f.id} className="pro-field">
            <span>{f.label}</span>
            <input
              type={f.type ?? "text"}
              value={kit[f.id]}
              placeholder={f.placeholder}
              maxLength={200}
              autoComplete="off"
              onChange={(e) => set(f.id, e.target.value)}
            />
          </label>
        ))}

        <div className="pro-field">
          <span>Brand color</span>
          <div className="pro-swatches">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use ${c}`}
                aria-pressed={kit.brand_color.toLowerCase() === c.toLowerCase()}
                className="pro-swatch"
                style={{ background: c }}
                onClick={() => set("brand_color", c)}
              >
                {kit.brand_color.toLowerCase() === c.toLowerCase() ? (
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                ) : null}
              </button>
            ))}
            <input
              type="color"
              aria-label="Pick a custom brand color"
              className="pro-swatch pro-swatch-input"
              value={/^#[0-9a-fA-F]{6}$/.test(kit.brand_color) ? kit.brand_color : "#1240E8"}
              onChange={(e) => set("brand_color", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pro-logo-row">
        {kit.brand_logo ? (
          // Not next/image: this is a browser-local data URL that never
          // touches the image optimizer, and it is replaced as the user types.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pro-logo-preview" src={kit.brand_logo} alt="Your logo" />
        ) : (
          <span className="pro-logo-empty" aria-hidden="true" />
        )}
        <div>
          <button type="button" className="button-secondary" onClick={() => fileRef.current?.click()}>
            <ImageUp aria-hidden="true" className="h-4 w-4" />
            {kit.brand_logo ? "Change logo" : "Add your logo"}
          </button>
          {kit.brand_logo ? (
            <button type="button" className="pro-brand-clear ml-2" onClick={() => set("brand_logo", "")}>
              Remove
            </button>
          ) : null}
          <p className="pro-logo-note">
            PNG, JPG or SVG. It is resized in your browser and printed onto every document.
          </p>
          {logoError ? (
            <p role="alert" className="pro-logo-error">
              {logoError}
            </p>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(e) => {
            void onLogo(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
