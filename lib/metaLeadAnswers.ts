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

export type ContractorFollowUp = {
  group: "priority" | "funding_review" | "fit_check" | "standard";
  /** First line of "What they told me" in the alert and on the lead page. */
  label: string;
  /** public.leads.priority (allowed: low, normal, high, hot). "hot" stays manual. */
  priority: "high" | "normal" | "low";
};

/**
 * Pat's follow up rule for the v2 contractor form, word for word from his
 * Oct 2 2026 email: "prioritize owners or authorized managers who select the
 * $7,000 investment answer and near-term timing. Keep applicants willing to
 * explore funding in a separate review group. Employee and homeowner
 * inquiries need a fit check." Returns null for any form without his
 * questions, so every other form is untouched.
 */
export function contractorFollowUp(fields: Iterable<[string, string]>): ContractorFollowUp | null {
  const answers = new Map(fields);
  const role = answers.get("role_in_business");
  const invest = answers.get("prepared_to_invest_7000");
  const soon = answers.get("how_soon_more_jobs");
  if (!role && !invest && !soon) return null;
  if (role === "employee_sales_rep" || role === "hiring_a_contractor") {
    return {
      group: "fit_check",
      label: "FOLLOW UP: FIT CHECK. Employee or someone hiring a contractor. Check fit before a strategy call.",
      priority: "low",
    };
  }
  if (invest === "need_funding") {
    return {
      group: "funding_review",
      label: "FOLLOW UP: FUNDING REVIEW. Willing to explore funding. Separate review group.",
      priority: "normal",
    };
  }
  if (
    (role === "owner_partner" || role === "authorized_manager") &&
    invest === "yes_7000" &&
    (soon === "now_30_days" || soon === "one_to_three_months")
  ) {
    return {
      group: "priority",
      label: "FOLLOW UP: PRIORITY. Owner or manager, ready to invest $7,000, near term. Call first.",
      priority: "high",
    };
  }
  return {
    group: "standard",
    label: "FOLLOW UP: STANDARD. Call in order.",
    priority: "normal",
  };
}
