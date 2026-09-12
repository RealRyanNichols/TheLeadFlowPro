// The addresses a workspace hands out, and the form an owner can paste into
// their own site. Built in one place so the setup wizard and Settings can
// never print two different snippets.

export const SITE = "https://www.theleadflowpro.com";

export function leadEndpoint(token: string): string {
  return `${SITE}/api/hq/in/${token}/lead`;
}

export function metaWebhook(token: string): string {
  return `${SITE}/api/hq/in/${token}/meta`;
}

/** A plain HTML form. No script, no styling, nothing to break on an old site. */
export function formSnippet(token: string, businessName: string): string {
  const thanks = `${SITE}/hq/thanks?b=${encodeURIComponent(businessName || "us")}`;
  return `<form method="post" action="${leadEndpoint(token)}">
  <label for="lf-name">Your name</label>
  <input id="lf-name" name="name" required>

  <label for="lf-phone">Phone</label>
  <input id="lf-phone" name="phone" type="tel" required>

  <label for="lf-email">Email</label>
  <input id="lf-email" name="email" type="email">

  <label for="lf-service">What do you need?</label>
  <input id="lf-service" name="service">

  <label for="lf-message">Tell us about the job</label>
  <textarea id="lf-message" name="message" rows="4"></textarea>

  <label>
    <input type="checkbox" name="consent_sms" value="1">
    It is fine to text me at this number.
  </label>

  <input type="hidden" name="redirect" value="${thanks}">
  <input type="text" name="_hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
  <button type="submit">Send</button>
</form>`;
}
