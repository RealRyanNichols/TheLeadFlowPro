export type FormAttribution = {
  formType: string;
  sourcePage: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  createdAt: string;
};

function pickStr(v: FormDataEntryValue | null, max = 300): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function extractFormAttribution(
  form: FormData,
  fallback: { formType: string; sourcePage: string },
): FormAttribution {
  return {
    formType: pickStr(form.get("formType"), 120) ?? fallback.formType,
    sourcePage:
      pickStr(form.get("sourcePage"), 240) ??
      pickStr(form.get("landingPage"), 240) ??
      fallback.sourcePage,
    utmSource: pickStr(form.get("utm_source"), 120),
    utmMedium: pickStr(form.get("utm_medium"), 120),
    utmCampaign: pickStr(form.get("utm_campaign"), 160),
    utmContent: pickStr(form.get("utm_content"), 180),
    utmTerm: pickStr(form.get("utm_term"), 180),
    createdAt: new Date().toISOString(),
  };
}

export function attributionNoteBlock(attribution: FormAttribution) {
  return [
    `form_type: ${attribution.formType}`,
    `source_page: ${attribution.sourcePage}`,
    `utm_source: ${attribution.utmSource ?? "not provided"}`,
    `utm_medium: ${attribution.utmMedium ?? "not provided"}`,
    `utm_campaign: ${attribution.utmCampaign ?? "not provided"}`,
    `utm_content: ${attribution.utmContent ?? "not provided"}`,
    `utm_term: ${attribution.utmTerm ?? "not provided"}`,
    `created_at: ${attribution.createdAt}`,
    "status: new",
  ].join("\n");
}
