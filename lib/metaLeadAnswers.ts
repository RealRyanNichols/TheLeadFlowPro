import type { MetaFormRegistration } from "@/lib/metaCampaignGuard";

const CONTACT_KEYS = /^(email|phone_number|full_name|first_name|last_name)$/;

/**
 * What a Meta lead told us, one line per answer, for the owner alert and the
 * lead page ("What they told me"). A form registered with answerLabels reads
 * in the words the person saw on the form. Every other form keeps the old
 * "key words: value" line. Contact fields are left out, they have their own
 * lines in the alert.
 */
export function metaAnswerLines(
  fields: Iterable<[string, string]>,
  registration?: Pick<MetaFormRegistration, "answerLabels"> | null,
): string[] {
  const labels = registration?.answerLabels;
  const lines: string[] = [];
  for (const [key, value] of fields) {
    if (CONTACT_KEYS.test(key)) continue;
    const label = labels?.[key];
    lines.push(
      label
        ? `${label.question} ${label.options[value] ?? value}`
        : `${key.replace(/_/g, " ").replace(/\?$/, "")}: ${value}`,
    );
  }
  return lines;
}
