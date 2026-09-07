import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leadMessageAuthor,
  leadMessageEmail,
} from "../lib/leadMessageAuthor.ts";

test("Pat's message uses Pat in the sender, signature, subject and audit while keeping the verified brand mailbox", () => {
  const author = leadMessageAuthor("Patrick Grabbs", "pat@example.test");
  const email = leadMessageEmail(
    "lead@example.test",
    "Jamie Example",
    "Here is the next step.",
    author,
  );
  assert.equal(author.auditName, "Patrick Grabbs");
  assert.equal(
    email.from,
    "Patrick Grabbs via The LeadFlow Pro <ryan@theleadflowpro.com>",
  );
  assert.equal(email.reply_to, "ryan@theleadflowpro.com");
  assert.match(email.subject, /Patrick Grabbs/);
  assert.match(email.html, /Patrick Grabbs/);
  assert.match(email.text, /Patrick Grabbs/);
  assert.doesNotMatch(
    email.subject + email.html + email.text,
    /Ryan Nichols|Message from Ryan/,
  );
});

test("Ryan keeps his own attribution and message content is escaped without accepting recipient HTML", () => {
  const email = leadMessageEmail(
    "lead@example.test",
    "<img> Example",
    '<script>alert("x")</script>\nNext step',
    leadMessageAuthor("Ryan Nichols", "ryan@example.test"),
  );
  assert.match(email.subject, /Ryan Nichols/);
  assert.match(email.html, /&lt;img&gt;/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.doesNotMatch(email.html, /<script>|<img>/);
  assert.match(email.html, /<br>Next step/);
});

test("a missing profile name never labels another signed-in staff member as Ryan", () => {
  const author = leadMessageAuthor("  ", "staff@example.test");
  assert.equal(author.displayName, "The LeadFlow Pro team");
  assert.equal(author.auditName, "staff@example.test");
  assert.doesNotMatch(author.subject, /Ryan/);
});

test("profile formatting cannot change the verified sender address or introduce mail headers", () => {
  const author = leadMessageAuthor(
    'Pat\r\nBcc: anyone@example.test <spoof@example.test> "Name"',
    "pat@example.test",
  );
  assert.doesNotMatch(author.from, /[\r\n"]/);
  assert.equal((author.from.match(/</g) || []).length, 1);
  assert.match(author.from, /<ryan@theleadflowpro\.com>$/);
  assert.equal(author.replyTo, "ryan@theleadflowpro.com");
});
