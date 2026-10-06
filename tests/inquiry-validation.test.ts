import assert from "node:assert/strict";
import test from "node:test";
import {
  consultationReplyMethod,
  inquiryText,
  validateConversationForm,
} from "../lib/site/inquiryValidation.ts";
function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const contact = {
  visitor_name: " A Business Owner ",
  visitor_email: " owner@example.com ",
  body: " A question about my business. ",
};
const consultation = {
  full_name: "Business Owner",
  email: "owner@example.com",
  business_name: "Example Company",
  phone: "+1 (903) 555-0100",
  goals: "Improve inquiry follow-up.",
};
test("conversation forms accept ordinary names, trimmed email and a real question", () => {
  assert.deepEqual(validateConversationForm(form(contact), "contact"), {});
  assert.equal(inquiryText(form(contact), "body"), contact.body.trim());
  assert.deepEqual(
    validateConversationForm(form(consultation), "consultation"),
    {},
  );
});
test("whitespace alone is not a message even when optional context exists", () => {
  const result = validateConversationForm(
    form({ ...contact, body: " \n ", visitor_phone: "9035550100" }),
    "contact",
  );
  assert.ok(result.body);
  assert.ok(
    validateConversationForm(form({ ...contact, visitor_name: " " }), "contact")
      .visitor_name,
  );
});
test("field errors catch malformed email and limits before transport", () => {
  assert.ok(
    validateConversationForm(
      form({ ...contact, visitor_email: "owner@" }),
      "contact",
    ).visitor_email,
  );
  assert.ok(
    validateConversationForm(
      form({ ...contact, body: "a".repeat(2501) }),
      "contact",
    ).body,
  );
  assert.ok(
    validateConversationForm(
      form({ ...consultation, goals: "a".repeat(1801) }),
      "consultation",
    ).goals,
  );
});
test("consultation phone and business checks preserve international formatting", () => {
  assert.ok(
    validateConversationForm(
      form({ ...consultation, phone: "abc", business_name: " " }),
      "consultation",
    ).phone,
  );
  assert.ok(
    validateConversationForm(
      form({ ...consultation, phone: "abc", business_name: " " }),
      "consultation",
    ).business_name,
  );
  assert.deepEqual(
    validateConversationForm(
      form({ ...consultation, phone: "+44 20 7946 0958" }),
      "consultation",
    ),
    {},
  );
});

test("consultation never promises phone follow-up without permission and a mobile number", () => {
  assert.equal(
    consultationReplyMethod(
      form({ ...consultation, best_contact_method: "text" }),
    ),
    "email",
  );
  assert.equal(
    consultationReplyMethod(
      form({ ...consultation, best_contact_method: "call", sms_consent: "on" }),
    ),
    "call",
  );
  assert.equal(
    consultationReplyMethod(
      form({ ...consultation, best_contact_method: "text", sms_consent: "on" }),
    ),
    "text",
  );
  assert.equal(
    consultationReplyMethod(
      form({
        ...consultation,
        phone: "",
        best_contact_method: "text",
        sms_consent: "on",
      }),
    ),
    "email",
  );
  assert.deepEqual(
    validateConversationForm(
      form({ ...consultation, phone: "" }),
      "consultation",
    ),
    {},
  );
  assert.ok(
    validateConversationForm(
      form({ ...consultation, phone: "", sms_consent: "on" }),
      "consultation",
    ).phone,
  );
});
test("a local seven-digit number or misplaced plus cannot enter the phone follow-up path", () => {
  for (const phone of ["555-0100", "++19035550100", "903+5550100"]) {
    assert.ok(
      validateConversationForm(form({ ...consultation, phone }), "consultation")
        .phone,
      phone,
    );
  }
});
