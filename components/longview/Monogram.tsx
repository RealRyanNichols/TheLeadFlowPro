import { categoryColor, monogramInitials } from "@/lib/longviewDirectory/display";

// Cover art without photos: the category colour and the business's initials.
// Decorative only (the name is always in text next to it), so it is hidden
// from assistive technology. White initials clear 4.5:1 on every colour.

type MonogramProps = {
  name: string;
  category: string;
  variant?: "card" | "cover";
};

export default function Monogram({ name, category, variant = "card" }: MonogramProps) {
  const initials = monogramInitials(name);
  const color = categoryColor(category);
  if (variant === "cover") {
    return (
      <svg
        className="lvd-cover"
        viewBox="0 0 960 300"
        preserveAspectRatio="xMinYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern id="lvd-cover-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="960" height="300" fill={color} />
        <rect width="960" height="300" fill="url(#lvd-cover-grid)" />
        <circle cx="840" cy="40" r="200" fill="#ffffff" fillOpacity="0.07" />
        <circle cx="840" cy="40" r="120" fill="#ffffff" fillOpacity="0.07" />
        <text x="60" y="154" dominantBaseline="central" fill="#ffffff" fontSize="150">
          {initials}
        </text>
      </svg>
    );
  }
  return (
    <svg className="lvd-mono" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      <rect width="56" height="56" rx="14" fill={color} />
      <text x="28" y="29" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="22">
        {initials}
      </text>
    </svg>
  );
}
