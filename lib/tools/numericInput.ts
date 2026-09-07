import type { Field, Values } from "./types";

/** Reject invalid numeric inputs before they can become a plausible-looking
 * zero, overflow, or unbounded export loop. Slider bounds describe each model's
 * supported domain; text/document fields retain their existing validation. */
export function numericInputIssue(
  fields: Field[],
  values: Values,
): string | null {
  for (const field of fields) {
    const selected = values[field.id];
    if (
      field.type === "select" &&
      selected !== undefined &&
      !field.options.some((option) => option.value === String(selected))
    )
      return `${field.label}: choose one of the available options.`;
    if (
      field.type === "checks" &&
      selected !== undefined &&
      (!Array.isArray(selected) ||
        selected.some(
          (value) => !field.options.some((option) => option.value === value),
        ))
    )
      return `${field.label}: choose only the listed options.`;
    if (!["money", "number", "slider"].includes(field.type)) continue;
    const raw = values[field.id];
    if (raw === undefined) continue;
    const value =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw.trim()
          ? Number(raw)
          : NaN;
    if (!Number.isFinite(value))
      return `${field.label}: enter a finite number.`;
    const min = field.type === "slider" ? field.min : 0;
    const max = field.type === "slider" ? field.max : 1_000_000_000_000;
    if (field.type === "slider" && field.step === 1 && !Number.isInteger(value))
      return `${field.label}: enter a whole number.`;
    if (value < min || value > max)
      return `${field.label}: enter a number from ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}.`;
  }
  return null;
}

/** A valid input can still overflow when multiplied by another input. Refuse
 * numeric exports whose magnitude cannot safely retain the represented units. */
export function numericResultIssue(result: unknown): string | null {
  const issue =
    "These inputs produce amounts beyond the supported precision. Reduce the values or use a smaller reporting period before exporting.";
  if (typeof result === "number") {
    return !Number.isFinite(result) ||
      Math.abs(result) > Number.MAX_SAFE_INTEGER
      ? issue
      : null;
  }
  if (typeof result === "string") {
    for (const match of result.matchAll(/\$\s*(-?[\d,]+(?:\.\d+)?)/g)) {
      const amount = Number(match[1].replaceAll(",", ""));
      if (
        !Number.isFinite(amount) ||
        Math.abs(amount) > Number.MAX_SAFE_INTEGER / 100
      )
        return issue;
    }
    return null;
  }
  if (result && typeof result === "object") {
    for (const child of Object.values(result)) {
      const invalid = numericResultIssue(child);
      if (invalid) return invalid;
    }
  }
  return null;
}
