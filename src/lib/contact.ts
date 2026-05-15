export const LEADFLOW_PUBLIC_EMAIL = "Hello@TheLeadFlowPro.com";
export const LEADFLOW_FROM_EMAIL = "hello@theleadflowpro.com";

export function leadflowMailto(subject: string, body = "") {
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  return `mailto:${LEADFLOW_PUBLIC_EMAIL}?${params.toString()}`;
}
