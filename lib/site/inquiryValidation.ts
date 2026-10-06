// Small browser-safe checks for the two public conversation forms.
// These never send a request or replace server validation.
export type InquiryErrors = Record<string, string>;

/** Phone follow-up needs the separate permission; email remains available to everyone. */
export function consultationReplyMethod(
  form: FormData,
): "text" | "call" | "email" {
  const preference = form.get("best_contact_method");
  return form.get("sms_consent") === "on" &&
    inquiryText(form, "phone") &&
    (preference === "text" || preference === "call")
    ? preference
    : "email";
}

export function inquiryText(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export function validateConversationForm(
  form: FormData,
  kind: "contact" | "consultation",
): InquiryErrors {
  const errors: InquiryErrors = {};
  const nameField = kind === "contact" ? "visitor_name" : "full_name";
  const emailField = kind === "contact" ? "visitor_email" : "email";
  const messageField = kind === "contact" ? "body" : "goals";
  const name = inquiryText(form, nameField);
  const email = inquiryText(form, emailField);
  const message = inquiryText(form, messageField);
  if (!name || name.length > 200) errors[nameField] = "Enter your name.";
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors[emailField] = "Enter an email address, such as you@business.com.";
  if (!message || message.length > (kind === "contact" ? 2500 : 1800))
    errors[messageField] =
      kind === "contact"
        ? "Tell Ryan what you need help with."
        : "Tell Ryan what is getting in the way.";
  if (kind === "consultation") {
    const business = inquiryText(form, "business_name");
    const phone = inquiryText(form, "phone");
    if (!business || business.length > 200)
      errors.business_name = "Enter your business name.";
    if (!phone && form.get("sms_consent") === "on")
      errors.phone =
        "Add your mobile number before giving call or text permission.";
    else if (
      phone &&
      (phone.length > 50 ||
        !/^\+?[\d().\s-]+$/.test(phone) ||
        !/^\d{10,15}$/.test(phone.replace(/\D/g, "")))
    )
      errors.phone = "Enter your phone number with its area or country code.";
  }
  return errors;
}
