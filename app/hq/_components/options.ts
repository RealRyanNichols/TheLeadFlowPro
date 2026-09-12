// The two dropdowns that show up in both the setup wizard and Settings.
// Kept in one place so the wizard cannot offer a zone Settings refuses.

export const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (no daylight saving)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
];

export const INDUSTRIES: string[] = [
  "Plumbing",
  "HVAC",
  "Electrical",
  "Roofing",
  "Landscaping and lawn",
  "Cleaning",
  "Pest control",
  "Painting",
  "Flooring",
  "Remodeling and construction",
  "Garage doors",
  "Pool service",
  "Moving",
  "Auto repair",
  "Towing",
  "Dental",
  "Medical or clinic",
  "Chiropractic",
  "Veterinary",
  "Law",
  "Accounting and tax",
  "Insurance",
  "Real estate",
  "Salon and spa",
  "Fitness and training",
  "Photography",
  "Event services",
  "Other",
];

export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
}
